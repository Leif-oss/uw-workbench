"""
User management endpoints for production.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os

from ..database import get_db
from .. import models, schemas
from ..auth.proxy_headers import get_current_user, require_authenticated
from ..routers.auth import hash_password, verify_password
from ..services.audit import log_audit_event, get_entity_snapshot

router = APIRouter(prefix="/users", tags=["users"])


def require_admin(user: dict):
    """Require user to have admin role."""
    require_authenticated(user)
    if "admin" not in user.get("groups", []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )


@router.get("", response_model=List[schemas.User])
def list_users(
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all users. Admin only."""
    require_admin(user)
    
    users = db.query(models.User).all()
    
    # Log audit event
    log_audit_event(
        actor_email=user["email"],
        action="VIEW",
        entity_type="user",
        request_path=str(request.url.path),
        request_method="GET",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        db=db,
    )
    
    return users


@router.post("", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: schemas.UserCreate,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new user. Admin only."""
    require_admin(user)
    
    # Check if username already exists
    existing = db.query(models.User).filter(models.User.username == user_data.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Validate password if provided, or require email for password link
    password_provided = user_data.password is not None and user_data.password != ""
    if not password_provided and not user_data.send_password_link:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either password or send_password_link must be provided"
        )
    
    if password_provided:
        from ..routers.auth import validate_password_strength
        is_valid, error_msg = validate_password_strength(user_data.password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
    
    # Validate employee_id if provided
    if user_data.employee_id:
        employee = db.query(models.Employee).filter(models.Employee.id == user_data.employee_id).first()
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee not found"
            )
        # Auto-set email from employee if not provided
        if not user_data.email and employee.email:
            user_data.email = employee.email
    
    # Generate password or set-password token
    import secrets
    from datetime import timedelta
    
    password_hash_to_set = None
    set_password_token = None
    set_password_expires = None
    
    if password_provided:
        # Use provided password
        password_hash_to_set = hash_password(user_data.password)
    elif user_data.send_password_link:
        # Generate set-password token
        set_password_token = secrets.token_urlsafe(32)
        set_password_expires = datetime.utcnow() + timedelta(hours=24)  # 24 hour expiry
        # Set a temporary random password (user won't use this, they'll set via link)
        password_hash_to_set = hash_password(secrets.token_urlsafe(16))
    
    # Create new user
    new_user = models.User(
        username=user_data.username,
        email=user_data.email,
        password_hash=password_hash_to_set,
        is_active=True,
        is_admin=user_data.is_admin,
        employee_id=user_data.employee_id,
        created_at=datetime.utcnow(),
        password_reset_token=set_password_token,  # Reuse reset token field for set-password
        password_reset_expires=set_password_expires,
        must_change_password=password_provided  # Force change if temp password was provided
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Send welcome email if requested
    if user_data.send_welcome_email and new_user.email:
        from ..services.email import send_welcome_email
        set_password_link = None
        if user_data.send_password_link and set_password_token:
            set_password_link = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/set-password?token={set_password_token}"
        
        send_welcome_email(
            to_email=new_user.email,
            username=new_user.username,
            temporary_password=user_data.password if password_provided and user_data.send_welcome_email else None,
            set_password_link=set_password_link
        )
    
    # Log audit event
    log_audit_event(
        actor_email=user["email"],
        action="CREATE",
        entity_type="user",
        entity_id=new_user.id,
        actor_employee_id=user.get("employee_id"),
        details={"created": get_entity_snapshot(new_user)},
        request_path=str(request.url.path),
        request_method="POST",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        db=db,
    )
    
    return new_user


@router.get("/{user_id}", response_model=schemas.User)
def get_user(
    user_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific user. Admin only, or users can view themselves."""
    require_authenticated(user)
    
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Users can view themselves, admins can view anyone
    if "admin" not in user.get("groups", []):
        # Get current user's session to find their user ID
        from ..routers.auth import get_session
        authorization = request.headers.get("authorization", "")
        if authorization.startswith("Bearer "):
            token = authorization[7:]
            session_obj = get_session(token, db)
            if session_obj and session_obj.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
    
    return target_user


@router.patch("/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    user_data: schemas.UserUpdate,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a user. Admin only, or users can update their own password."""
    require_authenticated(user)
    
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get current user's session to find their user ID
    from ..routers.auth import get_session
    authorization = request.headers.get("authorization", "")
    is_admin = "admin" in user.get("groups", [])
    is_self = False
    
    if authorization.startswith("Bearer "):
        token = authorization[7:]
        session_obj = get_session(token, db)
        if session_obj:
            is_self = session_obj.user_id == user_id
    
    # Non-admins can only update their own password
    if not is_admin and not is_self:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    if not is_admin and is_self:
        # Users can only update their own password
        if user_data.username is not None or user_data.is_active is not None or user_data.is_admin is not None or user_data.employee_id is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Users can only update their password"
            )
    
    # Store before state for audit
    before_snapshot = get_entity_snapshot(target_user)
    
    # Update fields
    if user_data.username is not None:
        # Check if new username already exists
        if user_data.username != target_user.username:
            existing = db.query(models.User).filter(models.User.username == user_data.username).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already exists"
                )
        target_user.username = user_data.username
    
    if user_data.email is not None:
        target_user.email = user_data.email
    
    if user_data.password is not None:
        # Validate password strength
        from ..routers.auth import validate_password_strength
        is_valid, error_msg = validate_password_strength(user_data.password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        target_user.password_hash = hash_password(user_data.password)
        target_user.must_change_password = False  # Clear must-change flag when admin sets password
    
    if user_data.is_active is not None:
        target_user.is_active = user_data.is_active
    
    if user_data.is_admin is not None:
        target_user.is_admin = user_data.is_admin
    
    if user_data.employee_id is not None:
        if user_data.employee_id:
            employee = db.query(models.Employee).filter(models.Employee.id == user_data.employee_id).first()
            if not employee:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Employee not found"
                )
        target_user.employee_id = user_data.employee_id
    
    db.commit()
    db.refresh(target_user)
    
    # Log audit event
    log_audit_event(
        actor_email=user["email"],
        action="UPDATE",
        entity_type="user",
        entity_id=target_user.id,
        actor_employee_id=user.get("employee_id"),
        details={
            "before": before_snapshot,
            "after": get_entity_snapshot(target_user)
        },
        request_path=str(request.url.path),
        request_method="PATCH",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        db=db,
    )
    
    return target_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a user. Admin only."""
    require_admin(user)
    
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent deleting yourself
    from ..routers.auth import get_session
    authorization = request.headers.get("authorization", "")
    if authorization.startswith("Bearer "):
        token = authorization[7:]
        session_obj = get_session(token, db)
        if session_obj and session_obj.user_id == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )
    
    # Store before state for audit
    before_snapshot = get_entity_snapshot(target_user)
    
    # Delete user (this will cascade delete sessions)
    db.delete(target_user)
    db.commit()
    
    # Log audit event
    log_audit_event(
        actor_email=user["email"],
        action="DELETE",
        entity_type="user",
        entity_id=user_id,
        actor_employee_id=user.get("employee_id"),
        details={"deleted": before_snapshot},
        request_path=str(request.url.path),
        request_method="DELETE",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        db=db,
    )

