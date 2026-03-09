"""
Database-backed username/password authentication with sessions and password reset.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import bcrypt
import secrets
import re
from typing import Dict, Optional

from ..database import get_db
from .. import models, schemas
from ..services.email import send_password_reset_email, send_welcome_email

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

# Handle OPTIONS preflight requests for CORS
@router.options("/login")
@router.options("/{path:path}")
async def options_handler(request: Request, path: str = ""):
    """Handle OPTIONS preflight requests for CORS."""
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
    
    from fastapi import Response
    return Response(status_code=200, headers=headers)

# Session expiry (24 hours)
SESSION_EXPIRY_HOURS = 24

# Account lockout settings
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 30

# Password requirements
MIN_PASSWORD_LENGTH = 8
REQUIRE_UPPERCASE = True
REQUIRE_LOWERCASE = True
REQUIRE_NUMBER = True
REQUIRE_SPECIAL = False  # Optional for now


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def generate_temporary_password() -> str:
    """
    Generate a secure temporary password that meets requirements.
    Format: Temp!{random}{number} - e.g., Temp!a7b3c9d2e5f1
    This ensures: uppercase, lowercase, number, special char, >= 8 chars
    """
    import random
    import string
    # Generate random alphanumeric (8 chars)
    random_part = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    # Add a random number at the end
    number_part = str(random.randint(10, 99))
    return f"Temp!{random_part}{number_part}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against a hash."""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password strength.
    
    Returns:
        (is_valid, error_message)
    """
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters long"
    
    if REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if REQUIRE_NUMBER and not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    
    if REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, None


def check_account_locked(user: models.User) -> tuple[bool, Optional[str]]:
    """
    Check if user account is locked.
    
    Returns:
        (is_locked, message)
    """
    if user.locked_until and datetime.utcnow() < user.locked_until:
        remaining = (user.locked_until - datetime.utcnow()).total_seconds() / 60
        return True, f"Account locked due to too many failed login attempts. Try again in {int(remaining)} minutes."
    elif user.locked_until:
        # Lockout expired, reset
        user.locked_until = None
        user.failed_login_attempts = 0
        return False, None
    
    return False, None


def create_session(user: models.User, db: Session, ip_address: str = None, user_agent: str = None) -> str:
    """Create a new database-backed session and return the token."""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=SESSION_EXPIRY_HOURS)
    
    session = models.Session(
        token=token,
        user_id=user.id,
        created_at=datetime.utcnow(),
        expires_at=expires_at,
        ip_address=ip_address,
        user_agent=user_agent,
        is_active=True
    )
    db.add(session)
    db.commit()
    
    # Update user's last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    return token


def get_session(token: str, db: Session) -> Optional[models.Session]:
    """Get session from database. Returns None if expired or invalid."""
    session = db.query(models.Session).filter(
        models.Session.token == token,
        models.Session.is_active == True
    ).first()
    
    if not session:
        return None
    
    # Check if expired
    if datetime.utcnow() > session.expires_at:
        session.is_active = False
        db.commit()
        return None
    
    return session


def invalidate_session(token: str, db: Session) -> None:
    """Invalidate a session token."""
    session = db.query(models.Session).filter(models.Session.token == token).first()
    if session:
        session.is_active = False
        db.commit()


@router.post("/login", response_model=Dict)
def login(
    credentials: schemas.UserLogin,
    request: Request,
    db: Session = Depends(get_db),
):
    """Login with username and password."""
    # Find user by username OR email
    user = db.query(models.User).filter(
        (models.User.username == credentials.username) |
        (models.User.email == credentials.username)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled"
        )
    
    # Verify password
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Create database-backed session
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    token = create_session(user, db, ip_address, user_agent)
    
    # Get employee name if user has an employee linked
    employee_name = user.username  # Default to username
    employee_id = None
    if user.employee_id:
        employee = db.get(models.Employee, user.employee_id)
        if employee:
            employee_id = employee.id
            if employee.name:
                employee_name = employee.name
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user.username,
        "name": employee_name,  # Employee name or username
        "employee_id": employee_id,  # Employee ID if linked
        "is_admin": user.is_admin,
        "must_change_password": user.must_change_password,  # Flag for frontend to prompt password change
        "expires_in": SESSION_EXPIRY_HOURS * 3600
    }


@router.post("/logout")
def logout(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
):
    """Logout by invalidating the session token."""
    if credentials:
        token = credentials.credentials
        invalidate_session(token, db)
    
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=Dict)
def get_current_user_info(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Get current user information from session token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    token = credentials.credentials
    session = get_session(token, db)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session"
        )
    
    user = session.user
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_active": user.is_active,
        "is_admin": user.is_admin,
        "employee_id": user.employee_id,
        "must_change_password": user.must_change_password,
    }


@router.post("/request-password-reset")
def request_password_reset(
    reset_request: schemas.PasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Request a password reset. Sends email with reset link."""
    # Find user by username or email
    user = db.query(models.User).filter(
        (models.User.username == reset_request.username) |
        (models.User.email == reset_request.username)
    ).first()
    
    # Always return success (don't reveal if user exists)
    if not user or not user.is_active:
        return {
            "message": "If an account exists with that username/email, a password reset link has been sent."
        }
    
    if not user.email:
        # User doesn't have email configured - return success but don't send email
        return {
            "message": "Password reset requested. Please contact your administrator as no email is configured for your account."
        }
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    user.password_reset_token = reset_token
    user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)  # 1 hour expiry
    db.commit()
    
    # Send email
    send_password_reset_email(
        to_email=user.email,
        username=user.username,
        reset_token=reset_token
    )
    
    return {
        "message": "If an account exists with that username/email, a password reset link has been sent."
    }


@router.post("/reset-password")
def reset_password(
    reset_data: schemas.PasswordReset,
    db: Session = Depends(get_db),
):
    """Reset password using reset token."""
    # Find user by reset token
    user = db.query(models.User).filter(
        models.User.password_reset_token == reset_data.token
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Check if token expired
    if not user.password_reset_expires or datetime.utcnow() > user.password_reset_expires:
        user.password_reset_token = None
        user.password_reset_expires = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired. Please request a new one."
        )
    
    # Validate new password
    is_valid, error_msg = validate_password_strength(reset_data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    # Update password
    user.password_hash = hash_password(reset_data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    user.failed_login_attempts = 0  # Reset failed attempts
    user.locked_until = None
    db.commit()
    
    return {
        "message": "Password reset successfully. You can now login with your new password."
    }


@router.post("/change-password")
def change_password(
    password_data: schemas.ChangePassword,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Change password (requires current password)."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    token = credentials.credentials
    session = get_session(token, db)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session"
        )
    
    user = session.user
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Verify current password
    if not verify_password(password_data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password
    is_valid, error_msg = validate_password_strength(password_data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    # Update password
    user.password_hash = hash_password(password_data.new_password)
    user.must_change_password = False  # Clear must-change flag
    db.commit()
    
    return {
        "message": "Password changed successfully"
    }

