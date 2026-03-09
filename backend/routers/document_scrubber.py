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

# Load environment variables - check multiple locations
# Try backend/.env first (standard location), then private/.env
env_paths = [
    Path(__file__).parent.parent / '.env',  # backend/.env
    Path(__file__).parent.parent.parent / 'private' / '.env',  # private/.env (legacy)
]

for env_path in env_paths:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=False)  # Don't override if already set

# Also try loading from environment (for production)
load_dotenv(override=False)

AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "gpt-5-mini")  # Use same model as AI Assistant - GPT-5 required

# Check if API key looks like a placeholder
is_placeholder = (
    not AI_API_KEY or
    AI_API_KEY == "your-api-key-here" or
    "your-api" in AI_API_KEY.lower() or
    len(AI_API_KEY) < 20 or
    not AI_API_KEY.startswith("sk-")
)

# Log configuration on module load
print(f"[Document Scrubber] Loaded configuration:")
print(f"[Document Scrubber] AI_API_KEY present: {'Yes' if AI_API_KEY else 'No'}")
if is_placeholder and AI_API_KEY:
    print(f"[Document Scrubber] ⚠️  WARNING: AI_API_KEY appears to be a placeholder value!")
    print(f"[Document Scrubber] ⚠️  Please set a valid OpenAI API key in backend/.env")
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
    # Log file for debugging - use absolute path from project root
    project_root = Path(__file__).parent.parent.parent
    log_file = project_root / "debug_extraction.log"
    
    def log_debug(msg: str):
        """Write debug message to both console and log file."""
        try:
            print(f"[AI Extraction] {msg}")
        except:
            pass
        try:
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(f"[AI Extraction] {msg}\n")
                f.flush()  # Force write to disk
        except Exception as e:
            try:
                print(f"[AI Extraction] Failed to write log: {e}")
            except:
                pass
    
    # CRITICAL: Log immediately at function start - this must appear in logs
    try:
        log_debug("="*60)
        log_debug("=== Starting extract_with_llm function ===")
        log_debug(f"Parameters: full_text length={len(full_text) if full_text else 0}, api_key present={bool(api_key)}, model={model}")
        log_debug(f"PROCESSING_AVAILABLE: {PROCESSING_AVAILABLE}")
    except Exception as log_err:
        # Even if logging fails, try to write directly
        try:
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(f"[AI Extraction] Logging failed: {log_err}\n")
        except:
            pass
    
    if not PROCESSING_AVAILABLE:
        log_debug("ERROR: Processing libraries not available")
        return {}
    
    if not api_key:
        log_debug(f"ERROR: api_key is missing or empty")
        return {}
    
    # Check if API key looks like a placeholder
    is_placeholder_key = (
        api_key == "your-api-key-here" or
        "your-api" in api_key.lower() or
        len(api_key) < 20 or
        not api_key.startswith("sk-")
    )
    
    if is_placeholder_key:
        log_debug(f"ERROR: api_key appears to be a placeholder or invalid (length: {len(api_key)}, starts with sk-: {api_key.startswith('sk-') if api_key else False})")
        log_debug(f"ERROR: Please set a valid OpenAI API key in backend/.env file")
        return {}
    
    if not full_text:
        log_debug(f"ERROR: full_text is missing or empty")
        return {}
    
    # Use model from environment or fallback
    if model is None:
        model = AI_MODEL
    
    log_debug(f"Starting extraction with model: {model}, text length: {len(full_text)}")
    
    try:
        client = OpenAI(api_key=api_key)
        log_debug("OpenAI client created successfully")
    except Exception as e:
        log_debug(f"ERROR creating OpenAI client: {type(e).__name__}: {str(e)}")
        return {}
    
    # Limit text to avoid token overrun (increased for better model)
    truncated = full_text[:20000]
    log_debug(f"Text truncated to {len(truncated)} chars (original: {len(full_text)} chars)")
    log_debug(f"First 500 chars of text being sent: {truncated[:500]}")
    
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
        "You MUST return a valid JSON object with EXACTLY these keys (even if empty - use empty string \"\"):\n"
        f"{', '.join(schema_fields)}\n\n"
        "Return ONLY the JSON object, no other text, no markdown, no code fences, no explanations.\n"
        "The JSON must be parseable and valid. Example format:\n"
        '{"effective_date": "01/15/2025", "expiration_date": "", "producer_name": "ABC Insurance", ...}'
    )
    
    user = (
        "Extract all underwriting data from this submission document. "
        "Be thorough and look carefully for every field. "
        "Return ONLY a valid JSON object with exactly the keys specified in the system prompt.\n"
        "Do not include any markdown, code fences, or explanations - just the raw JSON object.\n\n"
        "DOCUMENT TEXT:\n\n" + truncated
    )
    
    try:
        # Try GPT-5 first, fallback to GPT-4o if not available
        fallback_model = "gpt-4o"
        try:
            available_models = client.models.list()
            model_names = [m.id for m in available_models.data]
            
            if model.startswith("gpt-5") and model not in model_names:
                if fallback_model in model_names:
                    log_debug(f"GPT-5 model '{model}' is not available, falling back to '{fallback_model}'")
                    model = fallback_model
                else:
                    raise ValueError(f"Requested model '{model}' and fallback '{fallback_model}' are not available")
        except Exception as validation_error:
            # If validation fails, try fallback if original is GPT-5
            if model.startswith("gpt-5"):
                log_debug(f"Model validation failed, attempting fallback to '{fallback_model}'")
                model = fallback_model
        
        log_debug(f"Calling OpenAI API with model: {model}")
        log_debug(f"Truncated text length: {len(truncated)} chars")
        
        # Build request parameters - exclude certain params for GPT-5 models
        request_params = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "response_format": {"type": "json_object"},
        }
        
        # GPT-5 models don't support temperature, top_p, frequency_penalty, presence_penalty
        if not model.startswith("gpt-5"):
            request_params["temperature"] = 0
        
        # Use response_format to ensure JSON output
        resp = client.chat.completions.create(**request_params)
        
        content = resp.choices[0].message.content or ""
        log_debug(f"Received response, length: {len(content)} chars")
        log_debug(f"First 500 chars: {content[:500]}")
        
        # Parse JSON (should be clean JSON due to response_format, but handle edge cases)
        content = content.strip()
        if content.startswith("```"):
            # Remove code fence markers if present (shouldn't be with response_format, but just in case)
            lines = content.split("\n")
            content = "\n".join(lines[1:-1]) if len(lines) > 2 else content
            if content.strip().startswith("json"):
                content = content.strip()[4:].strip()
        
        log_debug(f"Parsing JSON...")
        data = json.loads(content)
        if isinstance(data, dict):
            result = {k: data.get(k, "") for k in schema_fields}
            non_empty = {k: v for k, v in result.items() if v}
            log_debug(f"Successfully extracted {len(non_empty)} non-empty fields")
            log_debug(f"Fields found: {list(non_empty.keys())}")
            if non_empty:
                log_debug(f"Sample values: {dict(list(non_empty.items())[:3])}")
            return result
        else:
            log_debug(f"ERROR: Response was not a dict, got {type(data)}")
            return {}
    except json.JSONDecodeError as e:
        log_debug(f"JSON parsing error: {e}")
        log_debug(f"Content was: {content[:1000]}")
        import traceback
        log_debug(f"Traceback: {traceback.format_exc()}")
        return {}
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        log_debug(f"Error: {error_type}: {error_msg}")
        
        # Check for authentication errors specifically
        if "401" in error_msg or "AuthenticationError" in error_type or "invalid_api_key" in error_msg:
            log_debug(f"⚠️  AUTHENTICATION ERROR: Invalid OpenAI API key!")
            log_debug(f"⚠️  Please check your AI_API_KEY in backend/.env file")
            log_debug(f"⚠️  The API key should start with 'sk-' and be at least 20 characters long")
            log_debug(f"⚠️  Get your API key from: https://platform.openai.com/account/api-keys")
        
        import traceback
        log_debug(f"Traceback: {traceback.format_exc()}")
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
        # Log a sample of extracted text to verify file content
        import datetime
        debug_log_preview = f"[{datetime.datetime.now()}] Text extraction successful\n"
        debug_log_preview += f"File: {file.filename}, Size: {len(file_bytes)} bytes\n"
        debug_log_preview += f"Extracted text length: {len(extracted_text)} chars\n"
        debug_log_preview += f"First 1000 chars: {extracted_text[:1000]}\n"
        with open("debug_extraction.log", "a", encoding="utf-8") as f:
            f.write(debug_log_preview + "="*80 + "\n")
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
    
    # Check if API key is valid (not a placeholder)
    is_valid_key = (
        AI_API_KEY and
        len(AI_API_KEY) >= 20 and
        AI_API_KEY.startswith("sk-") and
        "your-api" not in AI_API_KEY.lower()
    )
    
    if AI_API_KEY and not is_valid_key:
        debug_log += f"⚠️  WARNING: AI_API_KEY appears to be invalid or placeholder!\n"
        debug_log += f"⚠️  Key length: {len(AI_API_KEY) if AI_API_KEY else 0}, starts with 'sk-': {AI_API_KEY.startswith('sk-') if AI_API_KEY else False}\n"
        debug_log += f"⚠️  Please set a valid OpenAI API key in backend/.env\n"
        debug_log += f"⚠️  Get your API key from: https://platform.openai.com/account/api-keys\n"
    
    if AI_API_KEY and is_valid_key:
        debug_log += "Calling AI extraction...\n"
        debug_log += f"extracted_text length: {len(extracted_text)}, first 200 chars: {extracted_text[:200]}\n"
        debug_log += f"PROCESSING_AVAILABLE: {PROCESSING_AVAILABLE}\n"
        debug_log += f"AI_API_KEY type: {type(AI_API_KEY)}, length: {len(AI_API_KEY) if AI_API_KEY else 0}\n"
        try:
            debug_log += "About to call extract_with_llm...\n"
            
            # Wrap in try-except to catch any exceptions from extract_with_llm
            try:
                extracted_fields = extract_with_llm(extracted_text, AI_API_KEY)
                debug_log += f"extract_with_llm completed, returned {len(extracted_fields)} fields\n"
            except Exception as inner_e:
                debug_log += f"EXCEPTION inside extract_with_llm: {type(inner_e).__name__}: {str(inner_e)}\n"
                import traceback
                debug_log += f"Traceback:\n{traceback.format_exc()}\n"
                extracted_fields = {}
            
            debug_log += f"extract_with_llm returned {len(extracted_fields)} fields\n"
            debug_log += f"extracted_fields type: {type(extracted_fields)}, keys: {list(extracted_fields.keys())[:5] if extracted_fields else 'empty'}\n"
            non_empty = {k: v for k, v in extracted_fields.items() if v}
            debug_log += f"Non-empty fields: {len(non_empty)}\n"
            debug_log += f"Field keys: {list(non_empty.keys())}\n"
            if extracted_fields:
                # Show first few non-empty fields as sample
                sample = {k: str(v)[:50] for k, v in list(extracted_fields.items())[:5] if v}
                debug_log += f"Sample extracted data: {sample}\n"
        except Exception as e:
            debug_log += f"ERROR in AI extraction: {type(e).__name__}: {str(e)}\n"
            import traceback
            debug_log += traceback.format_exc()
    elif not AI_API_KEY:
        debug_log += "WARNING: AI_API_KEY not found!\n"
        debug_log += "Please set AI_API_KEY in backend/.env file\n"
        debug_log += "Get your API key from: https://platform.openai.com/account/api-keys\n"
    
    # Write to debug file
    with open("debug_extraction.log", "a", encoding="utf-8") as f:
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
            "ai_key_valid": bool(AI_API_KEY and len(AI_API_KEY) >= 20 and AI_API_KEY.startswith("sk-") and "your-api" not in AI_API_KEY.lower()),
            "ai_model": AI_MODEL,
            "total_fields": len(extracted_fields),
            "non_empty_fields": len(non_empty_fields),
            "non_empty_keys": list(non_empty_fields.keys()),
            "error_message": "Invalid or missing OpenAI API key. Please set AI_API_KEY in backend/.env file." if not extracted_fields and (not AI_API_KEY or len(AI_API_KEY) < 20 or not AI_API_KEY.startswith("sk-")) else None
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

