from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel, EmailStr, ConfigDict, model_serializer


class OrmModel(BaseModel):
    """Base model configured for ORM attribute access (Pydantic v2 style)."""

    model_config = ConfigDict(from_attributes=True)


# --------- USER (AUTH) ---------
class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password: Optional[str] = None  # Optional - if not provided, user will set via link
    email: Optional[str] = None
    is_admin: bool = False
    employee_id: Optional[int] = None
    send_welcome_email: bool = True  # Send welcome email with credentials/link
    send_password_link: bool = False  # If true, send set-password link instead of temp password


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    employee_id: Optional[int] = None


class UserLogin(BaseModel):
    username: str
    password: str


class PasswordResetRequest(BaseModel):
    username: str  # Or email


class PasswordReset(BaseModel):
    token: str
    new_password: str


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


class User(UserBase, OrmModel):
    id: int
    email: Optional[str] = None
    is_active: bool
    is_admin: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    employee_id: Optional[int] = None
    must_change_password: bool = False


# --------- OFFICE ---------
class OfficeBase(BaseModel):
    code: str
    name: str


class OfficeCreate(OfficeBase):
    pass


class Office(OfficeBase, OrmModel):
    id: int


# --------- EMPLOYEE ---------
class EmployeeBase(BaseModel):
    name: str
    email: Optional[str] = None  # Optional in responses (some employees might not have email yet)
    office_id: Optional[int] = None  # Deprecated: kept for backward compatibility, use office_ids instead
    office_ids: Optional[List[int]] = None  # List of office IDs (many-to-many relationship)
    website: Optional[str] = None
    role: Optional[str] = None  # Role: admin, manager, underwriter, partner


class EmployeeCreate(BaseModel):
    name: str
    email: str  # Required when creating, must be unique
    office_id: Optional[int] = None  # Deprecated: kept for backward compatibility, use office_ids instead
    office_ids: Optional[List[int]] = None  # List of office IDs to assign employee to
    website: Optional[str] = None
    role: Optional[str] = None  # Role: admin, manager, underwriter, partner
    password: Optional[str] = None  # Plain password for initial setup (will be hashed in User table)


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    office_id: Optional[int] = None  # Deprecated: kept for backward compatibility, use office_ids instead
    office_ids: Optional[List[int]] = None  # List of office IDs to assign employee to
    website: Optional[str] = None
    role: Optional[str] = None  # Role: admin, manager, underwriter, partner
    password: Optional[str] = None  # Plain password for update (will be hashed in User table)


class Employee(EmployeeBase, OrmModel):
    id: int
    # Note: password_hash, password_reset_token, password_reset_expires are now only in users table
    
    model_config = ConfigDict(from_attributes=True)
    
    def model_post_init(self, __context):
        """Populate office_ids from the offices relationship after ORM loading"""
        # This will be called after the model is created from ORM
        # office_ids should be populated by the router/CRUD layer
        pass


# --------- AGENCY ---------
class AgencyBase(BaseModel):
    name: str
    code: str
    office_id: Optional[int]
    web_address: Optional[str] = None
    notes: Optional[str] = None
    primary_underwriter_id: Optional[int] = None
    primary_underwriter: Optional[str] = None
    active_flag: Optional[str] = "Unknown"
    dba: Optional[str] = None
    email: Optional[str] = None


class AgencyCreate(AgencyBase):
    pass


class AgencyUpdate(BaseModel):
    name: Optional[str] = None
    office_id: Optional[int] = None
    web_address: Optional[str] = None
    notes: Optional[str] = None
    primary_underwriter_id: Optional[int] = None
    primary_underwriter: Optional[str] = None
    active_flag: Optional[str] = None
    dba: Optional[str] = None
    email: Optional[str] = None


class Agency(AgencyBase, OrmModel):
    id: int


# --------- CONTACT ---------
class ContactBase(BaseModel):
    name: str
    title: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    agency_id: int
    notes: Optional[str] = None
    linkedin_url: Optional[str] = None
    do_not_contact: Optional[bool] = False
    contact_frequency_days: Optional[int] = 90  # Days between contacts (30/60/90/120 or null for never)


class ContactCreate(ContactBase):
    pass


class Contact(ContactBase, OrmModel):
    id: int
    
    model_config = ConfigDict(from_attributes=True)
    
    @model_serializer
    def serialize(self):
        """Serialize ensuring do_not_contact is always included."""
        # Get all fields from parent classes
        result = {}
        
        # Include all ContactBase fields
        for field_name in ContactBase.model_fields:
            if hasattr(self, field_name):
                value = getattr(self, field_name)
                result[field_name] = value
        
        # Explicitly handle do_not_contact - check both attribute and __dict__
        if hasattr(self, 'do_not_contact'):
            result['do_not_contact'] = getattr(self, 'do_not_contact', False)
        elif hasattr(self, '__dict__') and 'do_not_contact' in self.__dict__:
            result['do_not_contact'] = self.__dict__['do_not_contact']
        else:
            result['do_not_contact'] = False
        
        # Ensure it's always a boolean
        if result.get('do_not_contact') is None:
            result['do_not_contact'] = False
        else:
            result['do_not_contact'] = bool(result['do_not_contact'])
        
        # Add id
        result['id'] = self.id
        
        return result


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    agency_id: Optional[int] = None
    notes: Optional[str] = None
    linkedin_url: Optional[str] = None
    do_not_contact: Optional[bool] = None
    contact_frequency_days: Optional[int] = None  # Days between contacts (30/60/90/120 or null for never)
    previous_agencies: Optional[str] = None
    likes_hobbies: Optional[str] = None
    additional_info: Optional[str] = None


# --------- LOG ---------
class LogBase(BaseModel):
    user: str
    datetime: datetime
    action: str
    agency_id: Optional[int] = None
    office: Optional[str] = None
    notes: Optional[str] = None
    contact_id: Optional[int] = None
    contact: Optional[str] = None


class LogCreate(LogBase):
    pass


class Log(LogBase, OrmModel):
    id: int


class LogUpdate(BaseModel):
    user: Optional[str] = None
    datetime: Optional[datetime] = None
    action: Optional[str] = None
    agency_id: Optional[int] = None
    office: Optional[str] = None
    notes: Optional[str] = None
    contact_id: Optional[int] = None
    contact: Optional[str] = None


# --------- TASK ---------
class TaskBase(BaseModel):
    title: str
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    notes: Optional[str] = None
    agency_id: Optional[int] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    notes: Optional[str] = None
    agency_id: Optional[int] = None


class Task(TaskBase, OrmModel):
    id: int


# --------- PRODUCTION ---------
class ProductionBase(BaseModel):
    office: str
    agency_code: str
    agency_name: str
    affiliated_code: Optional[str] = None
    active_flag: Optional[str] = None
    month: str  # "YYYY-MM"
    
    # Standard Lines
    standard_lines_ytd_wp: Optional[int] = None
    standard_lines_ytd_nb: Optional[int] = None
    standard_lines_pytd_wp: Optional[int] = None
    standard_lines_pytd_nb: Optional[int] = None
    
    # Surplus Lines
    surplus_lines_ytd_wp: Optional[int] = None
    surplus_lines_ytd_nb: Optional[int] = None
    surplus_lines_pytd_wp: Optional[int] = None
    surplus_lines_pytd_nb: Optional[int] = None
    
    # All Lines (keeping for backward compatibility)
    all_ytd_wp: Optional[int] = None
    all_ytd_nb: Optional[int] = None
    pytd_wp: Optional[int] = None
    pytd_nb: Optional[int] = None
    py_total_nb: Optional[int] = None
    
    # Additional metrics
    premium_change: Optional[int] = None
    three_year_plus: Optional[int] = None
    twelve_mo_bind_ratio: Optional[str] = None
    twelve_mo_bound: Optional[int] = None
    twelve_mo_quoted: Optional[int] = None
    twelve_mo_decline: Optional[int] = None


class ProductionCreate(ProductionBase):
    pass


class Production(ProductionBase, OrmModel):
    id: int


# Submission schemas
class SubmissionBase(BaseModel):
    effective_date: Optional[str] = None
    expiration_date: Optional[str] = None
    producer_name: Optional[str] = None
    producer_code: Optional[str] = None
    insured_name: Optional[str] = None
    additional_insured_names: Optional[str] = None
    
    agency_id: Optional[int] = None
    contact_id: Optional[int] = None
    
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    
    mailing_address: Optional[str] = None
    
    location_street_number: Optional[str] = None
    location_street_name: Optional[str] = None
    location_suite: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    location_zip: Optional[str] = None
    
    building_limit: Optional[str] = None
    deductible: Optional[str] = None
    additional_limits_rents: Optional[str] = None
    additional_limits_ordinance: Optional[str] = None
    additional_limits_demolition: Optional[str] = None
    additional_limits_eqsl: Optional[str] = None
    additional_insured: Optional[str] = None
    mortgagee: Optional[str] = None
    loss_payee: Optional[str] = None
    
    construction_type: Optional[str] = None
    construction_year: Optional[str] = None
    square_feet: Optional[str] = None
    sprinkler_percent: Optional[str] = None
    protection_class: Optional[str] = None
    
    line_of_business: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "pending"


class SubmissionCreate(SubmissionBase):
    original_filename: Optional[str] = None
    file_type: Optional[str] = None
    extracted_text: Optional[str] = None


class SubmissionUpdate(BaseModel):
    effective_date: Optional[str] = None
    expiration_date: Optional[str] = None
    producer_name: Optional[str] = None
    producer_code: Optional[str] = None
    insured_name: Optional[str] = None
    additional_insured_names: Optional[str] = None
    
    agency_id: Optional[int] = None
    contact_id: Optional[int] = None
    
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    
    mailing_address: Optional[str] = None
    
    location_street_number: Optional[str] = None
    location_street_name: Optional[str] = None
    location_suite: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    location_zip: Optional[str] = None
    
    building_limit: Optional[str] = None
    deductible: Optional[str] = None
    additional_limits_rents: Optional[str] = None
    additional_limits_ordinance: Optional[str] = None
    additional_limits_demolition: Optional[str] = None
    additional_limits_eqsl: Optional[str] = None
    additional_insured: Optional[str] = None
    mortgagee: Optional[str] = None
    loss_payee: Optional[str] = None
    
    construction_type: Optional[str] = None
    construction_year: Optional[str] = None
    square_feet: Optional[str] = None
    sprinkler_percent: Optional[str] = None
    protection_class: Optional[str] = None
    
    line_of_business: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class Submission(SubmissionBase, OrmModel):
    id: int
    created_at: str
    updated_at: Optional[str] = None
    original_filename: Optional[str] = None
    file_type: Optional[str] = None
    extracted_text: Optional[str] = None
    reviewed_by: Optional[str] = None


# AI Assistant schemas
class AIChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None
    history: Optional[List[dict]] = None


class AIChatResponse(BaseModel):
    answer: str
    used_context: Optional[dict] = None
    error: Optional[str] = None


# --------- EMAIL TEMPLATE ---------
class EmailTemplateBase(BaseModel):
    name: str
    subject: str
    body: str
    category: Optional[str] = None


class EmailTemplateCreate(EmailTemplateBase):
    pass


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    category: Optional[str] = None
    is_system_template: Optional[bool] = None


class EmailTemplate(EmailTemplateBase, OrmModel):
    id: int
    created_by_employee_id: Optional[int] = None
    is_system_template: bool
    created_at: datetime
    updated_at: datetime


class EmailTemplatePreview(BaseModel):
    """Request to preview an email template with variable replacement"""
    template_id: int
    recipient_email: str
    contact_id: Optional[int] = None
    agency_id: Optional[int] = None


class EmailTemplatePreviewResponse(BaseModel):
    """Response with the rendered email"""
    subject: str
    body: str


# --------- RENEWAL ---------
class RenewalBase(BaseModel):
    policy_number: str
    insured_name: str
    expiration_date: datetime
    producer: Optional[str] = None
    producer_code: Optional[str] = None
    status: str = "pending"  # pending, quoted, non-renewed, processed
    notes: Optional[str] = None
    premium: Optional[float] = None
    coverage_type: Optional[str] = None


class RenewalCreate(RenewalBase):
    pass


class RenewalUpdate(BaseModel):
    policy_number: Optional[str] = None
    insured_name: Optional[str] = None
    expiration_date: Optional[datetime] = None
    producer: Optional[str] = None
    producer_code: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    premium: Optional[float] = None
    coverage_type: Optional[str] = None


class Renewal(RenewalBase, OrmModel):
    id: int
    created_by_employee_id: int
    created_at: datetime
    updated_at: datetime


# --------- NEW BUSINESS ---------
class NewBusinessBase(BaseModel):
    contact_email: str
    policy_number: str
    product: str
    effective_date: datetime
    frequency_days: int = 7  # 1 = daily, 7 = weekly, 14 = bi-weekly
    status: str = "pending"  # pending, quoted, bound, declined
    notes: Optional[str] = None
    last_contact_date: Optional[datetime] = None
    contact_id: Optional[int] = None  # Track which contact submitted this


class NewBusinessCreate(NewBusinessBase):
    pass


class NewBusinessUpdate(BaseModel):
    contact_email: Optional[str] = None
    policy_number: Optional[str] = None
    product: Optional[str] = None
    effective_date: Optional[datetime] = None
    frequency_days: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    last_contact_date: Optional[datetime] = None
    contact_id: Optional[int] = None


class NewBusiness(NewBusinessBase, OrmModel):
    id: int
    created_by_employee_id: int
    created_at: datetime
    updated_at: datetime


# --------- AUDIT LOG ---------
class AuditLogBase(BaseModel):
    actor_email: str
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    office_id: Optional[int] = None
    details_json: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_path: Optional[str] = None
    request_method: Optional[str] = None


class AuditLog(AuditLogBase, OrmModel):
    id: int
    timestamp: datetime
    actor_employee_id: Optional[int] = None
