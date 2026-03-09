"""
Draft submission intake endpoints.
Handles draft creation, ingestion, and schema-driven extraction.
"""
import os
import json
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime

from .. import models, schemas
from ..database import get_db
from ..auth.proxy_headers import get_current_user, require_authenticated

logger = logging.getLogger(__name__)
from ..services.ingestion_v2 import (
    detect_file_type,
    transcribe_image_with_vision,
    transcribe_pdf_pages_with_vision,
    normalize_corpus_with_markers,
    calculate_file_hash,
    parse_email_body,
)
from ..services.extraction import extract_with_schema
from ..ai_client import get_client

router = APIRouter(prefix="/drafts", tags=["drafts"])

# Environment variables
AI_API_KEY = os.getenv("AI_API_KEY", "")
MODEL_TEXT = os.getenv("MODEL_TEXT", "gpt-5-mini")  # Text-based PDF extraction - GPT-5 required


@router.post("", response_model=Dict[str, Any])
def create_draft(
    product_code: str = Form(...),
    product_version: str = Form("v1"),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new draft submission with product selection."""
    require_authenticated(user)
    
    # Verify product schema exists
    product_schema = db.query(models.ProductSchema).filter(
        models.ProductSchema.product_code == product_code,
        models.ProductSchema.version == product_version,
        models.ProductSchema.is_active == True,
    ).first()
    
    if not product_schema:
        raise HTTPException(
            status_code=404,
            detail=f"Product schema not found: {product_code} v{product_version}"
        )
    
    # Get employee_id from user
    employee_id = user.get("employee_id")
    
    # Create draft
    draft = models.DraftSubmission(
        product_code=product_code,
        product_version=product_version,
        status="NEW",
        employee_id=employee_id,
        created_at=datetime.utcnow(),
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    
    return {
        "id": draft.id,
        "product_code": draft.product_code,
        "product_version": draft.product_version,
        "status": draft.status,
        "created_at": draft.created_at.isoformat(),
    }


@router.post("/{draft_id}/ingest")
async def ingest_draft(
    draft_id: int,
    email_body: Optional[str] = Form(None),
    attachments: List[UploadFile] = File([]),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Ingest email body and attachments into a draft.
    Extracts text from all sources and stores as SubmissionSource records.
    """
    require_authenticated(user)
    
    # Get draft
    draft = db.query(models.DraftSubmission).filter(models.DraftSubmission.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    # Verify user has access (created by same user or admin)
    if not user.get("is_admin") and draft.employee_id != user.get("employee_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    sources_created = []
    
    # Ingest email body if provided
    if email_body:
        email_parsed = parse_email_body(email_body)
        email_hash = calculate_file_hash(email_body.encode('utf-8'))
        
        source = models.SubmissionSource(
            draft_id=draft_id,
            source_type="email_body",
            filename=None,
            content_type="text/plain",
            extracted_text=email_parsed.get("body", email_body),
            page_count=None,
            file_hash=email_hash,
            file_size=len(email_body.encode('utf-8')),
            processed_at=datetime.utcnow(),
            extraction_method="text",
        )
        db.add(source)
        sources_created.append({
            "id": source.id,
            "type": "email_body",
            "filename": None,
            "extraction_method": "text",
        })
    
    # Ingest attachments using STRICT 3-LAYER PIPELINE
    for attachment in attachments:
        try:
            file_bytes = await attachment.read()
            file_hash = calculate_file_hash(file_bytes)
            
            # Check for duplicate
            existing = db.query(models.SubmissionSource).filter(
                models.SubmissionSource.draft_id == draft_id,
                models.SubmissionSource.file_hash == file_hash,
            ).first()
            
            if existing:
                # Skip duplicate
                continue
            
            # LAYER 1: DETECTION (no AI)
            detection_result = detect_file_type(attachment.filename or "unknown", file_bytes)
            source_type = detection_result["file_type"]
            needs_transcription = detection_result["needs_transcription"]
            extracted_text = detection_result.get("extracted_text", "")
            page_count = detection_result.get("page_count")
            
            # LAYER 2: TRANSCRIPTION (VISION MODEL ONLY) - if needed
            extraction_method = "text"  # Default
            if needs_transcription:
                if source_type == "image":
                    # Image: transcribe with vision API
                    if AI_API_KEY:
                        try:
                            # Create source first to get ID
                            temp_source = models.SubmissionSource(
                                draft_id=draft_id,
                                source_type="image",
                                filename=attachment.filename,
                                content_type=attachment.content_type,
                                extracted_text="",  # Will be updated
                                page_count=detection_result.get("page_count", 1),
                                file_hash=file_hash,
                                file_size=len(file_bytes),
                                processed_at=datetime.utcnow(),
                                extraction_method="vision",
                            )
                            db.add(temp_source)
                            db.flush()  # Get ID without committing
                            
                            # Transcribe with vision (Layer 2)
                            transcribed_text = transcribe_image_with_vision(
                                file_bytes,
                                attachment.filename or "unknown",
                                temp_source.id,
                                AI_API_KEY,
                            )
                            temp_source.extracted_text = transcribed_text
                            extraction_method = "vision"
                            
                            source = temp_source
                        except Exception as e:
                            # If transcription fails, rollback and skip
                            db.rollback()
                            print(f"[INGEST LAYER 2] Vision transcription failed for {attachment.filename}: {str(e)}")
                            continue
                    else:
                        print(f"[INGEST LAYER 2] Vision API key not available for {attachment.filename}")
                        continue
                elif source_type == "pdf" and needs_transcription:
                    # Scanned PDF: transcribe with vision API
                    if AI_API_KEY:
                        try:
                            # Create source first to get ID
                            temp_source = models.SubmissionSource(
                                draft_id=draft_id,
                                source_type="pdf",
                                filename=attachment.filename,
                                content_type=attachment.content_type,
                                extracted_text="",  # Will be updated
                                page_count=page_count,
                                file_hash=file_hash,
                                file_size=len(file_bytes),
                                processed_at=datetime.utcnow(),
                                extraction_method="vision",
                            )
                            db.add(temp_source)
                            db.flush()  # Get ID without committing
                            
                            # Transcribe PDF with vision (Layer 2)
                            transcribed_text = transcribe_pdf_pages_with_vision(
                                file_bytes,
                                temp_source.id,
                                page_count or MAX_PAGES,
                                AI_API_KEY,
                            )
                            temp_source.extracted_text = transcribed_text
                            extraction_method = "vision"
                            
                            source = temp_source
                            
                        except Exception as e:
                            import traceback
                            error_details = traceback.format_exc()
                            logger.error(f"[INGEST LAYER 2] Vision transcription failed for PDF {attachment.filename}: {str(e)}")
                            logger.error(f"[INGEST LAYER 2] Traceback: {error_details}")
                            print(f"[INGEST LAYER 2] Vision transcription failed for PDF {attachment.filename}: {str(e)}")
                            # Rollback the temp_source that was created
                            db.rollback()
                            # Fallback: store with minimal text
                            source = models.SubmissionSource(
                                draft_id=draft_id,
                                source_type="pdf",
                                filename=attachment.filename,
                                content_type=attachment.content_type,
                                extracted_text=extracted_text or f"[PDF transcription failed: {str(e)}]",
                                page_count=page_count,
                                file_hash=file_hash,
                                file_size=len(file_bytes),
                                processed_at=datetime.utcnow(),
                                extraction_method="pdf_text_fallback",
                            )
                            db.add(source)
                    else:
                        print(f"[INGEST LAYER 2] Vision API key not available for PDF {attachment.filename}")
                        # Fallback: store with minimal text
                        source = models.SubmissionSource(
                            draft_id=draft_id,
                            source_type="pdf",
                            filename=attachment.filename,
                            content_type=attachment.content_type,
                            extracted_text=extracted_text or "[PDF transcription skipped - no API key]",
                            page_count=page_count,
                            file_hash=file_hash,
                            file_size=len(file_bytes),
                            processed_at=datetime.utcnow(),
                            extraction_method="pdf_text_fallback",
                        )
                        db.add(source)
                else:
                    # Other types that need transcription but not yet implemented
                    source = models.SubmissionSource(
                        draft_id=draft_id,
                        source_type=source_type,
                        filename=attachment.filename,
                        content_type=attachment.content_type,
                        extracted_text=extracted_text or "",
                        page_count=page_count,
                        file_hash=file_hash,
                        file_size=len(file_bytes),
                        processed_at=datetime.utcnow(),
                        extraction_method="text",
                    )
                    db.add(source)
            else:
                # Native text file - use text from Layer 1
                source = models.SubmissionSource(
                    draft_id=draft_id,
                    source_type=source_type,
                    filename=attachment.filename,
                    content_type=attachment.content_type,
                    extracted_text=extracted_text,
                    page_count=page_count,
                    file_hash=file_hash,
                    file_size=len(file_bytes),
                    processed_at=datetime.utcnow(),
                    extraction_method="text",
                )
                db.add(source)
                extraction_method = "text"
            
            sources_created.append({
                "id": source.id,
                "type": source_type,
                "filename": attachment.filename,
                "extraction_method": extraction_method,
                "layer": "transcription" if needs_transcription else "detection",
            })
        
        except Exception as e:
            # Log error but continue with other attachments
            print(f"[INGEST] Error processing attachment {attachment.filename}: {str(e)}")
            continue
    
    # Update draft status to INGESTED
    draft.status = "INGESTED"
    draft.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "draft_id": draft_id,
        "status": draft.status,
        "sources_created": sources_created,
        "total_sources": len(sources_created),
    }


@router.post("/{draft_id}/extract")
def extract_draft(
    draft_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Extract structured data from ingested sources using product schema.
    Uses OpenAI to extract fields according to the schema definition.
    """
    require_authenticated(user)
    
    # Get draft
    draft = db.query(models.DraftSubmission).filter(models.DraftSubmission.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    if draft.status != "INGESTED":
        raise HTTPException(
            status_code=400,
            detail=f"Draft must be INGESTED before extraction (current: {draft.status})"
        )
    
    # Verify user has access
    if not user.get("is_admin") and draft.employee_id != user.get("employee_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get product schema
    product_schema = db.query(models.ProductSchema).filter(
        models.ProductSchema.product_code == draft.product_code,
        models.ProductSchema.version == draft.product_version,
    ).first()
    
    if not product_schema:
        raise HTTPException(status_code=404, detail="Product schema not found")
    
    # Get all sources for this draft
    sources = db.query(models.SubmissionSource).filter(
        models.SubmissionSource.draft_id == draft_id
    ).all()
    
    if not sources:
        raise HTTPException(status_code=400, detail="No sources found for draft")
    
    # LAYER 3: TEXT PROCESSING (TEXT MODEL)
    # Build normalized corpus with source/page markers
    source_dicts = []
    for source in sources:
        source_dicts.append({
            "id": source.id,
            "source_type": source.source_type,
            "filename": source.filename,
            "extracted_text": source.extracted_text or "",
            "page_count": source.page_count,  # Include page count for corpus markers
        })
    
    # Build normalized corpus with explicit markers
    normalized_corpus = normalize_corpus_with_markers(source_dicts)
    
    # Log corpus size for debugging
    logger.info(f"[EXTRACTION] Corpus size: {len(normalized_corpus):,} characters from {len(source_dicts)} source(s)")
    total_text_length = sum(len(s.get("extracted_text", "") or "") for s in source_dicts)
    logger.info(f"[EXTRACTION] Total extracted text: {total_text_length:,} characters")
    
    # Extract using schema (Layer 3)
    try:
        extraction_result = extract_with_schema(
            normalized_corpus,
            product_schema.schema_definition,
            api_key=AI_API_KEY,
            model=MODEL_TEXT,
        )
        
        # extraction_result now contains both extracted_data and redaction_instructions
        # The extract_with_schema function returns a dict with this structure
        if not isinstance(extraction_result, dict):
            raise ValueError(f"Extraction result must be a dict, got {type(extraction_result)}")
        
        extracted_data = extraction_result.get("extracted_data", {})
        redaction_instructions = extraction_result.get("redaction_instructions", [])
        
        # Validate extracted_data structure
        if not isinstance(extracted_data, dict):
            logger.warning(f"[EXTRACTION] extracted_data is not a dict: {type(extracted_data)}, wrapping it")
            extracted_data = {"raw": extracted_data} if extracted_data else {}
        
        # Store extracted data (redaction instructions can be stored separately or applied later)
        # Ensure it's JSON-serializable
        draft.extracted_data = {
            "extracted_data": extracted_data,
            "redaction_instructions": redaction_instructions,
        }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"[EXTRACTION ERROR] {str(e)}")
        logger.error(f"[EXTRACTION ERROR] Traceback: {error_details}")
        raise HTTPException(
            status_code=500,
            detail=f"Extraction failed: {str(e)}"
        )
    
    # Update draft status
    draft.status = "EXTRACTED"
    draft.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(draft)
    
    return {
        "draft_id": draft_id,
        "status": draft.status,
        "extracted_data": extracted_data,
        "redaction_instructions": redaction_instructions,
    }


@router.get("/{draft_id}")
def get_draft(
    draft_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get draft submission details."""
    require_authenticated(user)
    
    draft = db.query(models.DraftSubmission).filter(models.DraftSubmission.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    # Verify user has access
    if not user.get("is_admin") and draft.employee_id != user.get("employee_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get sources
    sources = db.query(models.SubmissionSource).filter(
        models.SubmissionSource.draft_id == draft_id
    ).all()
    
    return {
        "id": draft.id,
        "product_code": draft.product_code,
        "product_version": draft.product_version,
        "status": draft.status,
        "extracted_data": draft.extracted_data,
        "created_at": draft.created_at.isoformat() if draft.created_at else None,
        "updated_at": draft.updated_at.isoformat() if draft.updated_at else None,
        "sources": [
            {
                "id": s.id,
                "source_type": s.source_type,
                "filename": s.filename,
                "content_type": s.content_type,
                "extracted_text": s.extracted_text,
                "page_count": s.page_count,
                "extraction_method": s.extraction_method,
                "processed_at": s.processed_at.isoformat() if s.processed_at else None,
            }
            for s in sources
        ],
    }
