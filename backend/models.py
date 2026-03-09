from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, Table, JSON, Float, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .database import Base

# Junction table for many-to-many relationship between employees and offices
employee_offices = Table(
    'employee_offices',
    Base.metadata,
    Column('employee_id', Integer, ForeignKey('employees.id', ondelete='CASCADE'), primary_key=True),
    Column('office_id', Integer, ForeignKey('offices.id', ondelete='CASCADE'), primary_key=True),
)


class Office(Base):
    __tablename__ = "offices"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)

    # Many-to-many relationship with employees
    employees = relationship("Employee", secondary=employee_offices, back_populates="offices")
    # Legacy one-to-many relationship (deprecated, kept for backward compatibility during migration)
    employees_legacy = relationship("Employee", back_populates="office_rel", cascade="all, delete-orphan", foreign_keys="[Employee.office_id]")
    agencies = relationship("Agency", back_populates="office_rel", cascade="all, delete-orphan")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True, unique=True, index=True)  # Unique email - one employee per email
    # Legacy office_id (deprecated - kept for backward compatibility during migration)
    # Use offices relationship instead
    office_id = Column(Integer, ForeignKey("offices.id", ondelete="SET NULL"), nullable=True)
    website = Column(String(255), nullable=True)  # Employee's website
    role = Column(String(50), nullable=True)  # Role: admin, manager, underwriter, partner
    # Note: password/auth fields removed - these are now only in the users table

    # Many-to-many relationship with offices
    offices = relationship("Office", secondary=employee_offices, back_populates="employees")
    # Legacy one-to-many relationship (deprecated, kept for backward compatibility)
    office_rel = relationship("Office", back_populates="employees_legacy", foreign_keys=[office_id])
    agencies = relationship("Agency", back_populates="underwriter_rel")


class Agency(Base):
    __tablename__ = "agencies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    office_id = Column(Integer, ForeignKey("offices.id", ondelete="SET NULL"))
    web_address = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    primary_underwriter_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"))
    primary_underwriter = Column(String(255), nullable=True)  # store display name for now
    active_flag = Column(String(50), nullable=True)
    dba = Column(String(255), nullable=True)  # Doing Business As name
    email = Column(String(255), nullable=True)  # Agency email

    office_rel = relationship("Office", back_populates="agencies")
    underwriter_rel = relationship("Employee", back_populates="agencies")
    contacts = relationship("Contact", back_populates="agency", cascade="all, delete-orphan")
    logs = relationship("Log", back_populates="agency", cascade="all, delete-orphan")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    title = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    agency_id = Column(Integer, ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False)
    notes = Column(Text, nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    do_not_contact = Column(Boolean, nullable=False, default=False)
    contact_frequency_days = Column(Integer, nullable=True, default=90)  # Days between contacts (30/60/90/120 or null for never)
    previous_agencies = Column(Text, nullable=True)  # JSON or comma-separated list of previous agency names/codes
    likes_hobbies = Column(Text, nullable=True)  # Personal interests, hobbies, etc.
    additional_info = Column(Text, nullable=True)  # Any other relevant information

    agency = relationship("Agency", back_populates="contacts")


class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    user = Column(String(255), nullable=False)
    datetime = Column(DateTime, nullable=False)
    action = Column(String(255), nullable=False)
    agency_id = Column(Integer, ForeignKey("agencies.id", ondelete="SET NULL"))
    office = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    contact = Column(String(255), nullable=True)  # Frozen snapshot of contact name at log creation

    agency = relationship("Agency", back_populates="logs")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    due_date = Column(DateTime, nullable=True)
    status = Column(String(50), nullable=True)
    owner = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    agency_id = Column(Integer, ForeignKey("agencies.id", ondelete="SET NULL"), nullable=True)

    agency = relationship("Agency")


class Production(Base):
    __tablename__ = "production"

    id = Column(Integer, primary_key=True, index=True)
    office = Column(String(50), nullable=False)
    agency_code = Column(String(50), nullable=False, index=True)
    agency_name = Column(String(255), nullable=False)
    affiliated_code = Column(String(50), nullable=True)  # New field
    active_flag = Column(String(50), nullable=True)
    month = Column(String(7), nullable=False)  # YYYY-MM
    
    # Standard Lines
    standard_lines_ytd_wp = Column(Integer, nullable=True)
    standard_lines_ytd_nb = Column(Integer, nullable=True)
    standard_lines_pytd_wp = Column(Integer, nullable=True)
    standard_lines_pytd_nb = Column(Integer, nullable=True)
    
    # Surplus Lines
    surplus_lines_ytd_wp = Column(Integer, nullable=True)
    surplus_lines_ytd_nb = Column(Integer, nullable=True)
    surplus_lines_pytd_wp = Column(Integer, nullable=True)
    surplus_lines_pytd_nb = Column(Integer, nullable=True)
    
    # All Lines (keeping existing fields for backward compatibility)
    all_ytd_wp = Column(Integer, nullable=True)
    all_ytd_nb = Column(Integer, nullable=True)
    pytd_wp = Column(Integer, nullable=True)
    pytd_nb = Column(Integer, nullable=True)
    py_total_nb = Column(Integer, nullable=True)
    
    # Additional metrics
    premium_change = Column(Integer, nullable=True)
    three_year_plus = Column(Integer, nullable=True)
    twelve_mo_bind_ratio = Column(String(20), nullable=True)  # Can be percentage like "45.2%"
    twelve_mo_bound = Column(Integer, nullable=True)
    twelve_mo_quoted = Column(Integer, nullable=True)
    twelve_mo_decline = Column(Integer, nullable=True)


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    
    # File information
    original_filename = Column(String(500), nullable=True)
    file_type = Column(String(50), nullable=True)
    extracted_text = Column(Text, nullable=True)
    
    # Extracted fields from submission
    effective_date = Column(String(50), nullable=True)
    expiration_date = Column(String(50), nullable=True)
    producer_name = Column(String(255), nullable=True)
    producer_code = Column(String(50), nullable=True)
    insured_name = Column(String(255), nullable=True)
    additional_insured_names = Column(Text, nullable=True)
    
    # Linked CRM entities
    agency_id = Column(Integer, ForeignKey("agencies.id", ondelete="SET NULL"), nullable=True)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    
    # Contact information from submission
    contact_name = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    contact_email = Column(String(255), nullable=True)
    
    # Mailing address
    mailing_address = Column(Text, nullable=True)
    
    # Location address
    location_street_number = Column(String(50), nullable=True)
    location_street_name = Column(String(255), nullable=True)
    location_suite = Column(String(50), nullable=True)
    location_city = Column(String(100), nullable=True)
    location_state = Column(String(2), nullable=True)
    location_zip = Column(String(20), nullable=True)
    
    # Limits and coverages
    building_limit = Column(String(50), nullable=True)
    deductible = Column(String(50), nullable=True)
    additional_limits_rents = Column(String(50), nullable=True)
    additional_limits_ordinance = Column(String(50), nullable=True)
    additional_limits_demolition = Column(String(50), nullable=True)
    additional_limits_eqsl = Column(String(50), nullable=True)
    additional_insured = Column(Text, nullable=True)
    mortgagee = Column(Text, nullable=True)
    loss_payee = Column(Text, nullable=True)
    
    # Property details
    construction_type = Column(String(100), nullable=True)
    construction_year = Column(String(10), nullable=True)
    square_feet = Column(String(20), nullable=True)
    sprinkler_percent = Column(String(20), nullable=True)
    protection_class = Column(String(20), nullable=True)
    
    # Additional fields
    line_of_business = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Status tracking
    status = Column(String(50), nullable=True, default="pending")  # pending, reviewed, exported
    reviewed_by = Column(String(255), nullable=True)
    
    agency = relationship("Agency")
    contact = relationship("Contact")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    actor_email = Column(String(255), nullable=False, index=True)
    actor_employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(50), nullable=False)  # VIEW, CREATE, UPDATE, DELETE, EXPORT
    entity_type = Column(String(50), nullable=False)  # "agency", "office", "contact", "log", "task"
    entity_id = Column(Integer, nullable=True)
    office_id = Column(Integer, ForeignKey("offices.id", ondelete="SET NULL"), nullable=True)
    details_json = Column(Text, nullable=True)  # JSON of before/after changes or additional context
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    request_path = Column(String(500), nullable=True)
    request_method = Column(String(10), nullable=True)

    actor_employee = relationship("Employee")
    office = relationship("Office")


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    body = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)  # e.g., "Introduction", "Follow-up", "Quote Request"
    created_by_employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    is_system_template = Column(Boolean, nullable=False, default=False)  # System templates vs user-created
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_by = relationship("Employee", foreign_keys=[created_by_employee_id])


class Renewal(Base):
    __tablename__ = "renewals"

    id = Column(Integer, primary_key=True, index=True)
    policy_number = Column(String(100), nullable=False)
    insured_name = Column(String(255), nullable=False)
    expiration_date = Column(DateTime, nullable=False, index=True)
    producer = Column(String(255), nullable=True)  # Producer/agency info
    producer_code = Column(String(50), nullable=True)
    status = Column(String(50), nullable=False, default="pending")  # pending, quoted, non-renewed, processed
    notes = Column(Text, nullable=True)
    premium = Column(Float, nullable=True)
    coverage_type = Column(String(255), nullable=True)
    created_by_employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    created_by_employee = relationship("Employee", foreign_keys=[created_by_employee_id])


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=True, index=True)  # Email for password resets
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)  # Admin role
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)
    
    # Link to employee if applicable
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    employee = relationship("Employee")
    
    # Password reset fields
    password_reset_token = Column(String(255), nullable=True, index=True)
    password_reset_expires = Column(DateTime, nullable=True)
    
    # Account security
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)  # Account lockout until this time
    must_change_password = Column(Boolean, default=False, nullable=False)  # Force password change on next login


class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    user = relationship("User")


# ========== Draft Intake System Models ==========

class DraftStatus(enum.Enum):
    """Draft submission status workflow."""
    NEW = "NEW"
    INGESTED = "INGESTED"
    EXTRACTED = "EXTRACTED"
    READY = "READY"
    SUBMITTED = "SUBMITTED"


class DraftSubmission(Base):
    """Draft submission with workflow status tracking."""
    __tablename__ = "draft_submissions"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Product selection
    product_code = Column(String(50), nullable=False, index=True)  # e.g., "PBOP"
    product_version = Column(String(20), nullable=False, default="v1")  # e.g., "v1"
    
    # Status tracking
    status = Column(String(20), nullable=False, default="NEW", index=True)  # NEW, INGESTED, EXTRACTED, READY, SUBMITTED
    
    # Linked CRM entities (optional, can be matched during extraction)
    agency_id = Column(Integer, ForeignKey("agencies.id", ondelete="SET NULL"), nullable=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)  # Underwriter who created this
    
    # Extracted JSON payload (schema-driven, product-specific structure)
    extracted_data = Column(JSON, nullable=True)  # Store the structured extraction result
    
    # Relationships
    agency = relationship("Agency")
    employee = relationship("Employee")
    sources = relationship("SubmissionSource", back_populates="draft", cascade="all, delete-orphan")
    field_values = relationship("ExtractedFieldValue", back_populates="draft", cascade="all, delete-orphan")


class SubmissionSource(Base):
    """Source documents for a draft (email body + attachments)."""
    __tablename__ = "submission_sources"

    id = Column(Integer, primary_key=True, index=True)
    draft_id = Column(Integer, ForeignKey("draft_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Source metadata
    source_type = Column(String(50), nullable=False)  # "email_body", "pdf", "image", "excel", "docx", etc.
    filename = Column(String(500), nullable=True)  # For attachments
    content_type = Column(String(100), nullable=True)  # MIME type
    
    # Extracted content
    extracted_text = Column(Text, nullable=True)  # Full extracted text
    page_count = Column(Integer, nullable=True)  # For PDFs: number of pages processed
    
    # Storage metadata
    file_hash = Column(String(64), nullable=True, index=True)  # SHA-256 for deduplication
    file_size = Column(Integer, nullable=True)  # Size in bytes
    
    # Processing metadata
    processed_at = Column(DateTime, nullable=True)
    extraction_method = Column(String(50), nullable=True)  # "text", "ocr", "vision", etc.
    
    # Relationships
    draft = relationship("DraftSubmission", back_populates="sources")


class ExtractedFieldValue(Base):
    """Store extracted vs overridden vs final field values with evidence."""
    __tablename__ = "extracted_field_values"

    id = Column(Integer, primary_key=True, index=True)
    draft_id = Column(Integer, ForeignKey("draft_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Field identification (schema-driven path)
    field_path = Column(String(255), nullable=False, index=True)  # e.g., "policy.company_number", "locations[0].address.street_number"
    
    # Values
    extracted_value = Column(Text, nullable=True)  # AI-extracted value (JSON string for complex types)
    overridden_value = Column(Text, nullable=True)  # User-overridden value (if any)
    final_value = Column(Text, nullable=True)  # Final value to use (extracted or overridden)
    
    # Evidence and confidence
    confidence = Column(Float, nullable=True)  # 0.0 to 1.0
    evidence = Column(JSON, nullable=True)  # Array of source references: [{"source_id": 1, "page": 1, "snippet": "..."}]
    
    # Status
    is_overridden = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relationships
    draft = relationship("DraftSubmission", back_populates="field_values")


class ProductSchema(Base):
    """Product schema definitions (PBOP, etc.)."""
    __tablename__ = "product_schemas"

    id = Column(Integer, primary_key=True, index=True)
    product_code = Column(String(50), nullable=False, unique=True, index=True)  # e.g., "PBOP"
    version = Column(String(20), nullable=False, default="v1")  # e.g., "v1"
    
    # Schema definition (JSON structure matching the required shape)
    schema_definition = Column(JSON, nullable=False)  # Full schema structure
    
    # Metadata
    name = Column(String(255), nullable=False)  # Display name
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)


class OutboxMessage(Base):
    """Outbox for final JSON payloads ready to submit to AS400."""
    __tablename__ = "outbox_messages"

    id = Column(Integer, primary_key=True, index=True)
    draft_id = Column(Integer, ForeignKey("draft_submissions.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Payload
    payload_json = Column(JSON, nullable=False)  # Final JSON payload for AS400
    
    # Submission tracking
    submitted_at = Column(DateTime, nullable=True)
    submission_status = Column(String(50), nullable=True, default="pending")  # pending, success, failed
    submission_response = Column(Text, nullable=True)  # Response from AS400 (or error)
    
    # Metadata
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    
    # Relationships
    draft = relationship("DraftSubmission")
    creator = relationship("Employee")
