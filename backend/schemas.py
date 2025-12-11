from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel, EmailStr, ConfigDict


class OrmModel(BaseModel):
    """Base model configured for ORM attribute access (Pydantic v2 style)."""

    model_config = ConfigDict(from_attributes=True)


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
    office_id: Optional[int]


class EmployeeCreate(EmployeeBase):
    pass


class Employee(EmployeeBase, OrmModel):
    id: int


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


class ContactCreate(ContactBase):
    pass


class Contact(ContactBase, OrmModel):
    id: int


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    agency_id: Optional[int] = None
    notes: Optional[str] = None
    linkedin_url: Optional[str] = None
    notes: Optional[str] = None
    linkedin_url: Optional[str] = None


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


# --------- EMPLOYEE ---------
class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    office_id: Optional[int] = None


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
    active_flag: Optional[str] = None
    month: str  # "YYYY-MM"
    all_ytd_wp: Optional[int] = None
    all_ytd_nb: Optional[int] = None
    pytd_wp: Optional[int] = None
    pytd_nb: Optional[int] = None
    py_total_nb: Optional[int] = None


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
