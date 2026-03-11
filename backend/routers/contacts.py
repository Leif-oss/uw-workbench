from fastapi import APIRouter, Depends, Query, status, HTTPException, Request, Response
from sqlalchemy.orm import Session
from typing import List, Optional
import io
import pandas as pd
from datetime import datetime

from .. import schemas, crud, models
from ..database import get_db
from ..auth.proxy_headers import (
    get_current_user,
    require_agency_access,
    require_authenticated,
)
from ..services.audit import log_audit_event, get_entity_snapshot

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("/export/office/{office_id}")
def export_office_contacts_excel(
    office_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export all contacts for agencies in an office as Excel file."""
    require_authenticated(user)
    
    # Get office
    office = db.query(models.Office).filter(models.Office.id == office_id).first()
    if not office:
        raise HTTPException(status_code=404, detail="Office not found")
    
    # Get all agencies for this office
    agencies = db.query(models.Agency).filter(models.Agency.office_id == office_id).all()
    agency_ids = [a.id for a in agencies]
    
    if not agency_ids:
        raise HTTPException(status_code=404, detail="No agencies found for this office")
    
    # Get all contacts for these agencies
    contacts = db.query(models.Contact).filter(models.Contact.agency_id.in_(agency_ids)).all()
    
    if not contacts:
        raise HTTPException(status_code=404, detail="No contacts found for this office")
    
    # Create DataFrame
    data = []
    for contact in contacts:
        # Get agency name
        agency = next((a for a in agencies if a.id == contact.agency_id), None)
        agency_name = agency.name if agency else "Unknown"
        agency_code = agency.code if agency else ""
        
        data.append({
            "Agency Code": agency_code,
            "Agency Name": agency_name,
            "Contact Name": contact.name or "",
            "Title": contact.title or "",
            "Email": contact.email or "",
            "Phone": contact.phone or "",
            "LinkedIn": contact.linkedin_url or "",
            "Do Not Contact": "Yes" if contact.do_not_contact else "No",
            "Notes": contact.notes or "",
        })
    
    df = pd.DataFrame(data)
    
    # Create Excel file in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Contacts', index=False)
    
    output.seek(0)
    
    # Generate filename
    office_name = office.name.replace(" ", "_").replace("/", "_")
    filename = f"{office.code}_{office_name}_contacts_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return Response(
        content=output.read(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/export/agency/{agency_id}")
def export_agency_contacts_excel(
    agency_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export all contacts for an agency as Excel file."""
    require_authenticated(user)
    
    # Get agency
    agency = db.query(models.Agency).filter(models.Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Get all contacts for this agency
    contacts = db.query(models.Contact).filter(models.Contact.agency_id == agency_id).all()
    
    if not contacts:
        raise HTTPException(status_code=404, detail="No contacts found for this agency")
    
    # Create DataFrame
    data = []
    for contact in contacts:
        data.append({
            "Contact Name": contact.name or "",
            "Title": contact.title or "",
            "Email": contact.email or "",
            "Phone": contact.phone or "",
            "LinkedIn": contact.linkedin_url or "",
            "Do Not Contact": "Yes" if contact.do_not_contact else "No",
            "Notes": contact.notes or "",
        })
    
    df = pd.DataFrame(data)
    
    # Create Excel file in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Contacts', index=False)
    
    output.seek(0)
    
    # Generate filename
    agency_name = agency.name.replace(" ", "_").replace("/", "_")
    filename = f"{agency.code or 'AGENCY'}_{agency_name}_contacts_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return Response(
        content=output.read(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/export/my-contacts")
def export_my_contacts_excel(
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export all contacts that the current user has access to (based on their office assignments)."""
    require_authenticated(user)
    
    # Get user's office IDs
    user_office_ids = user.get("office_ids", [])
    # Backward compatibility: if office_ids not available, use office_id
    if not user_office_ids:
        user_office_id = user.get("office_id")
        if user_office_id:
            user_office_ids = [user_office_id]
    
    # Admin can see all contacts
    if "admin" in user.get("groups", []):
        # Get all agencies
        agencies = db.query(models.Agency).all()
    else:
        # Non-admin: only get agencies from their offices
        if not user_office_ids:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to any office. Cannot export contacts."
            )
        agencies = db.query(models.Agency).filter(models.Agency.office_id.in_(user_office_ids)).all()
    
    if not agencies:
        raise HTTPException(status_code=404, detail="No agencies found for your office assignments")
    
    agency_ids = [a.id for a in agencies]
    
    # Get all contacts for these agencies
    contacts = db.query(models.Contact).filter(models.Contact.agency_id.in_(agency_ids)).all()
    
    if not contacts:
        raise HTTPException(status_code=404, detail="No contacts found")
    
    # Create DataFrame with office and agency info
    data = []
    for contact in contacts:
        # Find the agency for this contact
        agency = next((a for a in agencies if a.id == contact.agency_id), None)
        agency_name = agency.name if agency else "Unknown"
        agency_code = agency.code if agency else ""
        
        # Get office info
        office_name = ""
        office_code = ""
        if agency and agency.office_id:
            office = db.query(models.Office).filter(models.Office.id == agency.office_id).first()
            if office:
                office_name = office.name
                office_code = office.code
        
        data.append({
            "Office Code": office_code,
            "Office Name": office_name,
            "Agency Code": agency_code,
            "Agency Name": agency_name,
            "Contact Name": contact.name or "",
            "Title": contact.title or "",
            "Email": contact.email or "",
            "Phone": contact.phone or "",
            "LinkedIn": contact.linkedin_url or "",
            "Do Not Contact": "Yes" if contact.do_not_contact else "No",
            "Contact Frequency (Days)": contact.contact_frequency_days or "",
            "Notes": contact.notes or "",
        })
    
    df = pd.DataFrame(data)
    
    # Create Excel file in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='My Contacts', index=False)
    
    output.seek(0)
    
    # Generate filename
    user_email = user.get("email", "user").split("@")[0]
    filename = f"my_contacts_{user_email}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return Response(
        content=output.read(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("", response_model=List[schemas.Contact])
def read_contacts(
    request: Request,
    agency_id: Optional[int] = Query(None),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get contacts. All employees can view all contacts."""
    require_authenticated(user)
    
    # All users can view all contacts (no filtering)
    if agency_id:
        contacts = crud.get_contacts(db, agency_id=agency_id)
    else:
        contacts = crud.get_contacts(db)
    
    # Debug: Log do_not_contact values to verify they're loaded
    import logging
    logger = logging.getLogger("uvicorn.error")
    for contact in contacts[:3]:  # Log first 3 contacts
        logger.info(f"[CONTACT GET] Contact {contact.id} ({contact.name}) - do_not_contact: {getattr(contact, 'do_not_contact', 'NOT FOUND')} (type: {type(getattr(contact, 'do_not_contact', None))}, hasattr: {hasattr(contact, 'do_not_contact')})")
        # Also log raw attribute access
        if hasattr(contact, '__dict__'):
            logger.info(f"[CONTACT GET] Contact {contact.id} __dict__ keys: {list(contact.__dict__.keys())}")
            if 'do_not_contact' in contact.__dict__:
                logger.info(f"[CONTACT GET] Contact {contact.id} __dict__['do_not_contact']: {contact.__dict__['do_not_contact']}")
    
    # Skip audit logging for VIEW actions to improve performance
    
    return contacts


@router.get("/{contact_id}/new-business-count")
def get_contact_new_business_count(
    contact_id: int,
    months: int = Query(12, description="Number of months to look back"),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Get count of new business items submitted by a contact in the last N months"""
    require_authenticated(user)
    
    # Verify contact exists
    contact = crud.get_contact(db, contact_id)
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    
    count = crud.get_new_business_count_for_contact(db, contact_id, months)
    return {"contact_id": contact_id, "count": count, "months": months}


@router.get("/{contact_id}", response_model=schemas.Contact)
def read_contact(
    contact_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific contact. All employees can view all contacts."""
    require_authenticated(user)
    
    contact = crud.get_contact(db, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # No office check needed for viewing - all users can view all contacts
    
    # Skip audit logging for VIEW actions to improve performance
    
    return contact


@router.post("", response_model=schemas.Contact, status_code=status.HTTP_201_CREATED)
def create_contact(
    contact: schemas.ContactCreate,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a contact. Non-admin users can only create contacts for agencies in their office."""
    require_authenticated(user)
    require_agency_access(user, contact.agency_id, db, for_modification=True)
    
    # Debug: Log what we're receiving
    import logging
    logger = logging.getLogger("uvicorn.error")
    logger.info(f"[CONTACT CREATE] Received contact data - do_not_contact: {contact.do_not_contact}")
    logger.info(f"[CONTACT CREATE] Contact model_dump: {contact.model_dump()}")
    logger.info(f"[CONTACT CREATE] Contact model_dump (exclude_unset=False): {contact.model_dump(exclude_unset=False)}")
    
    new_contact = crud.create_contact(db, contact)
    
    # Log create action
    if request:
        agency = db.get(models.Agency, contact.agency_id)
        log_audit_event(
            actor_email=user["email"],
            action="CREATE",
            entity_type="contact",
            entity_id=new_contact.id,
            office_id=agency.office_id if agency else None,
            actor_employee_id=user.get("employee_id"),
            details={"created": get_entity_snapshot(new_contact)},
            request_path=str(request.url.path),
            request_method="POST",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            db=db,
        )
    
    return new_contact


@router.put("/{contact_id}", response_model=schemas.Contact)
def update_contact(
    contact_id: int,
    payload: schemas.ContactUpdate,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a contact. Non-admin users can only update contacts for agencies in their office."""
    require_authenticated(user)
    
    existing_contact = crud.get_contact(db, contact_id)
    if not existing_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    require_agency_access(user, existing_contact.agency_id, db, for_modification=True)
    
    before_snapshot = get_entity_snapshot(existing_contact)
    updated = crud.update_contact(db, contact_id, payload)
    
    # Ensure the contact is fully refreshed from the database
    db.refresh(updated)
    
    # Debug: Log the actual database value
    import logging
    logger = logging.getLogger("uvicorn.error")
    logger.info(f"[CONTACT UPDATE] Contact {contact_id} - do_not_contact in DB: {updated.do_not_contact}")
    logger.info(f"[CONTACT UPDATE] Contact {contact_id} - do_not_contact type: {type(updated.do_not_contact)}")
    logger.info(f"[CONTACT UPDATE] Contact {contact_id} - hasattr do_not_contact: {hasattr(updated, 'do_not_contact')}")
    logger.info(f"[CONTACT UPDATE] Contact {contact_id} - __dict__ keys: {list(updated.__dict__.keys())}")
    # Check if it's in the dict
    if hasattr(updated, '__dict__'):
        logger.info(f"[CONTACT UPDATE] Contact {contact_id} - __dict__['do_not_contact']: {updated.__dict__.get('do_not_contact', 'NOT IN DICT')}")
    
    # Log update action
    if request:
        agency = db.get(models.Agency, existing_contact.agency_id)
        log_audit_event(
            actor_email=user["email"],
            action="UPDATE",
            entity_type="contact",
            entity_id=contact_id,
            office_id=agency.office_id if agency else None,
            actor_employee_id=user.get("employee_id"),
            details={
                "before": before_snapshot,
                "after": get_entity_snapshot(updated),
            },
            request_path=str(request.url.path),
            request_method="PUT",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            db=db,
        )
    
    return updated


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a contact. Non-admin users can only delete contacts for agencies in their office."""
    require_authenticated(user)
    
    contact = crud.get_contact(db, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    require_agency_access(user, contact.agency_id, db, for_modification=True)
    
    agency = db.get(models.Agency, contact.agency_id)
    contact_snapshot = get_entity_snapshot(contact)
    
    deleted = crud.delete_contact(db, contact_id)
    
    # Log delete action
    if request:
        log_audit_event(
            actor_email=user["email"],
            action="DELETE",
            entity_type="contact",
            entity_id=contact_id,
            office_id=agency.office_id if agency else None,
            actor_employee_id=user.get("employee_id"),
            details={"deleted": contact_snapshot},
            request_path=str(request.url.path),
            request_method="DELETE",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            db=db,
        )
    
    return deleted
