from fastapi import APIRouter, Depends, status, Query, HTTPException, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List, Optional, Dict, Any
import logging
import os
import json
from datetime import datetime

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
async def options_employee(employee_id: int, request: Request):
    """Handle OPTIONS preflight for PATCH requests."""
    import os
    origin = request.headers.get("origin")
    cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    cors_origins = [o.strip() for o in cors_origins_str.split(",") if o.strip()]
    
    headers = {}
    if origin in cors_origins:
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
        }
    
    return Response(status_code=200, headers=headers)


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
        
        # Populate office_ids for each employee from the many-to-many relationship
        result = []
        for emp in employees:
            # Create employee dict with all fields
            emp_dict = {
                "id": emp.id,
                "name": emp.name,
                "email": emp.email,
                "office_id": emp.office_id,  # Keep for backward compatibility
                "website": emp.website,
                "role": emp.role,
            }
            
            # Populate office_ids from the offices relationship (many-to-many)
            if hasattr(emp, 'offices') and emp.offices:
                # Eager load offices if not already loaded
                db.refresh(emp, ["offices"])
                emp_dict['office_ids'] = [office.id for office in emp.offices]
            elif hasattr(emp, 'office_id') and emp.office_id:
                # Backward compatibility: if only office_id is set, use it
                emp_dict['office_ids'] = [emp.office_id]
            else:
                emp_dict['office_ids'] = []
            
            # Validate and return as Employee schema
            result.append(schemas.Employee(**emp_dict))
        
        # Skip audit logging for VIEW actions to improve performance
        
        return result
    except Exception as e:
        # Log full error details server-side only
        logger.error("Error fetching employees: %s", exc_info=True)
        # Never expose stack traces - return generic error
        is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
        if is_production:
            raise HTTPException(status_code=500, detail="An error occurred while fetching employees")
        else:
            # In development, include error message but not stack trace
            raise HTTPException(status_code=500, detail=f"Error fetching employees: {str(e)}")


@router.post("", status_code=status.HTTP_201_CREATED)
def create_employee(
    emp: schemas.EmployeeCreate,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create an employee. Non-admin users can only create employees in their office.
    Returns employee data with temporary_password and username if a new user was created.
    """
    require_authenticated(user)
    
    employee_data = emp.model_dump()
    
    # Validate email is provided - REQUIRED for 1:1 Employee:User relationship
    if not employee_data.get("email"):
        raise HTTPException(
            status_code=400,
            detail="Email is required when creating an employee. Every employee must have a user account."
        )
    
    # Check if email already exists (email is now unique - one employee per email)
    # This prevents duplicate employees
    existing_employee = db.query(models.Employee).filter(
        models.Employee.email == employee_data.get("email")
    ).first()
    
    if existing_employee:
        # Email already exists - this is a duplicate
        office_info = ""
        if hasattr(existing_employee, 'offices') and existing_employee.offices:
            office_names = [o.name for o in existing_employee.offices]
            office_info = f" (assigned to offices: {', '.join(office_names)})"
        elif existing_employee.office_id:
            office_info = f" (assigned to office ID: {existing_employee.office_id})"
        raise HTTPException(
            status_code=400,
            detail=f"Employee with email '{employee_data.get('email')}' already exists: '{existing_employee.name}' (ID: {existing_employee.id}){office_info}. Please use a different email, or edit the existing employee instead of creating a new one."
        )
    
    # Check if email is used by a different person (different name)
    # BUT: Allow if the existing employee has no name or is orphaned (no user account)
    if employee_data.get("email"):
        existing_different_name = db.query(models.Employee).filter(
            models.Employee.email == employee_data["email"],
            models.Employee.name != employee_data.get("name", "")
        ).first()
        if existing_different_name:
            # Check if the existing employee has a user account
            existing_user_for_emp = db.query(models.User).filter(
                (models.User.email == employee_data["email"]) |
                (models.User.employee_id == existing_different_name.id)
            ).first()
            if existing_user_for_emp:
                # Provide helpful error message with employee details
                office_info = f" in office {existing_different_name.office_id}" if existing_different_name.office_id else " (no office assigned)"
                raise HTTPException(
                    status_code=400,
                    detail=f"Email {employee_data['email']} is already in use by employee '{existing_different_name.name}' (ID: {existing_different_name.id}){office_info}. Please use a different email, or edit the existing employee '{existing_different_name.name}' instead of creating a new one."
                )
            else:
                # Orphaned employee (no user account) - we can update it instead
                logger.info(f"Found orphaned employee {existing_different_name.id} with email {employee_data['email']}, updating instead of creating new")
                existing_different_name.name = employee_data.get("name", "")
                if "role" in employee_data:
                    existing_different_name.role = employee_data.get("role")
                # Note: office_id is deprecated, but we'll update it for backward compatibility
                # The many-to-many relationship should be updated via office_ids
                # However, since this is updating an existing employee, we should update office assignments
                if "office_ids" in employee_data and employee_data.get("office_ids"):
                    office_ids = employee_data.get("office_ids")
                    offices = db.query(models.Office).filter(models.Office.id.in_(office_ids)).all()
                    existing_different_name.offices = offices
                elif "office_id" in employee_data:
                    # Backward compatibility: if only office_id is provided, use it
                    existing_different_name.office_id = employee_data.get("office_id")
                db.commit()
                db.refresh(existing_different_name, ["offices"])
                # Return the updated employee (no temp password since no new user was created)
                # Create employee dict with all fields
                employee_dict = {
                    "id": existing_different_name.id,
                    "name": existing_different_name.name,
                    "email": existing_different_name.email,
                    "office_id": existing_different_name.office_id,
                    "website": existing_different_name.website,
                    "role": existing_different_name.role,
                }
                # Populate office_ids
                if hasattr(existing_different_name, 'offices') and existing_different_name.offices:
                    employee_dict['office_ids'] = [office.id for office in existing_different_name.offices]
                elif hasattr(existing_different_name, 'office_id') and existing_different_name.office_id:
                    employee_dict['office_ids'] = [existing_different_name.office_id]
                else:
                    employee_dict['office_ids'] = []
                employee_dict["_message"] = f"Updated existing orphaned employee '{existing_different_name.name}'. No user account exists for this employee yet."
                from fastapi.responses import JSONResponse
                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content=employee_dict
                )
    
    # Office validation: check if user has access to all requested offices
    office_ids = employee_data.get("office_ids") or []
    # Backward compatibility: if office_id is provided but office_ids is not, use office_id
    if not office_ids and employee_data.get("office_id"):
        office_ids = [employee_data.get("office_id")]
    
    # Office is optional - only enforce office restrictions for non-admin users if offices are specified
    if "admin" not in user.get("groups", []) and office_ids:
        user_office_id = user.get("office_id")
        # Check if user has access to all requested offices
        # For now, we'll allow if user's office is in the list, or if user has no office (can assign anywhere)
        if user_office_id and user_office_id not in office_ids:
            # Check if any of the requested offices match user's office
            requested_offices = db.query(models.Office).filter(models.Office.id.in_(office_ids)).all()
            user_office = db.query(models.Office).filter(models.Office.id == user_office_id).first()
            if user_office and user_office not in requested_offices:
                raise HTTPException(
                    status_code=403,
                    detail="You can only create employees in your assigned office"
                )
    
    # Create employee first (but don't commit yet - we'll commit both together)
    # We need to ensure User is created atomically with Employee for 1:1 relationship
    new_employee = crud.create_employee(db, schemas.EmployeeCreate(**employee_data))
    
    # REQUIRED: Automatically create User account for every Employee
    # This enforces 1:1 relationship - every Employee must have a User account
    if not new_employee.email:
        # This should never happen due to validation above, but double-check
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Email is required. Employee creation failed."
        )
    
    # Create User account (required for 1:1 relationship)
    from ..routers.auth import hash_password, validate_password_strength
    from ..services.email import send_welcome_email
    import secrets
    import os
    from datetime import datetime, timedelta
    from fastapi.responses import JSONResponse
    
    # Check if user already exists with this email
    existing_user = db.query(models.User).filter(
        (models.User.email == new_employee.email) |
        (models.User.username == new_employee.email.split('@')[0])
    ).first()
    
    username = None
    set_password_token = None
    user_created = False
    
    temp_password_plain = None  # Store plain password to return to admin
    
    if not existing_user:
        try:
            # Generate a readable temporary password that meets requirements
            from ..routers.auth import generate_temporary_password
            temp_password_plain = generate_temporary_password()
            temp_password_hash = hash_password(temp_password_plain)
            
            # Create username from email (part before @)
            username = new_employee.email.split('@')[0]
            # Ensure username is unique
            base_username = username
            counter = 1
            while db.query(models.User).filter(models.User.username == username).first():
                username = f"{base_username}{counter}"
                counter += 1
            
            # Create user account
            # If employee role is "admin", grant admin access to the user account
            is_admin = new_employee.role == "admin" if new_employee.role else False
            
            new_user = models.User(
                username=username,
                email=new_employee.email,
                password_hash=temp_password_hash,
                is_active=True,
                is_admin=is_admin,  # Set to True if employee role is "admin"
                employee_id=new_employee.id,  # Link to employee
                password_reset_token=None,  # No token - user uses temp password to login first
                password_reset_expires=None,
                created_at=datetime.utcnow(),
                must_change_password=True  # Force password change on first login
            )
            db.add(new_user)
            db.flush()  # Don't commit yet - we'll commit both together
            user_created = True
            logger.info(f"Created new user account for employee {new_employee.id}: {username} (must change password on first login)")
        except Exception as user_creation_error:
            # CRITICAL: If user creation fails, we must rollback the employee too
            # This enforces 1:1 relationship - no Employee without User
            logger.error(f"Error creating user account for employee {new_employee.id} ({new_employee.email}): {user_creation_error}", exc_info=True)
            db.rollback()  # Rollback both employee and user creation
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create user account for employee. Employee creation rolled back. Error: {str(user_creation_error)}"
            )
    else:
        # User already exists - link it to this employee (enforce 1:1)
        username = existing_user.username
        logger.info(f"User account already exists for {new_employee.email}: {username}")
        
        # Determine why the user was found (email match or username match)
        match_reason = ""
        if existing_user.email and existing_user.email.lower() == new_employee.email.lower():
            match_reason = f"email '{existing_user.email}'"
        else:
            email_prefix = new_employee.email.split('@')[0] if new_employee.email else ""
            if existing_user.username == email_prefix:
                match_reason = f"username '{existing_user.username}' (derived from email '{new_employee.email}')"
        
        # Check if user is currently linked to an employee
        linked_employee_name = None
        linked_employee_id = None
        is_orphaned = False
        
        if existing_user.employee_id:
            linked_employee = db.query(models.Employee).filter(models.Employee.id == existing_user.employee_id).first()
            if linked_employee:
                linked_employee_name = linked_employee.name
                linked_employee_id = linked_employee.id
            else:
                # Orphaned link - employee was deleted but user still references it
                is_orphaned = True
                logger.info(f"User {existing_user.id} has orphaned employee_id {existing_user.employee_id}, updating to new employee {new_employee.id}")
        
        # CRITICAL: If user already has a different employee_id, check if that employee still exists
        if existing_user.employee_id and existing_user.employee_id != new_employee.id and linked_employee:
            # Employee exists - this is a conflict
            db.rollback()  # Rollback employee creation
            raise HTTPException(
                status_code=400,
                detail=f"User account with {match_reason} is already linked to employee '{linked_employee_name}' (ID: {linked_employee_id}). Each user can only be linked to one employee. Please update the existing employee '{linked_employee_name}' instead, or use a different email address for the new employee."
            )
        
        # If orphaned or not linked, update the link
        if is_orphaned or not existing_user.employee_id:
            existing_user.employee_id = new_employee.id
            logger.info(f"Linking orphaned/unlinked user {username} to new employee {new_employee.id}")
        
        # Generate new set-password token for existing user (so they can reset password)
        set_password_token = secrets.token_urlsafe(32)
        set_password_expires = datetime.utcnow() + timedelta(hours=24)
        existing_user.password_reset_token = set_password_token
        existing_user.password_reset_expires = set_password_expires
        
        # If employee role is "admin", grant admin access to the user account
        if new_employee.role == "admin":
            existing_user.is_admin = True
            logger.info(f"Granted admin access to existing user {username} (employee role is admin)")
        
        db.flush()  # Don't commit yet - we'll commit both together
        user_created = True
        
        # Build detailed message about what happened
        link_status = ""
        if is_orphaned:
            link_status = f" (previously linked to deleted employee, now linked to '{new_employee.name}')"
        elif linked_employee_name and linked_employee_name == new_employee.name:
            link_status = " (already linked to this employee)"
        elif not existing_user.employee_id:
            link_status = f" (was not linked to any employee, now linked to '{new_employee.name}')"
        
        logger.info(f"Linked existing user {username} to employee {new_employee.id}. Match reason: {match_reason}. Link status: {link_status}")
    
    # Commit both Employee and User together (atomic transaction for 1:1 relationship)
    if user_created:
        db.commit()
        logger.info(f"Successfully created employee {new_employee.id} with user account {username}")
        
        # Send welcome email for NEW users with temporary password, or password reset email for existing users
        if username:
            try:
                if not existing_user and temp_password_plain:
                    # New user - send welcome email with temporary password
                    email_sent = send_welcome_email(
                        to_email=new_employee.email,
                        username=username,
                        temporary_password=temp_password_plain  # Include temp password in email
                    )
                    if email_sent:
                        logger.info(f"Welcome email sent successfully to {new_employee.email}")
                    else:
                        logger.warning(f"Failed to send welcome email to {new_employee.email} - check SMTP configuration")
                        # Email failed - temp password will be returned in response so admin can share manually
                elif existing_user and set_password_token:
                    # Existing user being linked - send password reset email so they can set their password
                    set_password_link = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/set-password?token={set_password_token}"
                    from ..services.email import send_password_reset_email
                    email_sent = send_password_reset_email(
                        to_email=new_employee.email,
                        username=username,
                        reset_token=set_password_token,
                        reset_url=set_password_link
                    )
                    if email_sent:
                        logger.info(f"Password reset email sent successfully to {new_employee.email} (existing user linked to new employee)")
                    else:
                        logger.warning(f"Failed to send password reset email to {new_employee.email} - check SMTP configuration")
                
                if not email_sent:
                    # Log the set-password link for manual sending if email failed
                    logger.info(f"Set-password link for {new_employee.email}: {set_password_link}")
            except Exception as email_error:
                # Don't fail the employee creation if email fails
                logger.error(f"Error sending email to {new_employee.email}: {email_error}", exc_info=True)
                # Log the set-password link for manual sending if needed
                set_password_link = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/set-password?token={set_password_token}"
                logger.info(f"Set-password link for {new_employee.email}: {set_password_link}")
    
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
    
    # Return employee with temporary password info if new user was created
    # Use JSONResponse to bypass response_model validation so we can include extra fields
    # Refresh to ensure offices relationship is loaded
    db.refresh(new_employee, ["offices"])
    
    # Create employee dict with all fields
    employee_dict = {
        "id": new_employee.id,
        "name": new_employee.name,
        "email": new_employee.email,
        "office_id": new_employee.office_id,  # Keep for backward compatibility
        "website": new_employee.website,
        "role": new_employee.role,
    }
    
    # Populate office_ids from the offices relationship (many-to-many)
    if hasattr(new_employee, 'offices') and new_employee.offices:
        employee_dict['office_ids'] = [office.id for office in new_employee.offices]
    elif hasattr(new_employee, 'office_id') and new_employee.office_id:
        employee_dict['office_ids'] = [new_employee.office_id]
    else:
        employee_dict['office_ids'] = []
    
    if temp_password_plain and not existing_user:
        # New user created - include temp password and username
        employee_dict["temporary_password"] = temp_password_plain
        employee_dict["username"] = username
        employee_dict["_message"] = f"User '{username}' created. Temporary password: {temp_password_plain}. User must change password on first login."
        logger.info(f"Returning employee with temp password: username={username}, employee_id={new_employee.id}")
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content=employee_dict
        )
    elif existing_user:
        # Existing user linked - include username but no temp password
        employee_dict["username"] = existing_user.username
        employee_dict["_existing_user_linked"] = True
        
        # Provide detailed explanation
        match_reason = ""
        if existing_user.email and existing_user.email.lower() == new_employee.email.lower():
            match_reason = f"Email '{existing_user.email}' already has a user account"
        else:
            email_prefix = new_employee.email.split('@')[0] if new_employee.email else ""
            if existing_user.username == email_prefix:
                match_reason = f"Username '{existing_user.username}' (from email '{new_employee.email}') already exists"
        
        employee_dict["_message"] = (
            f"Employee created and linked to existing user '{existing_user.username}'. "
            f"{match_reason}. No temporary password needed - user account already exists. "
            f"The user can login with their existing password, or use the password reset link if needed."
        )
        logger.info(f"Returning employee linked to existing user: username={existing_user.username}, employee_id={new_employee.id}, reason={match_reason}")
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content=employee_dict
        )
    
    # Fallback - should not happen, but return employee data anyway
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=employee_dict
    )


@router.patch("/{employee_id}", response_model=schemas.Employee)
def update_employee(
    employee_id: int,
    payload: schemas.EmployeeUpdate,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an employee. If role is set to 'admin', also grant admin access to the user account."""
    require_authenticated(user)
    
    # Use query instead of db.get for better error handling
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check modification access to employee's offices
    # Admin can always update, non-admin can update if they have access to at least one of the employee's offices
    if "admin" not in user.get("groups", []):
        # Check if employee has any offices assigned
        employee_offices = []
        if hasattr(employee, 'offices') and employee.offices:
            employee_offices = [o.id for o in employee.offices]
        elif employee.office_id:
            employee_offices = [employee.office_id]
        
        if employee_offices:
            # Check if user has access to at least one of the employee's offices
            user_office_id = user.get("office_id")
            if user_office_id and user_office_id not in employee_offices:
                # User doesn't have access - check if they're trying to modify office assignments
                if "office_ids" in payload.model_dump(exclude_unset=True) or "office_id" in payload.model_dump(exclude_unset=True):
                    raise HTTPException(
                        status_code=403,
                        detail="You can only modify employees in your assigned office"
                    )
                # Otherwise, allow update if it doesn't change office assignments
    
    # Check if email is used by a different person (different name)
    update_data = payload.model_dump(exclude_unset=True)
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
    
    # Prevent changing office assignments unless admin
    # Check if office_ids is being updated
    office_ids_in_update = "office_ids" in update_data
    office_id_in_update = "office_id" in update_data
    
    if (office_ids_in_update or office_id_in_update) and "admin" not in user.get("groups", []):
        # Non-admin cannot change office assignments
        raise HTTPException(
            status_code=403,
            detail="You can only modify employees in your assigned office. Office assignments can only be changed by admins."
        )
    
    # Sync role changes with user.is_admin if role is being updated
    if "role" in update_data:
        # Find associated user account
        user_account = db.query(models.User).filter(
            (models.User.employee_id == employee_id) |
            (models.User.email == employee.email)
        ).first()
        
        if user_account:
            # If role is set to "admin", grant admin access
            # If role is changed from "admin" to something else, revoke admin access
            new_role = update_data["role"]
            if new_role == "admin":
                user_account.is_admin = True
                db.flush()  # Ensure user account change is staged
            elif employee.role == "admin" and new_role != "admin":
                # Only revoke admin if user is actually changing from admin to non-admin
                user_account.is_admin = False
                db.flush()  # Ensure user account change is staged
    
    before_snapshot = get_entity_snapshot(employee)
    # Pass full payload to crud - it will handle office_ids separately
    updated = crud.update_employee(db, employee_id, schemas.EmployeeUpdate(**payload.model_dump(exclude_unset=True)))
    
    # Log update action
    if request:
        # Get office_id for logging (use first office if multiple)
        log_office_id = None
        if hasattr(updated, 'offices') and updated.offices:
            log_office_id = updated.offices[0].id if updated.offices else None
        elif updated.office_id:
            log_office_id = updated.office_id
        
        log_audit_event(
            actor_email=user["email"],
            action="UPDATE",
            entity_type="employee",
            entity_id=employee_id,
            office_id=log_office_id,
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
    
    # Refresh to ensure offices relationship is loaded
    db.refresh(updated, ["offices"])
    
    # Create employee dict with all fields
    updated_dict = {
        "id": updated.id,
        "name": updated.name,
        "email": updated.email,
        "office_id": updated.office_id,  # Keep for backward compatibility
        "website": updated.website,
        "role": updated.role,
    }
    
    # Populate office_ids from the offices relationship (many-to-many)
    if hasattr(updated, 'offices') and updated.offices:
        updated_dict['office_ids'] = [office.id for office in updated.offices]
    elif hasattr(updated, 'office_id') and updated.office_id:
        updated_dict['office_ids'] = [updated.office_id]
    else:
        updated_dict['office_ids'] = []
    
    # Return as Employee schema for proper validation
    return schemas.Employee(**updated_dict)


@router.get("/{employee_id}/activity")
def get_employee_activity(
    employee_id: int,
    limit: Optional[int] = Query(100, description="Maximum number of activities to return"),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get activity timeline for an employee.
    Primarily shows agency interaction logs (calls) for agencies where employee is primary underwriter.
    Also includes audit logs where employee was the actor.
    Returns chronological list of all activities.
    """
    require_authenticated(user)
    
    # Get employee
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    activities = []
    
    # Get ALL interaction logs (calls) where employee's name matches the user field
    # This shows ALL activity for the employee, not just for agencies where they're primary underwriter
    employee_name_lower = employee.name.strip().lower()
    interaction_logs = db.query(models.Log).filter(
        func.lower(func.trim(models.Log.user)) == employee_name_lower
    ).order_by(models.Log.datetime.desc()).limit(limit * 2).all()  # Get more to account for audit logs
    
    logger.info(f"[ACTIVITY] Employee {employee_id} ({employee.name}): Found {len(interaction_logs)} logs where user matches '{employee.name}'")
    
    # Get agencies for reference (to show agency names in the timeline)
    agency_ids_from_logs = [log.agency_id for log in interaction_logs if log.agency_id]
    agencies_map = {}
    if agency_ids_from_logs:
        agencies = db.query(models.Agency).filter(models.Agency.id.in_(agency_ids_from_logs)).all()
        agencies_map = {ag.id: ag for ag in agencies}
    
    for log in interaction_logs:
        # Find the agency for this log
        agency = agencies_map.get(log.agency_id) if log.agency_id else None
        
        description = log.action or "Call"
        if log.contact:
            description += f" with {log.contact}"
        if agency:
            description += f" ({agency.name})"
        if log.notes:
            description += f": {log.notes}"
        
        activities.append({
            "id": f"log_{log.id}",
            "type": "log",
            "timestamp": log.datetime.isoformat() if isinstance(log.datetime, datetime) else log.datetime,
            "action": log.action,
            "description": description,
            "agency_id": log.agency_id,
            "agency_name": agency.name if agency else None,
            "contact_id": log.contact_id,
            "contact_name": log.contact,
            "notes": log.notes,
            "office": log.office,
            "user": log.user,  # Include who made the call
        })
    
    # Also get audit logs where this employee was the actor (secondary focus)
    audit_logs = db.query(models.AuditLog).filter(
        models.AuditLog.actor_employee_id == employee_id
    ).order_by(models.AuditLog.timestamp.desc()).limit(limit // 2).all()
    
    for audit in audit_logs:
        # Parse details_json if present
        details = None
        if audit.details_json:
            try:
                details = json.loads(audit.details_json)
            except:
                details = {"raw": audit.details_json}
        
        # Build activity description
        description = f"{audit.action} {audit.entity_type}"
        if audit.entity_id:
            description += f" (ID: {audit.entity_id})"
        
        # Add context from details
        if details:
            if audit.action == "UPDATE" and "changed_fields" in details:
                description += f" - Changed: {', '.join(details['changed_fields'])}"
            elif audit.action == "CREATE":
                description += " - Created new record"
            elif audit.action == "DELETE":
                description += " - Deleted record"
        
        activities.append({
            "id": f"audit_{audit.id}",
            "type": "audit",
            "timestamp": audit.timestamp.isoformat(),
            "action": audit.action,
            "entity_type": audit.entity_type,
            "entity_id": audit.entity_id,
            "description": description,
            "details": details,
            "office_id": audit.office_id,
        })
    
    # Sort all activities by timestamp (newest first)
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    
    # Limit to requested number
    return activities[:limit]
