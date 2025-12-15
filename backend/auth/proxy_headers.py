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
    db: Session = Depends(get_db),
) -> Dict:
    """
    Extract current user from proxy headers or dev mode.
    
    Returns dict with:
    - email: str
    - groups: List[str]
    - employee_id: Optional[int]
    - office_id: Optional[int]
    """
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
    
    if DEV_MODE:
        # Development mode: use header if present, otherwise use dev user or default to admin
        if x_authenticated_user:
            user_email = x_authenticated_user.lower().strip()
        elif DEV_USER_EMAIL:
            user_email = DEV_USER_EMAIL.lower().strip()
        else:
            # Default to admin user in dev mode
            user_email = "leif@deanshomer.com"
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
    
    # Grant admin access to leif@deanshomer.com
    if user_email == "leif@deanshomer.com" and "admin" not in groups:
        groups.append("admin")
    
    # In dev mode, check for DEV_USER_GROUPS environment variable
    if DEV_MODE:
        dev_groups = os.getenv("DEV_USER_GROUPS", "")
        if dev_groups and user_email == (DEV_USER_EMAIL or user_email):
            dev_groups_list = [g.strip() for g in dev_groups.split(",") if g.strip()]
            groups.extend(dev_groups_list)
            groups = list(set(groups))  # Remove duplicates
    
    # Look up Employee record to get office_id
    employee = db.query(models.Employee).filter(
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
            "office_id": None,
            "is_authenticated": True,
        }
    
    return {
        "email": user_email,
        "groups": groups,
        "employee_id": employee.id,
        "office_id": employee.office_id,
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
    
    # For modification, user must have an office_id and it must match
    user_office_id = user.get("office_id")
    if not user_office_id:
        raise HTTPException(
            status_code=403,
            detail="User not associated with an office. Cannot modify data."
        )
    
    # If target_office_id is None, only admins can modify (already handled above)
    # For non-admins, if target has no office, deny access
    if target_office_id is None:
        raise HTTPException(
            status_code=403,
            detail="Cannot modify data without an office assignment"
        )
    
    # Check if office_id matches
    if user_office_id != target_office_id:
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

