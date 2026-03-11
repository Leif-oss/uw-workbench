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
    emp_data = emp.model_dump(exclude={"password", "office_ids", "office_id"})
    
    # Handle office assignments (many-to-many)
    office_ids = emp.office_ids or []
    # Backward compatibility: if office_id is provided but office_ids is not, use office_id
    if not office_ids and emp.office_id:
        office_ids = [emp.office_id]
    
    # Note: password handling is now done in the router (User table), not here
    
    db_emp = models.Employee(**emp_data)
    db.add(db_emp)
    db.flush()  # Flush to get the ID before setting relationships
    
    # Assign offices (many-to-many)
    if office_ids:
        offices = db.query(models.Office).filter(models.Office.id.in_(office_ids)).all()
        db_emp.offices = offices
    
    db.commit()
    db.refresh(db_emp)
    # Eager load offices relationship for serialization
    db.refresh(db_emp, ["offices"])
    return db_emp


def get_employees(db: Session, office: Optional[str] = None) -> List[models.Employee]:
    stmt = select(models.Employee).options(selectinload(models.Employee.offices))
    if office:
        # Filter by office code through the many-to-many relationship
        stmt = stmt.join(models.employee_offices).join(models.Office).where(models.Office.code == office)
    employees = db.execute(stmt).unique().scalars().all()
    return list(employees)


def update_employee(db: Session, emp_id: int, payload: schemas.EmployeeUpdate) -> Optional[models.Employee]:
    db_emp = db.get(models.Employee, emp_id)
    if not db_emp:
        return None
    
    # Use exclude_none=False to ensure null values are included in updates
    # This allows clearing fields by setting them to None
    update_data = payload.model_dump(exclude_unset=True, exclude_none=False, exclude={"password", "office_ids", "office_id"})
    
    # Note: password handling is now done in the router (User table), not here
    
    # Update basic fields
    for field, value in update_data.items():
        setattr(db_emp, field, value)
    
    # Handle office assignments (many-to-many)
    if "office_ids" in payload.model_dump(exclude_unset=True):
        office_ids = payload.office_ids or []
        # Backward compatibility: if office_id is provided but office_ids is not, use office_id
        if not office_ids and payload.office_id is not None:
            office_ids = [payload.office_id] if payload.office_id else []
        
        # Update office assignments
        if office_ids:
            offices = db.query(models.Office).filter(models.Office.id.in_(office_ids)).all()
            db_emp.offices = offices
            # Sync legacy office_id field for backward compatibility (use first office)
            if offices:
                db_emp.office_id = offices[0].id
            else:
                db_emp.office_id = None
        else:
            # Clear all office assignments
            db_emp.offices = []
            # Also clear legacy office_id field
            db_emp.office_id = None
    # Also handle legacy office_id field if it's being updated directly
    elif "office_id" in payload.model_dump(exclude_unset=True):
        office_id = payload.office_id
        if office_id:
            # Update both legacy field and many-to-many relationship
            db_emp.office_id = office_id
            office = db.query(models.Office).filter(models.Office.id == office_id).first()
            if office:
                db_emp.offices = [office]
        else:
            # Clear both
            db_emp.office_id = None
            db_emp.offices = []
    
    db.commit()
    db.refresh(db_emp)
    # Eager load offices relationship for serialization
    db.refresh(db_emp, ["offices"])
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

    db_ag = models.Agency(**ag.model_dump(), primary_underwriter=underwriter_name)
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

    data = payload.model_dump(exclude_unset=True)
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


def get_contact(db: Session, contact_id: int) -> Optional[models.Contact]:
    return db.get(models.Contact, contact_id)


def create_contact(db: Session, contact: schemas.ContactCreate) -> models.Contact:
    # Get all fields
    contact_data = contact.model_dump()
    
    # Synchronize do_not_contact with contact_frequency_days for backward compatibility
    # If contact_frequency_days is None (never), set do_not_contact to True
    # Otherwise, set do_not_contact to False
    if contact_data.get('contact_frequency_days') is None:
        contact_data['do_not_contact'] = True
    else:
        contact_data['do_not_contact'] = False
    
    db_contact = models.Contact(**contact_data)
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact


def update_contact(db: Session, contact_id: int, payload: schemas.ContactUpdate) -> Optional[models.Contact]:
    db_ct = db.get(models.Contact, contact_id)
    if not db_ct:
        return None
    # Get all fields from payload
    update_data = payload.model_dump(exclude_unset=True)
    
    # Synchronize do_not_contact with contact_frequency_days for backward compatibility
    # Always ensure do_not_contact is set to a boolean value (NOT NULL constraint)
    if 'contact_frequency_days' in update_data:
        # If contact_frequency_days is None (never), set do_not_contact to True
        # Otherwise, set do_not_contact to False
        if update_data['contact_frequency_days'] is None:
            update_data['do_not_contact'] = True
        else:
            update_data['do_not_contact'] = False
    elif 'do_not_contact' in update_data and update_data['do_not_contact'] is None:
        # If do_not_contact is explicitly None (shouldn't happen, but handle it), remove it
        # to avoid NOT NULL constraint violation
        del update_data['do_not_contact']
    
    # Apply all updates
    for field, value in update_data.items():
        # Skip None values for NOT NULL fields (shouldn't happen, but be safe)
        if value is None and field == 'do_not_contact':
            continue
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
    db_log = models.Log(**log.model_dump())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


def update_log(db: Session, log_id: int, payload: schemas.LogUpdate) -> Optional[models.Log]:
    db_log = db.get(models.Log, log_id)
    if not db_log:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
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
    db_task = models.Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def update_task(db: Session, task_id: int, payload: schemas.TaskUpdate) -> Optional[models.Task]:
    db_task = db.get(models.Task, task_id)
    if not db_task:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
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
    db_prod = models.Production(**payload.model_dump())
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
            db.add(models.Production(**payload.model_dump()))
        count += 1
    db.commit()
    return count


# Email Templates
def get_email_templates(db: Session, category: Optional[str] = None, employee_id: Optional[int] = None) -> List[models.EmailTemplate]:
    """Get email templates. If employee_id is provided, include user templates for that employee."""
    query = db.query(models.EmailTemplate)
    
    if category:
        query = query.filter(models.EmailTemplate.category == category)
    
    # Include system templates and templates created by the employee
    if employee_id:
        query = query.filter(
            (models.EmailTemplate.is_system_template == True) |
            (models.EmailTemplate.created_by_employee_id == employee_id)
        )
    else:
        # If no employee_id, only show system templates
        query = query.filter(models.EmailTemplate.is_system_template == True)
    
    return query.order_by(models.EmailTemplate.category, models.EmailTemplate.name).all()


def get_email_template(db: Session, template_id: int) -> Optional[models.EmailTemplate]:
    return db.get(models.EmailTemplate, template_id)


def create_email_template(db: Session, template: schemas.EmailTemplateCreate, employee_id: Optional[int] = None, is_system_template: bool = False) -> models.EmailTemplate:
    db_template = models.EmailTemplate(
        name=template.name,
        subject=template.subject,
        body=template.body,
        category=template.category,
        created_by_employee_id=employee_id,
        is_system_template=is_system_template,
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


def update_email_template(db: Session, template_id: int, payload: schemas.EmailTemplateUpdate) -> Optional[models.EmailTemplate]:
    db_template = db.get(models.EmailTemplate, template_id)
    if not db_template:
        return None
    
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_template, field, value)
    
    # Update the updated_at timestamp
    from datetime import datetime
    db_template.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_template)
    return db_template


def delete_email_template(db: Session, template_id: int) -> bool:
    template = db.execute(select(models.EmailTemplate).where(models.EmailTemplate.id == template_id)).scalar_one_or_none()
    if not template:
        return False
    db.delete(template)
    db.commit()
    return True


# Renewals
def get_renewals(db: Session, employee_id: Optional[int] = None, status: Optional[str] = None) -> List[models.Renewal]:
    query = select(models.Renewal)
    if employee_id:
        query = query.where(models.Renewal.created_by_employee_id == employee_id)
    if status:
        query = query.where(models.Renewal.status == status)
    query = query.order_by(models.Renewal.expiration_date.asc())
    return db.execute(query).scalars().all()


def get_renewal(db: Session, renewal_id: int) -> Optional[models.Renewal]:
    return db.execute(select(models.Renewal).where(models.Renewal.id == renewal_id)).scalar_one_or_none()


def create_renewal(db: Session, renewal: schemas.RenewalCreate, employee_id: int) -> models.Renewal:
    db_renewal = models.Renewal(
        **renewal.model_dump(),
        created_by_employee_id=employee_id
    )
    db.add(db_renewal)
    db.commit()
    db.refresh(db_renewal)
    return db_renewal


def update_renewal(db: Session, renewal_id: int, payload: schemas.RenewalUpdate) -> Optional[models.Renewal]:
    renewal = db.execute(select(models.Renewal).where(models.Renewal.id == renewal_id)).scalar_one_or_none()
    if not renewal:
        return None
    
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(renewal, field, value)
    
    db.commit()
    db.refresh(renewal)
    return renewal


def delete_renewal(db: Session, renewal_id: int) -> bool:
    renewal = db.execute(select(models.Renewal).where(models.Renewal.id == renewal_id)).scalar_one_or_none()
    if not renewal:
        return False
    db.delete(renewal)
    db.commit()
    return True


# New Business
def get_new_business(db: Session, employee_id: Optional[int] = None, status: Optional[str] = None) -> List[models.NewBusiness]:
    from datetime import datetime, timedelta
    
    query = select(models.NewBusiness)
    if employee_id:
        query = query.where(models.NewBusiness.created_by_employee_id == employee_id)
    if status:
        query = query.where(models.NewBusiness.status == status)
    
    # Filter to only show items that should appear today based on frequency
    all_items = db.execute(query).scalars().all()
    today = datetime.utcnow().date()
    
    filtered_items = []
    for item in all_items:
        effective_date = item.effective_date.date() if isinstance(item.effective_date, datetime) else item.effective_date
        days_since_effective = (today - effective_date).days
        
        # Show items that are due today or in the future
        # Frequency determines when to show recurring items, but we always show upcoming items
        if days_since_effective < 0:
            # Future date - always show upcoming items
            should_show = True
        elif days_since_effective == 0:
            # Today is the effective date - always show
            should_show = True
        else:
            # Past date - show based on frequency
            if item.frequency_days == 1:
                # Daily - show every day
                should_show = True
            elif item.frequency_days == 7:
                # Weekly - show every 7 days
                should_show = days_since_effective % 7 == 0
            elif item.frequency_days == 14:
                # Bi-weekly - show every 14 days
                should_show = days_since_effective % 14 == 0
            else:
                # Default to weekly behavior
                should_show = days_since_effective % item.frequency_days == 0
        
        if should_show:
            filtered_items.append(item)
    
    return filtered_items


def get_new_business_item(db: Session, new_business_id: int) -> Optional[models.NewBusiness]:
    return db.execute(select(models.NewBusiness).where(models.NewBusiness.id == new_business_id)).scalar_one_or_none()


def create_new_business(db: Session, new_business: schemas.NewBusinessCreate, employee_id: int) -> models.NewBusiness:
    db_new_business = models.NewBusiness(
        **new_business.model_dump(),
        created_by_employee_id=employee_id
    )
    db.add(db_new_business)
    db.commit()
    db.refresh(db_new_business)
    return db_new_business


def update_new_business(db: Session, new_business_id: int, payload: schemas.NewBusinessUpdate) -> Optional[models.NewBusiness]:
    new_business = db.execute(select(models.NewBusiness).where(models.NewBusiness.id == new_business_id)).scalar_one_or_none()
    if not new_business:
        return None
    
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(new_business, field, value)
    
    new_business.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(new_business)
    return new_business


def delete_new_business(db: Session, new_business_id: int) -> bool:
    new_business = db.execute(select(models.NewBusiness).where(models.NewBusiness.id == new_business_id)).scalar_one_or_none()
    if not new_business:
        return False
    db.delete(new_business)
    db.commit()
    return True


def get_contacts_due_for_contact(db: Session, employee_id: int) -> List[dict]:
    """
    Get contacts that are due for contact based on their contact_frequency_days and last contact date.
    Returns contacts where next_contact_date <= today.
    Only returns contacts from agencies in the employee's assigned offices.
    """
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    # Get the employee and their office assignments
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        return []
    
    # Get office IDs for this employee (from many-to-many relationship)
    office_ids = []
    if hasattr(employee, 'offices') and employee.offices:
        office_ids = [office.id for office in employee.offices]
    elif hasattr(employee, 'office_id') and employee.office_id:
        # Backward compatibility: if only office_id is set, use it
        office_ids = [employee.office_id]
    
    if not office_ids:
        # Employee has no office assignments, return empty list
        return []
    
    # Get contacts for agencies in the employee's assigned offices only
    contacts = db.query(models.Contact).join(models.Agency).filter(
        models.Contact.do_not_contact == False,
        models.Contact.contact_frequency_days.isnot(None),
        models.Agency.office_id.in_(office_ids)
    ).all()
    
    contacts_due = []
    today = datetime.utcnow().date()
    
    for contact in contacts:
        # Find the most recent log entry for this contact
        last_log = db.query(models.Log).filter(
            models.Log.contact_id == contact.id
        ).order_by(models.Log.datetime.desc()).first()
        
        # Calculate next contact date
        if last_log:
            last_contact_date = last_log.datetime.date()
            next_contact_date = last_contact_date + timedelta(days=contact.contact_frequency_days)
        else:
            # Never contacted - set next contact date to today (due immediately)
            next_contact_date = today
        
        # Only include if due today or past due
        if next_contact_date <= today:
            contacts_due.append({
                "contact_id": contact.id,
                "contact_name": contact.name,
                "contact_email": contact.email,
                "contact_phone": contact.phone,
                "contact_title": contact.title,
                "agency_id": contact.agency_id,
                "agency_name": contact.agency.name if contact.agency else None,
                "next_contact_date": next_contact_date.isoformat(),
                "last_contact_date": last_log.datetime.date().isoformat() if last_log else None,
                "contact_frequency_days": contact.contact_frequency_days,
            })
    
    return contacts_due
