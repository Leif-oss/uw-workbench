import io
import json
import re
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_
from dotenv import load_dotenv
from pathlib import Path

from .. import models, schemas, crud
from ..database import get_db

# Load environment variables from private folder (outside Git tracking)
env_path = Path(__file__).parent.parent.parent / 'private' / '.env'
load_dotenv(dotenv_path=env_path)

AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "gpt-4o")  # Use same model as AI Assistant

# Log configuration on module load
print(f"[Document Scrubber] Loaded configuration:")
print(f"[Document Scrubber] AI_API_KEY present: {'Yes' if AI_API_KEY else 'No'}")
print(f"[Document Scrubber] AI_MODEL: {AI_MODEL}")

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

def extract_with_llm(full_text: str, api_key: str, model: str = None) -> Dict[str, Any]:
    """Use OpenAI to extract structured fields from document text."""
    if not PROCESSING_AVAILABLE:
        return {}
    
    if not api_key or not full_text:
        return {}
    
    # Use model from environment or fallback
    if model is None:
        model = AI_MODEL
    
    client = OpenAI(api_key=api_key)
    
    # Limit text to avoid token overrun (increased for better model)
    truncated = full_text[:20000]
    
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
        "You are an expert commercial property insurance underwriting assistant with 20+ years of experience reviewing submissions.\n\n"
        
        "YOUR TASK: Extract ALL relevant underwriting data from the provided document. Be thorough and aggressive in finding information.\n\n"
        
        "CRITICAL FIELDS TO EXTRACT:\n\n"
        
        "**DATES & POLICY INFO:**\n"
        "- effective_date: Policy start date (MM/DD/YYYY)\n"
        "- expiration_date: Policy end date (MM/DD/YYYY)\n"
        "- Look for: 'Effective', 'Policy Period', 'Coverage Dates', 'Bind Date', 'Inception Date'\n\n"
        
        "**PRODUCER/AGENCY:**\n"
        "- producer_name: Insurance agency/broker name submitting this (NOT the insured)\n"
        "- producer_code: Agency code (usually 6 digits like '010233')\n"
        "- Look for: 'Producer', 'Agent', 'Broker', 'Submitted by', 'Agency', letterheads, email signatures\n\n"
        
        "**INSURED/NAMED INSURED:**\n"
        "- insured_name: The business/entity being insured (the customer)\n"
        "- additional_insured_names: Any additional insured parties listed\n"
        "- Look for: 'Named Insured', 'Insured', 'Applicant', 'Customer', 'Business Name', 'Entity Name'\n\n"
        
        "**CONTACT INFORMATION:**\n"
        "- contact_name: Primary contact person (producer contact or insured contact)\n"
        "- contact_phone: Phone number (format: 10 digits or formatted)\n"
        "- contact_email: Email address\n"
        "- mailing_address: Mailing address if different from property location\n"
        "- Look for: 'Contact', 'Submitted by', email signatures, phone numbers in headers/footers\n\n"
        
        "**PROPERTY LOCATION (CRITICAL):**\n"
        "- location_street_number: Street number ONLY (e.g., '123' or '123-125')\n"
        "- location_street_name: Street name and type (e.g., 'Main Street' or 'Oak Avenue')\n"
        "- location_suite: Suite/Unit number if applicable (e.g., 'Suite 200', '#5')\n"
        "- location_city: City name\n"
        "- location_state: State (2-letter code preferred: CA, NY, TX, etc.)\n"
        "- location_zip: ZIP code (5 or 9 digits)\n"
        "- Look for: 'Property Address', 'Location', 'Risk Address', 'Building Address', 'Schedule of Locations'\n\n"
        
        "**FINANCIAL/COVERAGE:**\n"
        "- building_limit: Total Insured Value (TIV) for the building (e.g., '2,500,000')\n"
        "- deductible: Policy deductible amount (e.g., '5,000' or '1%')\n"
        "- additional_limits_rents: Business Income / Rental Income limit\n"
        "- additional_limits_ordinance: Ordinance or Law / Increased Cost of Construction\n"
        "- additional_limits_demolition: Demolition Cost coverage\n"
        "- additional_limits_eqsl: Earthquake Sprinkler Leakage or similar\n"
        "- Look for: 'Building Limit', 'TIV', 'Insured Value', 'Coverage A', 'Limits', 'Deductible', 'Business Income', 'Ordinance'\n\n"
        
        "**ADDITIONAL PARTIES:**\n"
        "- additional_insured: Additional insured parties (separate from named insured)\n"
        "- mortgagee: Mortgage holder / lender information\n"
        "- loss_payee: Loss payee if different from mortgagee\n"
        "- Look for: 'Additional Insured', 'Mortgagee', 'Loss Payee', 'Lender', 'Bank', 'Lienholder'\n\n"
        
        "**BUILDING CHARACTERISTICS:**\n"
        "- construction_type: Frame, Joisted Masonry, Non-Combustible, Masonry Non-Combustible, Modified Fire Resistive, Fire Resistive\n"
        "- construction_year: Year built (4 digits: e.g., '1985', '2020')\n"
        "- square_feet: Building square footage (e.g., '10,000')\n"
        "- sprinkler_percent: Percentage of building with sprinklers (e.g., '100%', '0%', '50%')\n"
        "- protection_class: ISO Protection Class / Fire District (e.g., '3', 'Class 4', 'ISO 2')\n"
        "- Look for: 'Construction', 'Year Built', 'Square Feet', 'SF', 'SqFt', 'Sprinkler', 'Protection Class', 'ISO', 'Fire District'\n\n"
        
        "**BUSINESS/OCCUPANCY:**\n"
        "- line_of_business: Type of business or occupancy (e.g., 'Office Building', 'Retail', 'Restaurant', 'Manufacturing')\n"
        "- Look for: 'Occupancy', 'Business Type', 'Operations', 'Use', 'Classification', 'Industry'\n\n"
        
        "**NOTES:**\n"
        "- notes: Any important underwriting notes, special conditions, loss history, hazards, or relevant comments\n"
        "- Look for: 'Notes', 'Comments', 'Loss History', 'Special Conditions', 'Underwriting Notes', 'Remarks'\n\n"
        
        "**EXTRACTION RULES:**\n"
        "1. Be aggressive - extract data even if field names don't match exactly\n"
        "2. Look in headers, footers, email signatures, and margins\n"
        "3. For monetary values: use commas, no dollar signs (e.g., '1,000,000' not '$1000000')\n"
        "4. For dates: use MM/DD/YYYY format (e.g., '01/15/2025')\n"
        "5. For addresses: split street number from street name carefully\n"
        "6. If multiple values exist for a field, use the most prominent/recent one\n"
        "7. Use empty string \"\" ONLY if field truly cannot be found\n"
        "8. Return ONLY valid JSON with exactly the requested keys\n"
        "9. DO NOT add extra keys or explanations\n\n"
        
        "**OUTPUT FORMAT:**\n"
        "Return a JSON object with EXACTLY these keys (even if empty):\n"
        f"{', '.join(schema_fields)}"
    )
    
    user = (
        "Extract all underwriting data from this submission document. "
        "Be thorough and look carefully for every field. "
        "Return JSON with exactly the keys specified.\n\n"
        "DOCUMENT TEXT:\n\n" + truncated
    )
    
    try:
        print(f"[AI Extraction] Calling OpenAI with model: {model}")
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0,
        )
        content = resp.choices[0].message.content or ""
        print(f"[AI Extraction] Received response, length: {len(content)} chars")
        
        # Parse JSON (handle code fences)
        content = content.strip()
        if content.startswith("```"):
            content = content.strip("`")
            if content.lower().startswith("json"):
                content = content[4:]
        
        print(f"[AI Extraction] Parsing JSON...")
        data = json.loads(content)
        if isinstance(data, dict):
            result = {k: data.get(k, "") for k in schema_fields}
            non_empty = {k: v for k, v in result.items() if v}
            print(f"[AI Extraction] Successfully extracted {len(non_empty)} non-empty fields")
            return result
        else:
            print(f"[AI Extraction] ERROR: Response was not a dict, got {type(data)}")
            return {}
    except json.JSONDecodeError as e:
        print(f"[AI Extraction] JSON parsing error: {e}")
        print(f"[AI Extraction] Content was: {content[:500]}")
        return {}
    except Exception as e:
        print(f"[AI Extraction] Error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
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
    db: Session = Depends(get_db)
):
    """
    Upload a document (PDF, DOCX, Excel, etc.) and extract data using AI.
    Returns extracted fields and suggested agency/contact matches.
    Uses AI_API_KEY from backend environment variables.
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
    
    # Debug logging to file
    import datetime
    debug_log = f"[{datetime.datetime.now()}] Upload endpoint called\n"
    debug_log += f"AI_API_KEY present: {bool(AI_API_KEY)}\n"
    debug_log += f"AI_MODEL: {AI_MODEL}\n"
    debug_log += f"Extracted text length: {len(extracted_text)} chars\n"
    
    if AI_API_KEY:
        debug_log += "Calling AI extraction...\n"
        try:
            extracted_fields = extract_with_llm(extracted_text, AI_API_KEY)
            debug_log += f"AI returned {len(extracted_fields)} fields\n"
            non_empty = {k: v for k, v in extracted_fields.items() if v}
            debug_log += f"Non-empty fields: {len(non_empty)}\n"
            debug_log += f"Field keys: {list(non_empty.keys())}\n"
        except Exception as e:
            debug_log += f"ERROR in AI extraction: {type(e).__name__}: {str(e)}\n"
            import traceback
            debug_log += traceback.format_exc()
    else:
        debug_log += "WARNING: AI_API_KEY not found!\n"
    
    # Write to debug file
    with open("debug_extraction.log", "a") as f:
        f.write(debug_log + "\n" + "="*80 + "\n")
    
    # Search for matching agencies
    producer_name = extracted_fields.get("producer_name")
    producer_code = extracted_fields.get("producer_code")
    agency_matches = search_agencies(producer_name, producer_code, db)
    
    # Prepare response
    non_empty_fields = {k: v for k, v in extracted_fields.items() if v}
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
        "file_type": file.content_type,
        "debug_info": {
            "ai_key_present": bool(AI_API_KEY),
            "ai_model": AI_MODEL,
            "total_fields": len(extracted_fields),
            "non_empty_fields": len(non_empty_fields),
            "non_empty_keys": list(non_empty_fields.keys())
        }
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

