import io
import json
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_

from .. import models, schemas, crud
from ..database import get_db

# Optional imports for document processing
try:
    import pdfplumber
    import docx
    import pandas as pd
    from openai import OpenAI
    PROCESSING_AVAILABLE = True
except ImportError:
    PROCESSING_AVAILABLE = False

router = APIRouter(prefix="/submissions", tags=["submissions"])


# ========== Document Text Extraction ==========

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF using pdfplumber."""
    if not PROCESSING_AVAILABLE:
        raise HTTPException(status_code=500, detail="PDF processing not available")
    
    text_chunks = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text_chunks.append(page_text)
    return "\n".join(text_chunks)


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX using python-docx."""
    if not PROCESSING_AVAILABLE:
        raise HTTPException(status_code=500, detail="DOCX processing not available")
    
    document = docx.Document(io.BytesIO(file_bytes))
    return "\n".join(p.text for p in document.paragraphs)


def extract_text_from_excel(file_bytes: bytes) -> str:
    """Extract text from Excel using pandas."""
    if not PROCESSING_AVAILABLE:
        raise HTTPException(status_code=500, detail="Excel processing not available")
    
    xl = pd.ExcelFile(io.BytesIO(file_bytes))
    text_chunks = []
    for sheet in xl.sheet_names:
        df = xl.parse(sheet)
        as_text = df.astype(str)
        for _, row in as_text.iterrows():
            text_chunks.append(" | ".join(row.tolist()))
    return "\n".join(text_chunks)


def extract_text_from_file(filename: str, file_bytes: bytes) -> str:
    """Route to appropriate extraction method based on file type."""
    filename_lower = filename.lower()
    
    if filename_lower.endswith('.pdf'):
        return extract_text_from_pdf(file_bytes)
    elif filename_lower.endswith('.docx'):
        return extract_text_from_docx(file_bytes)
    elif filename_lower.endswith(('.xlsx', '.xls')):
        return extract_text_from_excel(file_bytes)
    elif filename_lower.endswith('.txt'):
        return file_bytes.decode('utf-8', errors='ignore')
    else:
        # Try to decode as text
        try:
            return file_bytes.decode('utf-8', errors='ignore')
        except Exception:
            raise HTTPException(status_code=400, detail="Unsupported file type")


# ========== AI Extraction with OpenAI ==========

def extract_with_llm(full_text: str, api_key: str, model: str = "gpt-4o-mini") -> Dict[str, Any]:
    """Use OpenAI to extract structured fields from document text."""
    if not PROCESSING_AVAILABLE:
        return {}
    
    if not api_key or not full_text:
        return {}
    
    client = OpenAI(api_key=api_key)
    
    # Limit text to avoid token overrun (12k characters ~ 3k tokens)
    truncated = full_text[:12000]
    
    schema_fields = [
        "effective_date", "expiration_date",
        "producer_name", "producer_code",
        "insured_name", "additional_insured_names",
        "contact_name", "contact_phone", "contact_email",
        "mailing_address",
        "location_street_number", "location_street_name", "location_suite",
        "location_city", "location_state", "location_zip",
        "building_limit", "deductible",
        "additional_limits_rents", "additional_limits_ordinance",
        "additional_limits_demolition", "additional_limits_eqsl",
        "additional_insured", "mortgagee", "loss_payee",
        "construction_type", "construction_year", "square_feet",
        "sprinkler_percent", "protection_class",
        "line_of_business", "notes"
    ]
    
    system = (
        "You are an underwriting intake assistant. "
        "Extract the requested fields from the provided text. "
        "Return JSON ONLY with the listed keys. "
        "Use empty string for unknown fields. Do not add extra keys. "
        "Guidelines: "
        "- Producer name is the insurance agency/broker submitting the quote request. "
        "- Insured name is the business/property owner being insured. "
        "- Contact info (name, phone, email) is for the person submitting or managing the application. "
        "- Location address is the property being insured (split street number from street name). "
        "- Building limit is the TIV (Total Insured Value) for the property. "
        "- Additional limits: Rents = Business Income, Ordinance = Increased Cost of Construction. "
        "- Construction types: Frame, Joisted Masonry, Non-Combustible, Masonry Non-Combustible, Modified Fire Resistive, Fire Resistive. "
        "- Keep all monetary values as strings with commas (e.g., '1,000,000'). "
        "- For dates, prefer MM/DD/YYYY format."
    )
    
    user = (
        f"Extract these fields: {', '.join(schema_fields)}. "
        "Return a JSON object with exactly these keys. "
        "Document text:\n" + truncated
    )
    
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0,
        )
        content = resp.choices[0].message.content or ""
        
        # Parse JSON (handle code fences)
        content = content.strip()
        if content.startswith("```"):
            content = content.strip("`")
            if content.lower().startswith("json"):
                content = content[4:]
        
        data = json.loads(content)
        if isinstance(data, dict):
            return {k: data.get(k, "") for k in schema_fields}
    except Exception as e:
        print(f"AI extraction error: {e}")
        return {}
    
    return {}


# ========== Agency & Contact Matching ==========

def search_agencies(
    producer_name: Optional[str],
    producer_code: Optional[str],
    db: Session
) -> List[models.Agency]:
    """Search for agencies that match the producer name or code."""
    if not producer_name and not producer_code:
        return []
    
    filters = []
    if producer_name:
        # Case-insensitive partial match on name or DBA
        search_term = f"%{producer_name}%"
        filters.append(or_(
            models.Agency.name.ilike(search_term),
            models.Agency.dba.ilike(search_term)
        ))
    if producer_code:
        # Exact match on code
        filters.append(models.Agency.code == producer_code.strip())
    
    return db.query(models.Agency).filter(or_(*filters)).limit(10).all()


def search_contacts(
    contact_name: Optional[str],
    contact_email: Optional[str],
    agency_id: Optional[int],
    db: Session
) -> List[models.Contact]:
    """Search for contacts within an agency that match the name or email."""
    if not agency_id:
        return []
    
    query = db.query(models.Contact).filter(models.Contact.agency_id == agency_id)
    
    if contact_name:
        search_term = f"%{contact_name}%"
        query = query.filter(models.Contact.name.ilike(search_term))
    
    if contact_email:
        query = query.filter(models.Contact.email.ilike(f"%{contact_email}%"))
    
    return query.limit(10).all()


# ========== API Endpoints ==========

@router.post("/upload")
async def upload_submission(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload a document (PDF, DOCX, Excel, etc.) and extract data using AI.
    Returns extracted fields and suggested agency/contact matches.
    """
    if not PROCESSING_AVAILABLE:
        raise HTTPException(
            status_code=500, 
            detail="Document processing libraries not installed. Run: pip install -r requirements.txt"
        )
    
    # Read file
    file_bytes = await file.read()
    
    # Extract text
    try:
        extracted_text = extract_text_from_file(file.filename or "unknown", file_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract text: {str(e)}")
    
    # Use AI to extract structured fields
    extracted_fields = {}
    if api_key:
        extracted_fields = extract_with_llm(extracted_text, api_key)
    
    # Search for matching agencies
    producer_name = extracted_fields.get("producer_name")
    producer_code = extracted_fields.get("producer_code")
    agency_matches = search_agencies(producer_name, producer_code, db)
    
    # Prepare response
    return {
        "extracted_text": extracted_text[:2000],  # Preview only
        "extracted_fields": extracted_fields,
        "agency_matches": [
            {
                "id": a.id,
                "name": a.name,
                "code": a.code,
                "dba": a.dba,
                "email": a.email,
                "primary_underwriter": a.primary_underwriter
            }
            for a in agency_matches
        ],
        "original_filename": file.filename,
        "file_type": file.content_type
    }


@router.post("/search-contacts/{agency_id}")
def search_contacts_endpoint(
    agency_id: int,
    contact_name: Optional[str] = None,
    contact_email: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Search for contacts within a specific agency."""
    matches = search_contacts(contact_name, contact_email, agency_id, db)
    
    return {
        "contact_matches": [
            {
                "id": c.id,
                "name": c.name,
                "title": c.title,
                "email": c.email,
                "phone": c.phone,
                "agency_id": c.agency_id
            }
            for c in matches
        ]
    }


@router.post("/", response_model=schemas.Submission)
def create_submission(
    submission: schemas.SubmissionCreate,
    db: Session = Depends(get_db)
):
    """Create a new submission record."""
    db_submission = models.Submission(
        **submission.model_dump(),
        created_at=datetime.utcnow()
    )
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)
    
    return db_submission


@router.get("/", response_model=List[schemas.Submission])
def get_submissions(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all submissions with optional filtering."""
    query = db.query(models.Submission)
    
    if status:
        query = query.filter(models.Submission.status == status)
    
    return query.order_by(models.Submission.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{submission_id}", response_model=schemas.Submission)
def get_submission(submission_id: int, db: Session = Depends(get_db)):
    """Get a specific submission by ID."""
    submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission


@router.put("/{submission_id}", response_model=schemas.Submission)
def update_submission(
    submission_id: int,
    submission: schemas.SubmissionUpdate,
    db: Session = Depends(get_db)
):
    """Update a submission."""
    db_submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not db_submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    for key, value in submission.model_dump(exclude_unset=True).items():
        setattr(db_submission, key, value)
    
    db_submission.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_submission)
    
    return db_submission


@router.delete("/{submission_id}")
def delete_submission(submission_id: int, db: Session = Depends(get_db)):
    """Delete a submission."""
    db_submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not db_submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    db.delete(db_submission)
    db.commit()
    
    return {"message": "Submission deleted"}


@router.get("/{submission_id}/export-csv")
def export_submission_csv(submission_id: int, db: Session = Depends(get_db)):
    """Export a submission as CSV for AS400 or other systems."""
    submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Define column order for export
    columns = [
        "effective_date", "expiration_date", "notes",
        "producer_name", "producer_code",
        "insured_name", "additional_insured_names",
        "mailing_address",
        "contact_name", "contact_phone", "contact_email",
        "location_street_number", "location_street_name", "location_suite",
        "location_city", "location_state", "location_zip",
        "building_limit", "deductible",
        "additional_limits_rents", "additional_limits_ordinance",
        "additional_limits_demolition", "additional_limits_eqsl",
        "additional_insured", "mortgagee", "loss_payee",
        "construction_type", "construction_year", "square_feet",
        "sprinkler_percent", "protection_class",
        "line_of_business"
    ]
    
    # Build CSV
    csv_lines = [",".join(columns)]
    row_values = [str(getattr(submission, col, "")) for col in columns]
    csv_lines.append(",".join(row_values))
    
    csv_content = "\n".join(csv_lines)
    
    return {
        "filename": f"submission_{submission_id}_export.csv",
        "content": csv_content,
        "content_type": "text/csv"
    }

