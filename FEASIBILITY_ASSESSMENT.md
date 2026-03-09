# Feasibility Assessment: Enhanced Document Intake System

## Executive Summary

**✅ YES, this is executable** with the current codebase as a foundation. The project already has ~60% of what's needed. The architecture aligns well with FastAPI + React, and the proposed 5-layer system is a logical extension of existing functionality.

**Estimated Implementation:** 2-3 weeks of focused development

---

## Current State Analysis

### ✅ What Already Exists

1. **Basic Document Processing**
   - PDF text extraction (pdfplumber)
   - DOCX extraction (python-docx)
   - Excel extraction (pandas)
   - Text file handling
   - File upload endpoint (`/submissions/upload`)

2. **Database Foundation**
   - `Submission` model exists with many fields
   - File metadata storage (filename, file_type)
   - Extracted text storage
   - Linked to agencies/contacts

3. **AI Extraction**
   - OpenAI integration working
   - Field extraction from text
   - JSON output structure

4. **Infrastructure**
   - `private/uploads/` directory exists
   - FastAPI file upload handling
   - Environment variable management
   - Audit logging system

### ❌ What's Missing (Required for Goal)

1. **Email Processing** (NEW)
   - No .eml/.msg parsing
   - No email attachment extraction
   - No email metadata extraction

2. **OCR Capability** (NEW)
   - No OCR library (Tesseract, EasyOCR, etc.)
   - No image preprocessing
   - No confidence scoring
   - No per-page tracking

3. **Document Router/Normalization Layer** (PARTIAL)
   - Basic routing exists but not structured
   - No canonical artifact format
   - No structured output (document.json, tables.json)

4. **Intake Record System** (NEW)
   - Need separate `IntakeRecord` table
   - File hash (SHA-256) storage
   - Status tracking (pending, processing, completed, needs_review)
   - Parent/child relationships (email → attachments)

5. **Artifact Storage** (NEW)
   - No structured artifact directory (`private/uploads/<file_id>/artifacts/`)
   - No document.json metadata
   - No tables.json output
   - No page images storage

6. **Review Workflow** (NEW)
   - No confidence flagging
   - No manual override UI
   - No correction tracking (original vs corrected)
   - No "needs review" status

7. **Image Support** (NEW)
   - No image file handling (PNG, JPG, TIFF)
   - No image preprocessing (deskew, denoise)
   - No OCR for images

8. **Table Preservation** (PARTIAL)
   - Excel tables extracted but flattened
   - No structured table JSON output
   - No table region preservation

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

#### 1.1 Database Schema Updates
**New Tables Needed:**
```python
class IntakeRecord(Base):
    id = Column(Integer, primary_key=True)
    file_id = Column(String(36), unique=True)  # UUID
    original_filename = Column(String(500))
    mime_type = Column(String(100))
    file_size = Column(Integer)
    file_hash = Column(String(64))  # SHA-256
    user_email = Column(String(255))
    upload_time = Column(DateTime)
    status = Column(String(50))  # pending, processing, completed, needs_review, failed
    parent_id = Column(Integer, ForeignKey("intake_records.id"))  # For email attachments
    extraction_method = Column(String(50))  # native, ocr, hybrid
    confidence_score = Column(Float)
    
class DocumentArtifact(Base):
    id = Column(Integer, primary_key=True)
    intake_record_id = Column(Integer, ForeignKey("intake_records.id"))
    artifact_type = Column(String(50))  # document.json, document.txt, tables.json, page_image
    artifact_path = Column(String(500))
    artifact_hash = Column(String(64))
    created_at = Column(DateTime)

class FieldExtraction(Base):
    id = Column(Integer, primary_key=True)
    intake_record_id = Column(Integer, ForeignKey("intake_records.id"))
    field_name = Column(String(100))
    extracted_value = Column(Text)
    corrected_value = Column(Text, nullable=True)
    confidence = Column(Float)
    source_quote = Column(Text)
    page_ref = Column(Integer, nullable=True)
    corrected_by = Column(String(255), nullable=True)
    corrected_at = Column(DateTime, nullable=True)
```

**Migration Strategy:**
- Keep existing `Submission` table for backward compatibility
- Create new `IntakeRecord` table
- Link `Submission` to `IntakeRecord` via foreign key
- Gradually migrate to new system

#### 1.2 File Storage Structure
```
private/uploads/
├── {file_id}/
│   ├── original.{ext}          # Raw uploaded file
│   └── artifacts/
│       ├── document.json       # Metadata
│       ├── document.txt        # Extracted text
│       ├── tables.json         # Structured tables (if any)
│       └── pages/              # OCR page images (if needed)
│           ├── page_001.png
│           └── page_002.png
```

#### 1.3 Dependencies to Add
```txt
# OCR
pytesseract>=0.3.10
Pillow>=10.0.0  # Image processing
opencv-python>=4.8.0  # Image preprocessing (optional but recommended)

# Email parsing
extract-msg>=0.41.0  # For .msg files
email-validator>=2.0.0  # Already have this

# Image processing
scikit-image>=0.21.0  # For deskew/denoise (optional)
```

### Phase 2: Document Router & Normalization (Week 1-2)

#### 2.1 Document Router Implementation
```python
class DocumentRouter:
    def route(self, file_bytes: bytes, filename: str, mime_type: str) -> DocumentType:
        # Detect file type
        # Route to appropriate processor
        # Return normalized document
```

**Processors Needed:**
- `EmailProcessor` - Extract .eml/.msg, handle attachments
- `PDFProcessor` - Native extraction + OCR decision logic
- `OfficeProcessor` - DOCX/XLSX with table preservation
- `ImageProcessor` - OCR with preprocessing
- `TextProcessor` - Plain text files

#### 2.2 OCR Decision Logic
```python
def needs_ocr(pdf_bytes: bytes) -> bool:
    # Extract native text
    native_text = extract_native_text(pdf_bytes)
    
    # Heuristics:
    # - Text length < 100 chars per page → likely scanned
    # - Lots of garbage characters → likely OCR needed
    # - No text objects in PDF → image-based
    
    if len(native_text) < threshold:
        return True
    if has_garbage_chars(native_text):
        return True
    return False
```

#### 2.3 Canonical Artifact Generation
```python
def create_artifacts(intake_record: IntakeRecord) -> Dict:
    return {
        "document.json": {
            "file_id": intake_record.file_id,
            "page_count": page_count,
            "extraction_method": "native" | "ocr" | "hybrid",
            "confidence": avg_confidence,
            "timings": {...},
            "source_hash": file_hash,
            "artifact_hash": artifact_hash
        },
        "document.txt": extracted_text,
        "tables.json": structured_tables,  # Optional
        "pages/": page_images  # Optional, only if OCR'd
    }
```

### Phase 3: OCR & Image Processing (Week 2)

#### 3.1 OCR Implementation
- Use Tesseract (free, open-source) or EasyOCR (better accuracy)
- Page-by-page processing
- Confidence scoring per page
- Store page images if OCR was needed

#### 3.2 Image Preprocessing
- Deskew (rotate skewed scans)
- Denoise (remove artifacts)
- Binarization (convert to black/white)
- Store preprocessed version

#### 3.3 Table Extraction
- Use pdfplumber's table extraction for PDFs
- Preserve Excel structure (don't flatten)
- Output as structured JSON

### Phase 4: Review Workflow (Week 2-3)

#### 4.1 Confidence Flagging
```python
def flag_low_confidence(intake_record: IntakeRecord):
    if intake_record.confidence_score < 0.7:
        intake_record.status = "needs_review"
    # Also flag if fields conflict
    if has_conflicting_fields(intake_record):
        intake_record.status = "needs_review"
```

#### 4.2 Manual Override UI
- Frontend component for reviewing extractions
- Show original vs corrected values
- Track who made corrections and when
- Store in `FieldExtraction` table

#### 4.3 Audit Trail
- Already have `audit_log` table
- Log all corrections
- Track original → corrected changes

### Phase 5: Email Processing (Week 3)

#### 5.1 Email Parser
- Parse .eml files (Python `email` library)
- Parse .msg files (`extract-msg` library)
- Extract: subject, from/to/cc, date, body, attachments

#### 5.2 Attachment Handling
- Each attachment becomes child `IntakeRecord`
- Link via `parent_id`
- Process attachments through same pipeline

---

## Technical Challenges & Solutions

### Challenge 1: OCR Performance
**Problem:** OCR is slow (seconds per page)
**Solution:**
- Async processing with background tasks
- Cache OCR results (hash-based)
- Only OCR when needed (native extraction first)
- Consider cloud OCR API for production (Google Vision, AWS Textract)

### Challenge 2: Large Files
**Problem:** Large PDFs/images can cause memory issues
**Solution:**
- Stream processing (page-by-page)
- File size limits (configurable)
- Progress tracking for long operations

### Challenge 3: Table Extraction Accuracy
**Problem:** Complex tables may not extract perfectly
**Solution:**
- Use multiple extraction methods (pdfplumber, camelot)
- Flag low-confidence tables for review
- Allow manual table entry

### Challenge 4: Email Attachment Nesting
**Problem:** Emails with attachments that are emails
**Solution:**
- Recursive processing with depth limit
- Track processing depth
- Prevent infinite loops

---

## Security Considerations

### ✅ Already Aligned
- Files stored in `private/` (not in Git)
- Environment variables for secrets
- Audit logging

### ⚠️ Additional Needed
- **File size limits:** Prevent DoS attacks
- **File type validation:** Whitelist allowed types
- **Virus scanning:** Consider ClamAV for production
- **Rate limiting:** Prevent abuse
- **Access control:** Ensure users can only access their uploads

---

## Performance Considerations

### Current Bottlenecks
- Synchronous processing (blocks request)
- No caching of OCR results
- No background job queue

### Recommended Improvements
1. **Background Processing:**
   - Use Celery or RQ for async tasks
   - Return immediately with "processing" status
   - WebSocket or polling for progress updates

2. **Caching:**
   - Cache OCR results by file hash
   - Cache extracted text
   - Redis for in-memory caching

3. **Optimization:**
   - Only OCR when needed
   - Batch process multiple pages
   - Use faster OCR engines for production

---

## Data Retention Strategy

### Recommended Approach
1. **Raw files:** Keep for 90 days, then purge
2. **Artifacts:** Keep indefinitely (smaller, structured)
3. **Extracted fields:** Keep indefinitely (in database)
4. **Page images:** Keep for 30 days (only if OCR'd)

### Implementation
- Scheduled cleanup job
- Configurable retention periods
- Archive option (move to cold storage)

---

## Integration Points

### Existing Systems
- **Submission model:** Link `IntakeRecord` to `Submission`
- **Agency/Contact linking:** Already supported
- **Audit logging:** Already implemented

### New Integrations Needed
- **Background job queue:** Celery or RQ
- **Progress tracking:** WebSocket or Server-Sent Events
- **File storage:** Consider object storage (S3, Azure Blob) for production

---

## Frontend Changes Required

### New Components
1. **File Upload Component:**
   - Drag & drop
   - Progress indicator
   - Multiple file support

2. **Review Interface:**
   - List of "needs review" items
   - Field-by-field correction
   - Confidence indicators
   - Source quotes display

3. **Status Dashboard:**
   - Processing queue
   - Completed items
   - Failed items with retry

### API Endpoints Needed
```
POST   /intake/upload              # Upload file
GET    /intake/{file_id}/status    # Check processing status
GET    /intake/{file_id}/artifacts # Get artifacts
GET    /intake/review              # List items needing review
PATCH  /intake/{file_id}/fields    # Correct extracted fields
GET    /intake/{file_id}/original  # Download original file
```

---

## Estimated Effort

### Development Time
- **Phase 1 (Foundation):** 3-4 days
- **Phase 2 (Router/Normalization):** 4-5 days
- **Phase 3 (OCR/Images):** 3-4 days
- **Phase 4 (Review Workflow):** 2-3 days
- **Phase 5 (Email):** 2-3 days
- **Testing & Polish:** 3-4 days

**Total: 17-23 days (3-4 weeks)**

### Dependencies to Install
- Tesseract OCR (system-level, not Python package)
- Additional Python packages (listed above)
- Optional: OpenCV for advanced image processing

---

## Risk Assessment

### Low Risk ✅
- Database schema changes (migrations supported)
- File storage structure (straightforward)
- Basic OCR integration (well-documented libraries)

### Medium Risk ⚠️
- Email parsing (edge cases with malformed emails)
- Table extraction accuracy (complex layouts)
- Performance with large files (needs optimization)

### High Risk 🔴
- OCR accuracy for handwriting (as noted, will be lower)
- Background job queue setup (infrastructure change)
- Production OCR performance (may need cloud API)

---

## Recommendations

### Immediate Next Steps
1. **Start with Phase 1:** Database schema + file structure
2. **Add OCR library:** Tesseract (free) or EasyOCR (better accuracy)
3. **Implement basic router:** PDF native extraction + OCR decision
4. **Test with sample files:** Various formats, scanned PDFs, images

### Phased Rollout
1. **Week 1:** Foundation + basic OCR
2. **Week 2:** Full normalization + review workflow
3. **Week 3:** Email processing + polish

### Production Considerations
- **Cloud OCR:** Consider Google Vision API or AWS Textract for better accuracy
- **Background jobs:** Essential for production (don't block requests)
- **Monitoring:** Track OCR success rates, processing times
- **Cost:** OCR API costs can add up (monitor usage)

---

## Conclusion

**✅ This is absolutely executable** with your current codebase. The architecture is sound, the technology stack supports it, and you have a solid foundation to build upon.

**Key Success Factors:**
1. Start with foundation (database + file structure)
2. Implement OCR incrementally (native extraction first, then OCR)
3. Use background processing for long operations
4. Build review workflow early (users will need it)

**Biggest Challenges:**
1. OCR accuracy (especially handwriting)
2. Performance optimization
3. Background job infrastructure

**Recommendation:** Proceed with implementation, starting with Phase 1. The system will be valuable even with basic OCR, and can be enhanced over time.

