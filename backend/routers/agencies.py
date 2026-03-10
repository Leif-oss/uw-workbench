from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas
from ..auth.proxy_headers import (
    get_current_user,
    require_agency_access,
    require_office_access,
    require_authenticated,
)
from ..services.audit import log_audit_event, get_entity_snapshot

router = APIRouter(
    prefix="/agencies",
    tags=["agencies"]
)

@router.get("", response_model=List[schemas.Agency])
def get_agencies(
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all agencies. All authenticated users can view all agencies."""
    require_authenticated(user)
    
    # All users can see all agencies - no filtering for viewing
    agencies = db.query(models.Agency).all()
    
    # Skip audit logging for VIEW actions to improve performance
    # Only log CREATE, UPDATE, DELETE operations
    
    return agencies

@router.get("/{agency_id}", response_model=schemas.Agency)
def get_agency(
    agency_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific agency. All employees can view all agencies."""
    require_authenticated(user)
    # No office check needed for viewing - all users can view all agencies
    
    agency = db.query(models.Agency).filter(models.Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Skip audit logging for VIEW actions to improve performance
    
    return agency

@router.post("", response_model=schemas.Agency)
def create_agency(
    agency: schemas.AgencyCreate,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new agency. Non-admin users can only create agencies in their office."""
    require_authenticated(user)
    
    # Enforce office_id matches user's office assignments (unless admin)
    user_office_ids = user.get("office_ids", [])
    # Backward compatibility: if office_ids not available, use office_id
    if not user_office_ids:
        user_office_id = user.get("office_id")
        if user_office_id:
            user_office_ids = [user_office_id]
    
    agency_data = agency.model_dump()
    
    if "admin" not in user.get("groups", []):
        if not user_office_ids:
            raise HTTPException(
                status_code=403,
                detail="User not associated with an office. Cannot create agencies."
            )
        # Check if user is trying to create in one of their assigned offices
        if agency_data.get("office_id") not in user_office_ids:
            raise HTTPException(
                status_code=403,
                detail="You can only create agencies in your assigned office"
            )
    else:
        # Admin can set any office, but validate it exists
        if agency_data.get("office_id"):
            office = db.get(models.Office, agency_data["office_id"])
            if not office:
                raise HTTPException(status_code=404, detail="Office not found")
    
    new_agency = models.Agency(**agency_data)
    db.add(new_agency)
    db.commit()
    db.refresh(new_agency)
    
    # Log create action
    if request:
        log_audit_event(
            actor_email=user["email"],
            action="CREATE",
            entity_type="agency",
            entity_id=new_agency.id,
            office_id=new_agency.office_id,
            actor_employee_id=user.get("employee_id"),
            details={"created": get_entity_snapshot(new_agency)},
            request_path=str(request.url.path),
            request_method="POST",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            db=db,
        )
    
    return new_agency

@router.put("/{agency_id}", response_model=schemas.Agency)
def update_agency(
    agency_id: int,
    updated: schemas.AgencyUpdate,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an agency. Non-admin users can only update agencies in their office."""
    require_authenticated(user)
    require_agency_access(user, agency_id, db, for_modification=True)
    
    agency = db.query(models.Agency).filter(models.Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Get snapshot before update
    before_snapshot = get_entity_snapshot(agency)
    
    # Prevent changing office_id unless admin
    update_data = updated.model_dump(exclude_unset=True)
    if "office_id" in update_data and "admin" not in user.get("groups", []):
        # Non-admin cannot change office_id - they can only modify agencies in their office
        update_data.pop("office_id")
    
    for key, value in update_data.items():
        setattr(agency, key, value)
    
    db.commit()
    db.refresh(agency)
    
    # Log update action
    if request:
        log_audit_event(
            actor_email=user["email"],
            action="UPDATE",
            entity_type="agency",
            entity_id=agency_id,
            office_id=agency.office_id,
            actor_employee_id=user.get("employee_id"),
            details={
                "before": before_snapshot,
                "after": get_entity_snapshot(agency),
                "changed_fields": list(update_data.keys()),
            },
            request_path=str(request.url.path),
            request_method="PUT",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            db=db,
        )
    
    return agency

@router.delete("/{agency_id}")
def delete_agency(
    agency_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an agency. Non-admin users can only delete agencies in their office."""
    require_authenticated(user)
    require_agency_access(user, agency_id, db, for_modification=True)
    
    agency = db.query(models.Agency).filter(models.Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    office_id = agency.office_id
    agency_snapshot = get_entity_snapshot(agency)
    
    db.delete(agency)
    db.commit()
    
    # Log delete action
    if request:
        log_audit_event(
            actor_email=user["email"],
            action="DELETE",
            entity_type="agency",
            entity_id=agency_id,
            office_id=office_id,
            actor_employee_id=user.get("employee_id"),
            details={"deleted": agency_snapshot},
            request_path=str(request.url.path),
            request_method="DELETE",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            db=db,
        )
    
    return {"detail": "Agency deleted"}
