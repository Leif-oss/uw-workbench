"""
Document ingestion service - STRICT 3-LAYER PIPELINE.
CRITICAL: Layers MUST be separated. Do not collapse.

LAYER 1 — DETECTION (no AI)
LAYER 2 — TRANSCRIPTION (VISION MODEL ONLY)
LAYER 3 — TEXT PROCESSING (TEXT MODEL)
"""
import io
import os
import hashlib
import base64
import logging
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

# Optional imports for document processing
try:
    import pdfplumber
    import docx
    import pandas as pd
    from openai import OpenAI
    PROCESSING_AVAILABLE = True
except ImportError:
    PROCESSING_AVAILABLE = False

# Optional imports for PDF-to-image conversion
try:
    from pdf2image import convert_from_bytes
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    # Fallback: will try to use OpenAI's PDF reading if available

# Environment variables
MAX_PAGES = int(os.getenv("MAX_PAGES", "50"))
TEXT_THRESHOLD = int(os.getenv("TEXT_THRESHOLD", "100"))  # Min non-whitespace chars to consider PDF as text-based
MODEL_TEXT = os.getenv("MODEL_TEXT", "gpt-5-mini")  # Text-based PDF extraction
MODEL_VISION = os.getenv("MODEL_VISION", "gpt-5.2")  # Scanned/vision PDF transcription (fallback to gpt-5 if 5.2 unavailable)
AI_API_KEY = os.getenv("AI_API_KEY", "")


def calculate_file_hash(file_bytes: bytes) -> str:
    """Calculate SHA-256 hash of file bytes."""
    return hashlib.sha256(file_bytes).hexdigest()


# ========== LAYER 1: DETECTION (NO AI) ==========

def detect_file_type(filename: str, file_bytes: bytes) -> Dict[str, Any]:
    """
    LAYER 1: Detect file type and determine if it contains extractable text.
    NO AI - Pure detection logic only.
    
    Returns:
    {
        "file_type": "pdf" | "image" | "excel" | "docx" | "text",
        "has_text": bool,
        "needs_transcription": bool,  # True if image-based (needs Layer 2)
        "page_count": int | None,
        "extracted_text": str,  # Only for native text files
    }
    """
    filename_lower = filename.lower()
    
    if filename_lower.endswith('.pdf'):
        # PDF: attempt text extraction from first 1-2 pages
        if not PROCESSING_AVAILABLE:
            return {
                "file_type": "pdf",
                "has_text": False,
                "needs_transcription": True,  # Assume needs transcription if can't check
                "page_count": None,
                "extracted_text": "",
            }
        
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                page_count = len(pdf.pages)
                # Extract text from first 1-2 pages only
                text_chunks = []
                for i, page in enumerate(pdf.pages[:2]):  # First 2 pages only
                    page_text = page.extract_text() or ""
                    text_chunks.append(page_text)
                
                combined_text = "\n".join(text_chunks)
                # Count non-whitespace characters
                non_whitespace_chars = len(''.join(combined_text.split()))
                
                # If non-whitespace text < TEXT_THRESHOLD, treat as scanned/image PDF
                has_text = non_whitespace_chars >= TEXT_THRESHOLD
                needs_transcription = not has_text
                
                return {
                    "file_type": "pdf",
                    "has_text": has_text,
                    "needs_transcription": needs_transcription,
                    "page_count": page_count,
                    "extracted_text": combined_text if has_text else "",
                }
        except Exception as e:
            # If PDF extraction fails, assume it needs transcription
            return {
                "file_type": "pdf",
                "has_text": False,
                "needs_transcription": True,
                "page_count": None,
                "extracted_text": "",
                "error": str(e),
            }
    
    elif filename_lower.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
        # Images: always need transcription (Layer 2)
        return {
            "file_type": "image",
            "has_text": False,
            "needs_transcription": True,
            "page_count": 1,
            "extracted_text": "",
        }
    
    elif filename_lower.endswith(('.xlsx', '.xls')):
        # Excel: has extractable text (no transcription needed)
        if PROCESSING_AVAILABLE:
            try:
                xl = pd.ExcelFile(io.BytesIO(file_bytes))
                text_chunks = []
                for sheet in xl.sheet_names:
                    df = xl.parse(sheet)
                    text_chunks.append(f"[Sheet: {sheet}]")
                    as_text = df.astype(str)
                    for _, row in as_text.iterrows():
                        text_chunks.append(" | ".join(row.tolist()))
                return {
                    "file_type": "excel",
                    "has_text": True,
                    "needs_transcription": False,
                    "page_count": len(xl.sheet_names),
                    "extracted_text": "\n".join(text_chunks),
                }
            except Exception as e:
                return {
                    "file_type": "excel",
                    "has_text": False,
                    "needs_transcription": False,
                    "page_count": None,
                    "extracted_text": "",
                    "error": str(e),
                }
        return {
            "file_type": "excel",
            "has_text": False,
            "needs_transcription": False,
            "page_count": None,
            "extracted_text": "",
        }
    
    elif filename_lower.endswith('.docx'):
        # DOCX: has extractable text
        if PROCESSING_AVAILABLE:
            try:
                document = docx.Document(io.BytesIO(file_bytes))
                text = "\n".join(p.text for p in document.paragraphs)
                return {
                    "file_type": "docx",
                    "has_text": True,
                    "needs_transcription": False,
                    "page_count": None,
                    "extracted_text": text,
                }
            except Exception as e:
                return {
                    "file_type": "docx",
                    "has_text": False,
                    "needs_transcription": False,
                    "page_count": None,
                    "extracted_text": "",
                    "error": str(e),
                }
        return {
            "file_type": "docx",
            "has_text": False,
            "needs_transcription": False,
            "page_count": None,
            "extracted_text": "",
        }
    
    elif filename_lower.endswith(('.txt', '.eml', '.msg')):
        # Text files: has extractable text
        try:
            text = file_bytes.decode('utf-8', errors='ignore')
            return {
                "file_type": "text",
                "has_text": True,
                "needs_transcription": False,
                "page_count": None,
                "extracted_text": text,
            }
        except Exception:
            return {
                "file_type": "text",
                "has_text": False,
                "needs_transcription": False,
                "page_count": None,
                "extracted_text": "",
            }
    
    else:
        # Try to decode as text (fallback)
        try:
            text = file_bytes.decode('utf-8', errors='ignore')
            if text.strip():
                return {
                    "file_type": "text",
                    "has_text": True,
                    "needs_transcription": False,
                    "page_count": None,
                    "extracted_text": text,
                }
        except Exception:
            pass
        
        # Unknown type - assume needs transcription
        return {
            "file_type": "unknown",
            "has_text": False,
            "needs_transcription": True,
            "page_count": None,
            "extracted_text": "",
        }


# ========== LAYER 2: TRANSCRIPTION (VISION MODEL ONLY) ==========

def transcribe_image_with_vision(
    image_bytes: bytes,
    filename: str,
    source_id: int,
    api_key: str
) -> str:
    """
    LAYER 2: Transcribe image using Vision API.
    VISION MODEL ONLY - NO field extraction, NO scrubbing, NO interpretation.
    
    Prompt MUST say: "Transcribe exactly. Preserve line breaks. Do not interpret. Do not summarize."
    
    Returns: Plain text with source markers.
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
        
        # Determine MIME type
        mime_type = "image/png"
        filename_lower = filename.lower()
        if filename_lower.endswith(('.jpg', '.jpeg')):
            mime_type = "image/jpeg"
        elif filename_lower.endswith('.gif'):
            mime_type = "image/gif"
        elif filename_lower.endswith('.webp'):
            mime_type = "image/webp"
        
        # Try GPT-5 first, fallback to GPT-4o if not available
        # Skip model validation (models.list() can be slow/hang) - just try the API call directly
        vision_model = MODEL_VISION
        fallback_model = "gpt-4o"
        
        # CRITICAL: Prompt must say exactly this - no interpretation, no extraction
        # GPT-5 models require max_completion_tokens instead of max_tokens
        request_params = {
            "model": vision_model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Transcribe exactly. Preserve line breaks. Do not interpret. Do not summarize."
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
        }
        
        # GPT-5 models use max_completion_tokens, others use max_tokens
        if vision_model.startswith("gpt-5"):
            request_params["max_completion_tokens"] = 4096
        else:
            request_params["max_tokens"] = 4096
        
        response = client.chat.completions.create(**request_params)
        
        # Validate response
        if not response.choices or not response.choices[0].message:
            error_msg = f"CRITICAL: GPT-5 vision model '{vision_model}' returned empty response. This may indicate the model is not available."
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        transcribed_text = response.choices[0].message.content.strip()
        
        # Add explicit source marker
        # Format: --- SOURCE {id} PAGE {n} ---
        marked_text = f"--- SOURCE {source_id} PAGE 1 ---\n{transcribed_text}\n"
        
        return marked_text
    
    except ValueError as e:
        # Re-raise model validation errors
        logger.error(f"CRITICAL GPT-5 vision model error: {str(e)}")
        raise
    except Exception as e:
        # Check if error is about model not found
        error_str = str(e).lower()
        if "model" in error_str and ("not found" in error_str or "does not exist" in error_str or "invalid" in error_str):
            error_msg = f"CRITICAL: GPT-5 vision model is NOT available. Error: {str(e)}"
            logger.error(error_msg)
            logger.error("This is underwriting-grade document extraction. GPT-5 is REQUIRED for vision/OCR.")
            raise ValueError(error_msg) from e
        raise ValueError(f"Vision transcription error: {str(e)}")


def transcribe_pdf_pages_with_vision(
    pdf_bytes: bytes,
    source_id: int,
    max_pages: int,
    api_key: str
) -> str:
    """
    LAYER 2: Transcribe scanned PDF pages using Vision API.
    Converts PDF pages to images, then transcribes each.
    
    Returns: Plain text with source/page markers.
    """
    if not PROCESSING_AVAILABLE or not api_key:
        raise ValueError("Vision transcription not available")
    
    if not api_key.startswith("sk-") or len(api_key) < 20:
        raise ValueError("Invalid OpenAI API key for vision transcription")
    
    transcribed_pages = []
    client = OpenAI(api_key=api_key)
    import base64
    import io
    
    # Try GPT-5 first, fallback to GPT-4o if not available
    # Skip model validation (models.list() can be slow/hang) - just try the API call directly
    vision_model = MODEL_VISION
    fallback_model = "gpt-4o"
    
    # Try pdf2image first (requires poppler)
    if PDF2IMAGE_AVAILABLE:
        try:
            # Convert PDF pages to images
            images = convert_from_bytes(pdf_bytes, dpi=200, first_page=1, last_page=min(max_pages, MAX_PAGES))
            
            for page_num, image in enumerate(images, start=1):
                try:
                    # Convert PIL Image to bytes
                    img_byte_arr = io.BytesIO()
                    image.save(img_byte_arr, format='PNG')
                    img_byte_arr.seek(0)
                    image_bytes = img_byte_arr.getvalue()
                    
                    # Transcribe this page
                    image_base64 = base64.b64encode(image_bytes).decode('utf-8')
                    
                    # GPT-5 models require max_completion_tokens instead of max_tokens
                    request_params = {
                        "model": vision_model,
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": "Transcribe exactly. Preserve line breaks. Do not interpret. Do not summarize."
                                    },
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": f"data:image/png;base64,{image_base64}",
                                        }
                                    }
                                ]
                            }
                        ],
                    }
                    
                    # GPT-5 models use max_completion_tokens, others use max_tokens
                    if vision_model.startswith("gpt-5"):
                        request_params["max_completion_tokens"] = 4096
                    else:
                        request_params["max_tokens"] = 4096
                    
                    response = client.chat.completions.create(**request_params)
                    
                    page_text = response.choices[0].message.content.strip()
                    transcribed_pages.append(f"--- SOURCE {source_id} PAGE {page_num} ---\n{page_text}")
                    
                except ValueError as e:
                    # Re-raise model validation errors
                    logger.error(f"CRITICAL GPT-5 vision model error on page {page_num}: {str(e)}")
                    raise
                except Exception as e:
                    # Check if error is about model not found
                    error_str = str(e).lower()
                    if "model" in error_str and ("not found" in error_str or "does not exist" in error_str or "invalid" in error_str):
                        error_msg = f"CRITICAL: GPT-5 vision model '{vision_model}' is NOT available. Error: {str(e)}"
                        logger.error(error_msg)
                        logger.error("This is underwriting-grade document extraction. GPT-5 is REQUIRED for vision/OCR.")
                        raise ValueError(error_msg) from e
                    # Log error but continue with other pages for other errors
                    logger.warning(f"Error transcribing page {page_num}: {str(e)}")
                    transcribed_pages.append(f"--- SOURCE {source_id} PAGE {page_num} ---\n[Error transcribing page {page_num}: {str(e)}]")
                    continue
            
            if transcribed_pages:
                return "\n\n".join(transcribed_pages)
            else:
                raise ValueError("No pages were successfully transcribed")
                
        except ValueError as e:
            # Re-raise model validation errors
            logger.error(f"CRITICAL GPT-5 vision model error: {str(e)}")
            raise
        except Exception as e:
            # Check if error is about model not found
            error_str = str(e).lower()
            if "model" in error_str and ("not found" in error_str or "does not exist" in error_str or "invalid" in error_str):
                error_msg = f"CRITICAL: GPT-5 vision model is NOT available. Error: {str(e)}"
                logger.error(error_msg)
                logger.error("This is underwriting-grade document extraction. GPT-5 is REQUIRED for vision/OCR.")
                raise ValueError(error_msg) from e
            # If pdf2image fails, fall back to alternative method
            logger.warning(f"[TRANSCRIBE PDF] pdf2image conversion failed: {str(e)}")
            # Continue to fallback method below
    
    # Fallback: Try using OpenAI's PDF reading capability (if available in future)
    # For now, raise an error indicating pdf2image is needed
    raise ValueError(
        f"PDF transcription requires pdf2image library (pip install pdf2image) and poppler-utils. "
        f"Error: pdf2image not available or conversion failed"
    )


# ========== LAYER 3: TEXT PROCESSING (TEXT MODEL) ==========
# This is handled in extraction.py - see extract_with_schema()


def normalize_corpus_with_markers(sources: List[Dict[str, Any]]) -> str:
    """
    LAYER 3: Build normalized corpus with source/page markers.
    Combines:
    - email body text
    - extracted text from native files (Layer 1)
    - transcribed text from vision layer (Layer 2)
    
    Returns: Normalized corpus with explicit source markers.
    Includes page count information when available.
    """
    corpus_parts = []
    
    for source in sources:
        source_id = source.get("id", 0)
        source_type = source.get("source_type", "unknown")
        filename = source.get("filename", "")
        extracted_text = source.get("extracted_text", "")
        page_count = source.get("page_count")  # Add page count if available
        
        if not extracted_text:
            continue
        
        # Add source marker with page info
        marker = f"--- SOURCE {source_id}"
        if source_type == "email_body":
            marker += " EMAIL_BODY"
        elif filename:
            marker += f" {source_type.upper()} {filename}"
        else:
            marker += f" {source_type.upper()}"
        
        # Add page count if available
        if page_count:
            marker += f" ({page_count} page{'s' if page_count > 1 else ''})"
        
        marker += " ---"
        
        corpus_parts.append(f"{marker}\n{extracted_text}\n")
    
    corpus = "\n\n".join(corpus_parts)
    
    # Log summary
    import logging
    logger = logging.getLogger("uvicorn.error")
    logger.info(f"[CORPUS] Combined {len(corpus_parts)} source(s) into {len(corpus):,} character corpus")
    
    return corpus


def parse_email_body(email_text: str) -> Dict[str, Any]:
    """Parse email text to extract body and basic metadata."""
    lines = email_text.split('\n')
    body_start = 0
    subject = None
    
    # Look for common email headers
    for i, line in enumerate(lines):
        if line.lower().startswith('subject:'):
            subject = line[8:].strip()
        elif line.lower().startswith('from:'):
            body_start = i + 1
            break
    
    body_text = '\n'.join(lines[body_start:]).strip()
    
    return {
        "subject": subject,
        "body": body_text,
        "raw": email_text,
    }
