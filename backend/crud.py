from typing import List, Optional
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, update, delete

from . import models, schemas


# Offices
def get_offices(db: Session) -> List[models.Office]:
    return db.execute(select(models.Office)).scalars().all()


def create_office(db: Session, office: schemas.OfficeCreate) -> models.Office:
    db_office = models.Office(code=office.code, name=office.name)
    db.add(db_office)
    db.commit()
    db.refresh(db_office)
    return db_office


# Employees
def create_employee(db: Session, emp: schemas.EmployeeCreate) -> models.Employee:
    db_emp = models.Employee(**emp.dict())
    db.add(db_emp)
    db.commit()
    db.refresh(db_emp)
    return db_emp


def get_employees(db: Session, office: Optional[str] = None) -> List[models.Employee]:
    stmt = select(models.Employee)
    if office:
        stmt = stmt.join(models.Office).where(models.Office.code == office)
    return db.execute(stmt).scalars().all()


def update_employee(db: Session, emp_id: int, payload: schemas.EmployeeUpdate) -> Optional[models.Employee]:
    db_emp = db.get(models.Employee, emp_id)
    if not db_emp:
        return None
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(db_emp, field, value)
    db.commit()
    db.refresh(db_emp)
    return db_emp


# Agencies
def get_agencies(db: Session, office: Optional[str] = None) -> List[models.Agency]:
    stmt = select(models.Agency).options(selectinload(models.Agency.underwriter_rel))
    if office:
        stmt = stmt.join(models.Office).where(models.Office.code == office)
    agencies = db.execute(stmt).scalars().all()
    # Attach friendly underwriter name for schema serialization; prefer linked employee, otherwise keep stored value
    for ag in agencies:
        if ag.underwriter_rel and ag.underwriter_rel.name:
            ag.primary_underwriter = ag.underwriter_rel.name
    return agencies


def create_agency(db: Session, ag: schemas.AgencyCreate) -> models.Agency:
    underwriter_name = None
    if ag.primary_underwriter_id:
        uw = db.get(models.Employee, ag.primary_underwriter_id)
        underwriter_name = uw.name if uw else None
    if not underwriter_name:
        underwriter_name = ag.primary_underwriter

    db_ag = models.Agency(**ag.dict(), primary_underwriter=underwriter_name)
    db.add(db_ag)
    db.commit()
    db.refresh(db_ag)
    if db_ag.underwriter_rel and db_ag.underwriter_rel.name:
        db_ag.primary_underwriter = db_ag.underwriter_rel.name
        db.commit()
        db.refresh(db_ag)
    return db_ag


def update_agency(db: Session, agency_id: int, payload: schemas.AgencyUpdate) -> Optional[models.Agency]:
    db_ag = db.get(models.Agency, agency_id)
    if not db_ag:
        return None

    data = payload.dict(exclude_unset=True)
    # Resolve underwriter name if id provided
    if "primary_underwriter_id" in data:
        uw_id = data.get("primary_underwriter_id")
        uw = db.get(models.Employee, uw_id) if uw_id else None
        data["primary_underwriter"] = uw.name if uw else data.get("primary_underwriter")
    # Apply fields
    for field, value in data.items():
        setattr(db_ag, field, value)
    db.commit()
    db.refresh(db_ag)
    return db_ag


# Contacts
def get_contacts(db: Session, agency_id: Optional[int] = None) -> List[models.Contact]:
    stmt = select(models.Contact)
    if agency_id:
        stmt = stmt.where(models.Contact.agency_id == agency_id)
    return db.execute(stmt).scalars().all()


def create_contact(db: Session, contact: schemas.ContactCreate) -> models.Contact:
    db_contact = models.Contact(**contact.dict())
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact


def update_contact(db: Session, contact_id: int, payload: schemas.ContactUpdate) -> Optional[models.Contact]:
    db_ct = db.get(models.Contact, contact_id)
    if not db_ct:
        return None
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(db_ct, field, value)
    db.commit()
    db.refresh(db_ct)
    return db_ct


def delete_contact(db: Session, contact_id: int) -> bool:
    db_ct = db.get(models.Contact, contact_id)
    if not db_ct:
        return False
    db.delete(db_ct)
    db.commit()
    return True


# Logs
def get_logs(db: Session, agency_id: Optional[int] = None) -> List[models.Log]:
    stmt = select(models.Log)
    if agency_id:
        stmt = stmt.where(models.Log.agency_id == agency_id)
    return db.execute(stmt).scalars().all()


def create_log(db: Session, log: schemas.LogCreate) -> models.Log:
    db_log = models.Log(**log.dict())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


def update_log(db: Session, log_id: int, payload: schemas.LogUpdate) -> Optional[models.Log]:
    db_log = db.get(models.Log, log_id)
    if not db_log:
        return None
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(db_log, field, value)
    db.commit()
    db.refresh(db_log)
    return db_log


def delete_log(db: Session, log_id: int) -> bool:
    db_log = db.get(models.Log, log_id)
    if not db_log:
        return False
    db.delete(db_log)
    db.commit()
    return True


# Tasks
def get_tasks(db: Session, agency_id: Optional[int] = None) -> List[models.Task]:
    stmt = select(models.Task)
    if agency_id:
        stmt = stmt.where(models.Task.agency_id == agency_id)
    return db.execute(stmt).scalars().all()


def create_task(db: Session, task: schemas.TaskCreate) -> models.Task:
    db_task = models.Task(**task.dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def update_task(db: Session, task_id: int, payload: schemas.TaskUpdate) -> Optional[models.Task]:
    db_task = db.get(models.Task, task_id)
    if not db_task:
        return None
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(db_task, field, value)
    db.commit()
    db.refresh(db_task)
    return db_task


def delete_task(db: Session, task_id: int) -> bool:
    db_task = db.get(models.Task, task_id)
    if not db_task:
        return False
    db.delete(db_task)
    db.commit()
    return True


# Production
def get_production(db: Session, office: Optional[str] = None, agency_code: Optional[str] = None) -> List[models.Production]:
    stmt = select(models.Production)
    if office:
        stmt = stmt.where(models.Production.office == office)
    if agency_code:
        stmt = stmt.where(models.Production.agency_code == agency_code)
    return db.execute(stmt).scalars().all()


def create_production(db: Session, payload: schemas.ProductionCreate) -> models.Production:
    db_prod = models.Production(**payload.dict())
    db.add(db_prod)
    db.commit()
    db.refresh(db_prod)
    return db_prod


def bulk_upsert_production(db: Session, rows: List[schemas.ProductionCreate]) -> int:
    """
    Insert production rows; if a (agency_code, month) pair exists, replace it.
    Returns number of rows written.
    """
    count = 0
    for payload in rows:
        stmt = (
            select(models.Production)
            .where(models.Production.agency_code == payload.agency_code)
            .where(models.Production.month == payload.month)
        )
        existing = db.execute(stmt).scalar_one_or_none()
        if existing:
            existing.office = payload.office
            existing.agency_name = payload.agency_name
            existing.active_flag = payload.active_flag
            existing.all_ytd_wp = payload.all_ytd_wp
            existing.all_ytd_nb = payload.all_ytd_nb
            existing.pytd_wp = payload.pytd_wp
            existing.pytd_nb = payload.pytd_nb
            existing.py_total_nb = payload.py_total_nb
        else:
            db.add(models.Production(**payload.dict()))
        count += 1
    db.commit()
    return count
