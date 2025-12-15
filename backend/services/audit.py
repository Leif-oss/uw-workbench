"""
Audit logging service for tracking user actions.
"""
import json
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from .. import models


def log_audit_event(
    actor_email: str,
    action: str,  # VIEW, CREATE, UPDATE, DELETE, EXPORT
    entity_type: str,  # "agency", "office", "contact", "log", "task"
    entity_id: Optional[int] = None,
    office_id: Optional[int] = None,
    actor_employee_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    request_path: Optional[str] = None,
    request_method: Optional[str] = None,
    db: Session = None,
) -> models.AuditLog:
    """
    Log an audit event to the database.
    
    Args:
        actor_email: Email of the user performing the action
        action: Action type (VIEW, CREATE, UPDATE, DELETE, EXPORT)
        entity_type: Type of entity being acted upon
        entity_id: ID of the entity (if applicable)
        office_id: Office ID for scoping
        actor_employee_id: Employee ID of the actor
        details: Additional details as dict (will be JSON serialized)
        ip_address: IP address of the request
        user_agent: User agent string
        request_path: API path that was called
        request_method: HTTP method (GET, POST, etc.)
        db: Database session
    
    Returns:
        The created AuditLog record
    """
    if not db:
        # If no DB session provided, skip logging (shouldn't happen in production)
        return None
    
    audit_log = models.AuditLog(
        timestamp=datetime.utcnow(),
        actor_email=actor_email,
        actor_employee_id=actor_employee_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        office_id=office_id,
        details_json=json.dumps(details, default=str) if details else None,  # default=str handles datetime and other non-serializable types
        ip_address=ip_address,
        user_agent=user_agent,
        request_path=request_path,
        request_method=request_method,
    )
    
    db.add(audit_log)
    # Don't commit here - let the main request handler commit
    # This avoids blocking on every audit log write
    # The commit will happen automatically when the main request commits
    
    return audit_log


def get_entity_snapshot(entity: Any) -> Dict[str, Any]:
    """
    Create a snapshot of an entity's current state for audit logging.
    
    Args:
        entity: SQLAlchemy model instance
    
    Returns:
        Dict of entity attributes (excluding relationships)
    """
    if not entity:
        return {}
    
    snapshot = {}
    for column in entity.__table__.columns:
        value = getattr(entity, column.name, None)
        # Skip binary/large data
        if isinstance(value, (bytes, bytearray)):
            continue
        # Convert datetime to string for JSON serialization
        if isinstance(value, datetime):
            value = value.isoformat()
        snapshot[column.name] = value
    
    return snapshot

