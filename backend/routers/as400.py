"""
Stub AS400 submission endpoint.
For now, just logs payloads and returns fake success.
"""
import json
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from .. import models
from ..database import get_db
from ..auth.proxy_headers import get_current_user, require_authenticated

router = APIRouter(prefix="/as400", tags=["as400"])

logger = logging.getLogger("uvicorn.error")


@router.post("/submit")
def submit_to_as400(
    payload: Dict[str, Any],
    draft_id: Optional[int] = None,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Stub endpoint for AS400 submission.
    For now, stores payload in OutboxMessage and returns fake success.
    """
    require_authenticated(user)
    
    # Get employee_id
    employee_id = user.get("employee_id")
    
    # Create outbox message
    outbox = models.OutboxMessage(
        draft_id=draft_id,
        payload_json=payload,
        submission_status="pending",
        created_at=datetime.utcnow(),
        created_by=employee_id,
    )
    db.add(outbox)
    
    # Simulate submission (stub)
    outbox.submitted_at = datetime.utcnow()
    outbox.submission_status = "success"
    outbox.submission_response = json.dumps({
        "status": "accepted",
        "message": "Submission received (stub endpoint)",
        "timestamp": datetime.utcnow().isoformat(),
    })
    
    db.commit()
    db.refresh(outbox)
    
    logger.info(f"[AS400 STUB] Submitted draft {draft_id} to AS400 (stub)")
    logger.info(f"[AS400 STUB] Payload keys: {list(payload.keys())}")
    
    return {
        "status": "success",
        "message": "Submission received (stub endpoint - AS400 integration not yet implemented)",
        "outbox_id": outbox.id,
        "submitted_at": outbox.submitted_at.isoformat(),
    }
