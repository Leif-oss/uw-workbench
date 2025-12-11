from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship

from .database import Base


class Office(Base):
    __tablename__ = "offices"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)

    employees = relationship("Employee", back_populates="office_rel", cascade="all, delete-orphan")
    agencies = relationship("Agency", back_populates="office_rel", cascade="all, delete-orphan")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    office_id = Column(Integer, ForeignKey("offices.id", ondelete="SET NULL"))

    office_rel = relationship("Office", back_populates="employees")
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
    active_flag = Column(String(50), nullable=True)
    month = Column(String(7), nullable=False)  # YYYY-MM
    all_ytd_wp = Column(Integer, nullable=True)
    all_ytd_nb = Column(Integer, nullable=True)
    pytd_wp = Column(Integer, nullable=True)
    pytd_nb = Column(Integer, nullable=True)
    py_total_nb = Column(Integer, nullable=True)


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
