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
