"""
Authentication via Citrix/proxy identity headers.

In production behind Citrix, the proxy injects headers like:
- X-Authenticated-User: user@company.com
- X-Groups: Admin,Underwriter,Manager

In development, we can simulate this or allow direct access.
"""
import os
import ipaddress
from typing import Optional, Dict, List
from fastapi import Request, Header, HTTPException, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from sqlalchemy.orm import selectinload

# Trusted proxy IPs (set via environment variable, comma-separated)
# Can be individual IPs or CIDR ranges like "10.0.0.0/8"
TRUSTED_PROXY_IPS_STR = os.getenv("TRUSTED_PROXY_IPS", "")
TRUSTED_PROXY_IPS = [ip.strip() for ip in TRUSTED_PROXY_IPS_STR.split(",") if ip.strip()]

# Development mode: allow direct access without headers
DEV_MODE = os.getenv("ENVIRONMENT", "development").lower() == "development"
DEV_USER_EMAIL = os.getenv("DEV_USER_EMAIL", "")  # For local testing

# Header names (configurable)
AUTH_USER_HEADER = os.getenv("AUTH_USER_HEADER", "X-Authenticated-User")
AUTH_GROUPS_HEADER = os.getenv("AUTH_GROUPS_HEADER", "X-Groups")


def is_trusted_source(client_ip: str) -> bool:
    """Check if request comes from trusted proxy IP."""
    if not TRUSTED_PROXY_IPS:
        # If no trusted IPs configured, allow all (dev mode)
        return True
    
    try:
        client_ip_obj = ipaddress.ip_address(client_ip)
        for trusted_ip_str in TRUSTED_PROXY_IPS:
            try:
                # Try as CIDR range
                network = ipaddress.ip_network(trusted_ip_str, strict=False)
                if client_ip_obj in network:
                    return True
            except ValueError:
                # Try as exact IP match
                if client_ip == trusted_ip_str:
                    return True
    except ValueError:
        # Invalid IP format
        pass
    
    return False


async def get_current_user(
    request: Request,
    x_authenticated_user: Optional[str] = Header(None, alias="X-Authenticated-User"),
    x_groups: Optional[str] = Header(None, alias="X-Groups"),
    x_forwarded_for: Optional[str] = Header(None, alias="X-Forwarded-For"),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Dict:
    """
    Extract current user from session token, proxy headers, or dev mode.
    
    Returns dict with:
    - email: str
    - groups: List[str]
    - employee_id: Optional[int]
    - office_id: Optional[int]
    """
    # TEMPORARY SETUP MODE: Allow temporary admin access when no auth token is provided
    # TODO: Remove this after creating first admin user and re-enabling auth
    TEMP_SETUP_MODE = os.getenv("TEMP_SETUP_MODE", "false").lower() == "true"
    
    # Check for Bearer token first (session-based auth)
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]  # Remove "Bearer " prefix
        from ..routers.auth import get_session
        session_obj = get_session(token, db)
        if session_obj and session_obj.user:
            user = session_obj.user
            # Map username to email for compatibility
            user_email = f"{user.username}@local"
            # Grant admin access based on user.is_admin flag
            groups = ["admin"] if user.is_admin else []
            
            # Try to find employee linked to user
            employee = None
            if user.employee_id:
                employee = db.query(models.Employee).options(
                    selectinload(models.Employee.offices)
                ).filter(models.Employee.id == user.employee_id).first()
            else:
                # Fallback: try to find employee by username/email
                employee = db.query(models.Employee).options(
                    selectinload(models.Employee.offices)
                ).filter(
                    models.Employee.email.contains(user.username)
                ).first()
            
            # Get office IDs from many-to-many relationship
            office_ids = []
            primary_office_id = None
            if employee:
                if hasattr(employee, 'offices') and employee.offices:
                    office_ids = [o.id for o in employee.offices]
                elif employee.office_id:
                    # Backward compatibility: if only office_id is set, use it
                    office_ids = [employee.office_id]
                primary_office_id = office_ids[0] if office_ids else employee.office_id
            
            return {
                "email": user_email,
                "groups": groups,
                "employee_id": employee.id if employee else None,
                "office_id": primary_office_id,  # Deprecated: kept for backward compatibility, uses first office
                "office_ids": office_ids,  # Many-to-many relationship - all offices
                "is_authenticated": True,
            }
        # If token is invalid/expired, require authentication
        elif not (session_obj and session_obj.user):
            # Invalid or expired token - require login
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired authentication token. Please log in again."
            )
    
    # If no authorization header, require authentication
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in."
        )
    
    client_ip = request.client.host if request.client else "unknown"
    
    # Handle X-Forwarded-For (proxy may set this)
    if x_forwarded_for:
        # Take first IP in chain
        client_ip = x_forwarded_for.split(",")[0].strip()
    
    # In production, verify trusted source
    if not DEV_MODE:
        if TRUSTED_PROXY_IPS and not is_trusted_source(client_ip):
            raise HTTPException(
                status_code=401,
                detail="Request not from trusted proxy source"
            )
    
    # Get user email
    user_email = None
    used_fallback_employee = False  # Track if we used fallback employee lookup
    
    if DEV_MODE:
        # Development mode: use header if present, otherwise use dev user or configured default
        if x_authenticated_user:
            user_email = x_authenticated_user.lower().strip()
        elif DEV_USER_EMAIL:
            user_email = DEV_USER_EMAIL.lower().strip()
        else:
            # Use DEV_ADMIN_EMAIL environment variable, or try to find first employee
            dev_admin_email = os.getenv("DEV_ADMIN_EMAIL", "")
            if dev_admin_email:
                user_email = dev_admin_email.lower().strip()
            else:
                # In dev mode, try to find first employee with email
                # This allows dev to work without configuration
                import logging
                dev_logger = logging.getLogger(__name__)
                dev_logger.warning(
                    "DEV_ADMIN_EMAIL not set. Attempting to find first employee for dev mode. "
                    "Set DEV_ADMIN_EMAIL environment variable to avoid this warning."
                )
                
                # Try to find an employee with an email
                employee = db.query(models.Employee).options(
                    selectinload(models.Employee.offices)
                ).filter(
                    models.Employee.email.isnot(None)
                ).first()
                
                if employee and employee.email:
                    user_email = employee.email.lower().strip()
                    used_fallback_employee = True
                    dev_logger.info(f"Using employee email for dev mode: {user_email}")
                else:
                    # Last resort: require header or env var
                    raise HTTPException(
                        status_code=401,
                        detail="Missing authentication. Set DEV_ADMIN_EMAIL environment variable or provide X-Authenticated-User header."
                    )
    else:
        # Production: require header
        if not x_authenticated_user:
            raise HTTPException(
                status_code=401,
                detail="Missing authentication header"
            )
        user_email = x_authenticated_user.lower().strip()
    
    # Parse groups
    groups = []
    if x_groups:
        groups = [g.strip() for g in x_groups.split(",") if g.strip()]
    
    # Grant admin access to configured admin email (if set)
    admin_email = os.getenv("ADMIN_EMAIL", "")
    dev_admin_email = os.getenv("DEV_ADMIN_EMAIL", "")
    if admin_email and user_email == admin_email.lower().strip() and "admin" not in groups:
        groups.append("admin")
    # Also grant admin to DEV_ADMIN_EMAIL in dev mode
    if DEV_MODE and dev_admin_email and user_email == dev_admin_email.lower().strip() and "admin" not in groups:
        groups.append("admin")
    
    # In dev mode, check for DEV_USER_GROUPS environment variable
    # Also grant admin if we used fallback employee lookup (for dev convenience)
    if DEV_MODE:
        dev_groups = os.getenv("DEV_USER_GROUPS", "")
        if dev_groups and user_email == (DEV_USER_EMAIL or user_email):
            dev_groups_list = [g.strip() for g in dev_groups.split(",") if g.strip()]
            groups.extend(dev_groups_list)
            groups = list(set(groups))  # Remove duplicates
        
        # In dev mode, if we used fallback employee lookup, grant admin for convenience
        # This makes dev mode work without configuration
        if used_fallback_employee and "admin" not in groups:
            groups.append("admin")
    
    # Look up Employee record to get office_ids (many-to-many relationship)
    employee = db.query(models.Employee).options(
        selectinload(models.Employee.offices)
    ).filter(
        models.Employee.email == user_email
    ).first()
    
    # If employee not found, try to find by name (fallback for existing data)
    if not employee:
        # Try matching by email domain or name
        # For now, return user without office access
        return {
            "email": user_email,
            "groups": groups,
            "employee_id": None,
            "office_id": None,  # Deprecated: kept for backward compatibility
            "office_ids": [],  # Many-to-many relationship
            "is_authenticated": True,
        }
    
    # Get office IDs from many-to-many relationship
    office_ids = []
    if hasattr(employee, 'offices') and employee.offices:
        office_ids = [o.id for o in employee.offices]
    elif employee.office_id:
        # Backward compatibility: if only office_id is set, use it
        office_ids = [employee.office_id]
    
    # For backward compatibility, set office_id to first office (if any)
    # This is used by some authorization checks
    primary_office_id = office_ids[0] if office_ids else employee.office_id
    
    return {
        "email": user_email,
        "groups": groups,
        "employee_id": employee.id,
        "office_id": primary_office_id,  # Deprecated: kept for backward compatibility, uses first office
        "office_ids": office_ids,  # Many-to-many relationship - all offices
        "is_authenticated": True,
    }


def require_role(user: Dict, allowed_roles: set[str]) -> None:
    """Require user to have one of the allowed roles."""
    user_roles = set(user.get("groups", []))
    if not allowed_roles.intersection(user_roles):
        raise HTTPException(
            status_code=403,
            detail=f"Requires one of these roles: {', '.join(allowed_roles)}"
        )


def require_office_access(
    user: Dict,
    target_office_id: Optional[int],
    db: Session,
    for_modification: bool = False,
) -> bool:
    """
    Verify user has access to the specified office.
    
    Rules:
    - Admin users (in 'admin' group) can access any office for both viewing and modification
    - For VIEWING: All authenticated users can view all offices
    - For MODIFICATION: Users can only modify data from their own office (office_id matches)
    - Otherwise, deny access for modification
    """
    # Admin can access everything
    if "admin" in user.get("groups", []):
        return True
    
    # For viewing, all authenticated users can see all data
    if not for_modification:
        return True
    
    # For modification, user must have an office_id/office_ids and it must match (if target has an office)
    # If target_office_id is None, allow modification (employee has no office - anyone can modify)
    if target_office_id is None:
        return True
    
    # Get user's office IDs (many-to-many relationship)
    user_office_ids = user.get("office_ids", [])
    # Backward compatibility: if office_ids not available, use office_id
    if not user_office_ids:
        user_office_id = user.get("office_id")
        if user_office_id:
            user_office_ids = [user_office_id]
    
    if not user_office_ids:
        # User has no office but target has an office - deny access (unless admin, already handled)
        raise HTTPException(
            status_code=403,
            detail="User not associated with an office. Cannot modify data for employees with offices."
        )
    
    # User and target both have offices - user must be assigned to target office
    if target_office_id not in user_office_ids:
        raise HTTPException(
            status_code=403,
            detail="You can only modify data from your assigned office"
        )
    
    return True


def require_agency_access(
    user: Dict,
    agency_id: int,
    db: Session,
    for_modification: bool = False,
) -> bool:
    """
    Verify user has access to the specified agency.
    
    For viewing: All users can view all agencies.
    For modification: Checks that the agency's office_id matches user's office_id.
    """
    agency = db.get(models.Agency, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    return require_office_access(user, agency.office_id, db, for_modification=for_modification)


def require_authenticated(user: Dict) -> None:
    """Require user to be authenticated."""
    if not user.get("is_authenticated", False):
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

