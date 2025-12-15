from fastapi import APIRouter, Depends, status, HTTPException, Query, Request
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

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=List[schemas.Task])
def read_tasks(
    request: Request,
    agency_id: Optional[int] = Query(None),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get tasks. All employees can view all tasks."""
    require_authenticated(user)
    
    # All users can view all tasks (no filtering)
    if agency_id:
        tasks = crud.get_tasks(db, agency_id=agency_id)
    else:
        tasks = crud.get_tasks(db)
    
    # Skip audit logging for VIEW actions to improve performance
    
    return tasks


@router.post("", response_model=schemas.Task, status_code=status.HTTP_201_CREATED)
def create_task(
    task: schemas.TaskCreate,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a task. Non-admin users can only create tasks for agencies in their office."""
    require_authenticated(user)
    
    # If task is associated with an agency, check modification access
    if task.agency_id:
        require_agency_access(user, task.agency_id, db, for_modification=True)
    
    new_task = crud.create_task(db, task)
    
    # Log create action
    if request:
        office_id = None
        if task.agency_id:
            agency = db.get(models.Agency, task.agency_id)
            office_id = agency.office_id if agency else None
        
        log_audit_event(
            actor_email=user["email"],
            action="CREATE",
            entity_type="task",
            entity_id=new_task.id,
            office_id=office_id,
            actor_employee_id=user.get("employee_id"),
            details={"created": get_entity_snapshot(new_task)},
            request_path=str(request.url.path),
            request_method="POST",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            db=db,
        )
    
    return new_task


@router.patch("/{task_id}", response_model=schemas.Task)
def update_task(
    task_id: int,
    payload: schemas.TaskUpdate,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a task. Non-admin users can only update tasks for agencies in their office."""
    require_authenticated(user)
    
    existing_task = db.get(models.Task, task_id)
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check modification access to task's agency if it has one
    if existing_task.agency_id:
        require_agency_access(user, existing_task.agency_id, db, for_modification=True)
    
    before_snapshot = get_entity_snapshot(existing_task)
    updated = crud.update_task(db, task_id, payload)
    
    # Log update action
    if request:
        office_id = None
        if existing_task.agency_id:
            agency = db.get(models.Agency, existing_task.agency_id)
            office_id = agency.office_id if agency else None
        
        log_audit_event(
            actor_email=user["email"],
            action="UPDATE",
            entity_type="task",
            entity_id=task_id,
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


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a task. Non-admin users can only delete tasks for agencies in their office."""
    require_authenticated(user)
    
    task = db.get(models.Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check modification access to task's agency if it has one
    if task.agency_id:
        require_agency_access(user, task.agency_id, db, for_modification=True)
    
    office_id = None
    if task.agency_id:
        agency = db.get(models.Agency, task.agency_id)
        office_id = agency.office_id if agency else None
    
    task_snapshot = get_entity_snapshot(task)
    deleted = crud.delete_task(db, task_id)
    
    # Log delete action
    if request:
        log_audit_event(
            actor_email=user["email"],
            action="DELETE",
            entity_type="task",
            entity_id=task_id,
            office_id=office_id,
            actor_employee_id=user.get("employee_id"),
            details={"deleted": task_snapshot},
            request_path=str(request.url.path),
            request_method="DELETE",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            db=db,
        )
    
    return deleted
