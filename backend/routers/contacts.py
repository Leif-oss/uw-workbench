from fastapi import APIRouter, Depends, Query, status, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import schemas, crud, models
from ..database import get_db
from ..auth.proxy_headers import (
    get_current_user,
    require_agency_access,
    require_authenticated,
)
from ..services.audit import log_audit_event, get_entity_snapshot

router = APIRouter(prefix="/contacts", tags=["contacts"])


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
    
    # Skip audit logging for VIEW actions to improve performance
    
    return contacts


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
