from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List

from .. import schemas, crud, models
from ..database import get_db
from ..auth.proxy_headers import (
    get_current_user,
    require_office_access,
    require_authenticated,
)
from ..services.audit import log_audit_event, get_entity_snapshot

router = APIRouter(prefix="/offices", tags=["offices"])


@router.get("", response_model=List[schemas.Office])
def read_offices(
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all offices. All employees can view all offices."""
    require_authenticated(user)
    
    # All authenticated users can see all offices
    offices = crud.get_offices(db)
    
    # Skip audit logging for VIEW actions to improve performance
    
    return offices


@router.get("/{office_id}", response_model=schemas.Office)
def read_office(
    office_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific office. All employees can view all offices."""
    require_authenticated(user)
    # No office check needed for viewing - all users can view all offices
    
    office = db.get(models.Office, office_id)
    if not office:
        raise HTTPException(status_code=404, detail="Office not found")
    
    # Skip audit logging for VIEW actions to improve performance
    
    return office


@router.post("", response_model=schemas.Office, status_code=status.HTTP_201_CREATED)
def create_office(
    office: schemas.OfficeCreate,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new office. Only admins can create offices."""
    require_authenticated(user)
    require_admin(user)
    
    existing = [o for o in crud.get_offices(db) if o.code == office.code]
    if existing:
        raise HTTPException(status_code=400, detail="Office code already exists")
    
    new_office = crud.create_office(db, office)
    
    # Log create action
    if request:
        log_audit_event(
            actor_email=user["email"],
            action="CREATE",
            entity_type="office",
            entity_id=new_office.id,
            office_id=new_office.id,
            actor_employee_id=user.get("employee_id"),
            details={"created": get_entity_snapshot(new_office)},
            request_path=str(request.url.path),
            request_method="POST",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            db=db,
        )
    
    return new_office
