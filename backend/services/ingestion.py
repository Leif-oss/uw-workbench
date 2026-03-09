"""
Document ingestion service for draft submissions.
Handles email parsing, attachment extraction, text extraction, OCR, and vision transcription.
"""
import io
import os
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime

# Optional imports for document processing
try:
    import pdfplumber
    import docx
    import pandas as pd
    from openai import OpenAI
    PROCESSING_AVAILABLE = True
except ImportError:
    PROCESSING_AVAILABLE = False

# Environment variables
MAX_PAGES = int(os.getenv("MAX_PAGES", "50"))  # Max PDF pages to process via OCR
TEXT_THRESHOLD = int(os.getenv("TEXT_THRESHOLD", "100"))  # Min chars to consider PDF as text-based
MODEL_TEXT = os.getenv("MODEL_TEXT", "gpt-5-mini")  # Model for text extraction
MODEL_VISION = os.getenv("MODEL_VISION", "gpt-5.2")  # Model for vision/OCR (fallback to gpt-5 if 5.2 unavailable)
AI_API_KEY = os.getenv("AI_API_KEY", "")


def calculate_file_hash(file_bytes: bytes) -> str:
    """Calculate SHA-256 hash of file bytes."""
    return hashlib.sha256(file_bytes).hexdigest()


def extract_text_from_pdf(file_bytes: bytes, max_pages: Optional[int] = None) -> Tuple[str, int, bool]:
    """
    Extract text from PDF.
    Returns: (extracted_text, page_count, needs_ocr)
    If text extraction yields too little text, returns True for needs_ocr.
    """
    if not PROCESSING_AVAILABLE:
        raise ValueError("PDF processing not available")
    
    text_chunks = []
    page_count = 0
    max_pages = max_pages or MAX_PAGES
    
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            page_count = len(pdf.pages)
            
            for i, page in enumerate(pdf.pages[:max_pages]):
                page_text = page.extract_text() or ""
                text_chunks.append(page_text)
        
        full_text = "\n".join(text_chunks)
        
        # Determine if OCR is needed (too little text extracted)
        needs_ocr = len(full_text.strip()) < TEXT_THRESHOLD
        
        return full_text, page_count, needs_ocr
    except Exception as e:
        raise ValueError(f"PDF extraction error: {str(e)}")


def extract_text_from_excel(file_bytes: bytes) -> str:
    """Extract text from Excel files."""
    if not PROCESSING_AVAILABLE:
        raise ValueError("Excel processing not available")
    
    try:
        xl = pd.ExcelFile(io.BytesIO(file_bytes))
        text_chunks = []
        for sheet in xl.sheet_names:
            df = xl.parse(sheet)
            # Add sheet name as header
            text_chunks.append(f"[Sheet: {sheet}]")
            # Convert to text rows
            as_text = df.astype(str)
            for _, row in as_text.iterrows():
                text_chunks.append(" | ".join(row.tolist()))
        return "\n".join(text_chunks)
    except Exception as e:
        raise ValueError(f"Excel extraction error: {str(e)}")


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX files."""
    if not PROCESSING_AVAILABLE:
        raise ValueError("DOCX processing not available")
    
    try:
        document = docx.Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in document.paragraphs)
    except Exception as e:
        raise ValueError(f"DOCX extraction error: {str(e)}")


def transcribe_image_with_vision(image_bytes: bytes, filename: str, api_key: str) -> str:
    """
    Use OpenAI Vision API to transcribe text from an image.
    Returns extracted text from the image.
    """
    if not PROCESSING_AVAILABLE or not api_key:
        raise ValueError("Vision transcription not available")
    
    if not api_key.startswith("sk-") or len(api_key) < 20:
        raise ValueError("Invalid OpenAI API key for vision transcription")
    
    try:
        client = OpenAI(api_key=api_key)
        
        # Prepare image for API (base64 encode)
        import base64
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Determine MIME type from filename
        mime_type = "image/png"
        filename_lower = filename.lower()
        if filename_lower.endswith('.jpg') or filename_lower.endswith('.jpeg'):
            mime_type = "image/jpeg"
        elif filename_lower.endswith('.gif'):
            mime_type = "image/gif"
        elif filename_lower.endswith('.webp'):
            mime_type = "image/webp"
        
        response = client.chat.completions.create(
            model=MODEL_VISION,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract all text from this image. Preserve formatting, line breaks, and structure. Return the full text content."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{image_base64}",
                            }
                        }
                    ]
                }
            ],
            max_tokens=4096,
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        raise ValueError(f"Vision transcription error: {str(e)}")


def extract_text_from_file(filename: str, file_bytes: bytes, api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Route to appropriate extraction method based on file type.
    Returns: {
        "text": extracted_text,
        "page_count": page_count (for PDFs),
        "extraction_method": "text" | "ocr" | "vision" | "excel" | "docx",
        "needs_ocr": bool (for PDFs that need OCR)
    }
    """
    filename_lower = filename.lower()
    
    if filename_lower.endswith('.pdf'):
        text, page_count, needs_ocr = extract_text_from_pdf(file_bytes)
        
        result = {
            "text": text,
            "page_count": page_count,
            "extraction_method": "text",
            "needs_ocr": needs_ocr,
        }
        
        # If PDF needs OCR and we have API key, process first few pages
        if needs_ocr and api_key and page_count > 0:
            try:
                # For now, skip OCR for PDFs (would need PDF to image conversion)
                # In production, you'd convert PDF pages to images and transcribe each
                result["extraction_method"] = "pdf_text_fallback"
                result["note"] = f"PDF appears to be scanned (extracted {len(text)} chars). OCR not yet implemented for multi-page PDFs."
            except Exception as e:
                result["note"] = f"OCR failed: {str(e)}"
        
        return result
    
    elif filename_lower.endswith(('.xlsx', '.xls')):
        return {
            "text": extract_text_from_excel(file_bytes),
            "page_count": None,
            "extraction_method": "excel",
            "needs_ocr": False,
        }
    
    elif filename_lower.endswith('.docx'):
        return {
            "text": extract_text_from_docx(file_bytes),
            "page_count": None,
            "extraction_method": "docx",
            "needs_ocr": False,
        }
    
    elif filename_lower.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
        # Image file - use vision API
        if not api_key:
            raise ValueError("Vision API key required for image transcription")
        
        transcribed_text = transcribe_image_with_vision(file_bytes, filename, api_key)
        return {
            "text": transcribed_text,
            "page_count": 1,
            "extraction_method": "vision",
            "needs_ocr": False,
        }
    
    elif filename_lower.endswith('.txt') or filename_lower.endswith('.eml') or filename_lower.endswith('.msg'):
        # Text or email file
        try:
            text = file_bytes.decode('utf-8', errors='ignore')
            return {
                "text": text,
                "page_count": None,
                "extraction_method": "text",
                "needs_ocr": False,
            }
        except Exception:
            raise ValueError("Failed to decode text file")
    
    else:
        # Try to decode as text
        try:
            text = file_bytes.decode('utf-8', errors='ignore')
            return {
                "text": text,
                "page_count": None,
                "extraction_method": "text",
                "needs_ocr": False,
            }
        except Exception:
            raise ValueError(f"Unsupported file type: {filename}")


def parse_email_body(email_text: str) -> Dict[str, Any]:
    """
    Parse email text to extract body and basic metadata.
    For now, simple parsing - can be enhanced with email library later.
    """
    # Simple email parsing (basic implementation)
    # In production, use email library for proper parsing
    
    lines = email_text.split('\n')
    body_start = 0
    subject = None
    
    # Look for common email headers
    for i, line in enumerate(lines):
        if line.lower().startswith('subject:'):
            subject = line[8:].strip()
        elif line.lower().startswith('from:'):
            # Headers section ends
            body_start = i + 1
            break
    
    # Body is everything after headers (or everything if no headers)
    body_text = '\n'.join(lines[body_start:]).strip()
    
    return {
        "subject": subject,
        "body": body_text,
        "raw": email_text,
    }
