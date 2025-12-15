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

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("", response_model=List[schemas.Log])
def read_logs(
    request: Request,
    agency_id: Optional[int] = Query(None),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get logs. All employees can view all logs."""
    require_authenticated(user)
    
    # All users can view all logs (no filtering)
    if agency_id:
        logs = crud.get_logs(db, agency_id=agency_id)
    else:
        logs = crud.get_logs(db)
    
    # Skip audit logging for VIEW actions to improve performance
    
    return logs


@router.post("", response_model=schemas.Log, status_code=status.HTTP_201_CREATED)
def create_log(
    log: schemas.LogCreate,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a log. Non-admin users can only create logs for agencies in their office."""
    require_authenticated(user)
    
    # If log is associated with an agency, check modification access
    if log.agency_id:
        require_agency_access(user, log.agency_id, db, for_modification=True)
    
    new_log = crud.create_log(db, log)
    
    # Log create action
    if request:
        office_id = None
        if log.agency_id:
            agency = db.get(models.Agency, log.agency_id)
            office_id = agency.office_id if agency else None
        
        log_audit_event(
            actor_email=user["email"],
            action="CREATE",
            entity_type="log",
            entity_id=new_log.id,
            office_id=office_id,
            actor_employee_id=user.get("employee_id"),
            details={"created": get_entity_snapshot(new_log)},
            request_path=str(request.url.path),
            request_method="POST",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            db=db,
        )
    
    return new_log


@router.patch("/{log_id}", response_model=schemas.Log)
def update_log(
    log_id: int,
    payload: schemas.LogUpdate,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a log. Non-admin users can only update logs for agencies in their office."""
    require_authenticated(user)
    
    existing_log = db.get(models.Log, log_id)
    if not existing_log:
        raise HTTPException(status_code=404, detail="Log not found")
    
    # Check modification access to log's agency if it has one
    if existing_log.agency_id:
        require_agency_access(user, existing_log.agency_id, db, for_modification=True)
    
    before_snapshot = get_entity_snapshot(existing_log)
    updated = crud.update_log(db, log_id, payload)
    
    # Log update action
    if request:
        office_id = None
        if existing_log.agency_id:
            agency = db.get(models.Agency, existing_log.agency_id)
            office_id = agency.office_id if agency else None
        
        log_audit_event(
            actor_email=user["email"],
            action="UPDATE",
            entity_type="log",
            entity_id=log_id,
            office_id=office_id,
            actor_employee_id=user.get("employee_id"),
            details={
                "before": before_snapshot,
                "after": get_entity_snapshot(updated),
            },
            request_path=str(request.url.path),
            request_method="PATCH",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            db=db,
        )
    
    return updated


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_log(
    log_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a log. Non-admin users can only delete logs for agencies in their office."""
    require_authenticated(user)
    
    log = db.get(models.Log, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    
    # Check modification access to log's agency if it has one
    if log.agency_id:
        require_agency_access(user, log.agency_id, db, for_modification=True)
    
    office_id = None
    if log.agency_id:
        agency = db.get(models.Agency, log.agency_id)
        office_id = agency.office_id if agency else None
    
    log_snapshot = get_entity_snapshot(log)
    deleted = crud.delete_log(db, log_id)
    
    # Log delete action
    if request:
        log_audit_event(
            actor_email=user["email"],
            action="DELETE",
            entity_type="log",
            entity_id=log_id,
            office_id=office_id,
            actor_employee_id=user.get("employee_id"),
            details={"deleted": log_snapshot},
            request_path=str(request.url.path),
            request_method="DELETE",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            db=db,
        )
    
    return deleted
