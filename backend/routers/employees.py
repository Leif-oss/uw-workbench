from fastapi import APIRouter, Depends, status, Query, HTTPException, Request, Response
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from .. import schemas, crud, models
from ..database import get_db
from ..auth.proxy_headers import (
    get_current_user,
    require_office_access,
    require_authenticated,
)
from ..services.audit import log_audit_event, get_entity_snapshot

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/employees", tags=["employees"])

# Handle OPTIONS preflight requests for CORS (no auth required)
@router.options("/{employee_id}")
async def options_employee(employee_id: int):
    """Handle OPTIONS preflight for PATCH requests."""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "http://localhost:5173",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
        }
    )


@router.get("", response_model=List[schemas.Employee])
def read_employees(
    request: Request,
    office: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get employees. All employees can view all employees."""
    require_authenticated(user)
    
    try:
        # All users can view all employees (no filtering)
        employees = crud.get_employees(db, office=office)
        
        # Skip audit logging for VIEW actions to improve performance
        
        return employees
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        logger.error(f"Error fetching employees: {error_detail}")
        # Return detailed error in development
        import os
        if os.getenv("ENVIRONMENT", "development").lower() == "development":
            raise HTTPException(status_code=500, detail=f"Error fetching employees: {str(e)}\n{traceback.format_exc()}")
        else:
            raise HTTPException(status_code=500, detail=f"Error fetching employees: {str(e)}")


@router.post("", response_model=schemas.Employee, status_code=status.HTTP_201_CREATED)
def create_employee(
    emp: schemas.EmployeeCreate,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create an employee. Non-admin users can only create employees in their office."""
    require_authenticated(user)
    
    employee_data = emp.model_dump()
    
    # Validate email is provided
    if not employee_data.get("email"):
        raise HTTPException(
            status_code=400,
            detail="Email is required when creating an employee"
        )
    
    # Check if this exact combination (name + email + office) already exists
    existing_employee = db.query(models.Employee).filter(
        models.Employee.name == employee_data.get("name", ""),
        models.Employee.email == employee_data.get("email"),
        models.Employee.office_id == employee_data.get("office_id")
    ).first()
    if existing_employee:
        raise HTTPException(
            status_code=400,
            detail=f"Employee '{employee_data.get('name')}' with email '{employee_data.get('email')}' already exists in this office"
        )
    
    # Check if email is used by a different person (different name)
    if employee_data.get("email"):
        existing_different_name = db.query(models.Employee).filter(
            models.Employee.email == employee_data["email"],
            models.Employee.name != employee_data.get("name", "")
        ).first()
        if existing_different_name:
            raise HTTPException(
                status_code=400,
                detail=f"Email {employee_data['email']} is already in use by employee {existing_different_name.name}"
            )
    
    # Enforce office_id matches user's office (unless admin)
    user_office_id = user.get("office_id")
    if "admin" not in user.get("groups", []):
        if not user_office_id:
            raise HTTPException(
                status_code=403,
                detail="User not associated with an office. Cannot create employees."
            )
        # Check if user is trying to create in their office
        if employee_data.get("office_id") != user_office_id:
            raise HTTPException(
                status_code=403,
                detail="You can only create employees in your assigned office"
            )
    
    new_employee = crud.create_employee(db, schemas.EmployeeCreate(**employee_data))
    
    # Log create action
    if request:
        log_audit_event(
            actor_email=user["email"],
            action="CREATE",
            entity_type="employee",
            entity_id=new_employee.id,
            office_id=new_employee.office_id,
            actor_employee_id=user.get("employee_id"),
            details={"created": get_entity_snapshot(new_employee)},
            request_path=str(request.url.path),
            request_method="POST",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            db=db,
        )
    
    return new_employee


@router.patch("/{employee_id}", response_model=schemas.Employee)
def update_employee(
    employee_id: int,
    payload: schemas.EmployeeUpdate,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an employee. Non-admin users can only update employees in their office."""
    require_authenticated(user)
    
    employee = db.get(models.Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check modification access to employee's office
    require_office_access(user, employee.office_id, db, for_modification=True)
    
    # Prevent changing office_id unless admin
    update_data = payload.model_dump(exclude_unset=True)
    if "office_id" in update_data and "admin" not in user.get("groups", []):
        # Non-admin cannot change office_id
        update_data.pop("office_id")
    
    # Check if email is used by a different person (different name)
    if "email" in update_data and update_data["email"]:
        existing_different_name = db.query(models.Employee).filter(
            models.Employee.email == update_data["email"],
            models.Employee.id != employee_id,
            models.Employee.name != employee.name  # Different person
        ).first()
        if existing_different_name:
            raise HTTPException(
                status_code=400,
                detail=f"Email {update_data['email']} is already in use by employee {existing_different_name.name}"
            )
    
    # Note: We allow same name+email in different offices, so no need to check name uniqueness
    
    before_snapshot = get_entity_snapshot(employee)
    updated = crud.update_employee(db, employee_id, schemas.EmployeeUpdate(**update_data))
    
    # Log update action
    if request:
        log_audit_event(
            actor_email=user["email"],
            action="UPDATE",
            entity_type="employee",
            entity_id=employee_id,
            office_id=employee.office_id,
            actor_employee_id=user.get("employee_id"),
            details={
                "before": before_snapshot,
                "after": get_entity_snapshot(updated),
                "changed_fields": list(update_data.keys()),
            },
            request_path=str(request.url.path),
            request_method="PATCH",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            db=db,
        )
    
    return updated
