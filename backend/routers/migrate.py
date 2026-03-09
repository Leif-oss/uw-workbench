"""
Database migration endpoint for Cloud Run.
Only enabled when TEMP_SETUP_MODE is true.
"""
import os
from fastapi import APIRouter, HTTPException
from alembic.config import Config
from alembic import command
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/run-migrations")
def run_migrations():
    """
    Run database migrations.
    Only works when TEMP_SETUP_MODE is enabled.
    """
    temp_setup_mode = os.getenv("TEMP_SETUP_MODE", "false").lower() == "true"
    if not temp_setup_mode:
        raise HTTPException(
            status_code=403,
            detail="This endpoint is only available in TEMP_SETUP_MODE"
        )
    
    try:
        # Run alembic upgrade head
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        
        return {
            "success": True,
            "message": "Migrations completed successfully"
        }
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Migration failed: {str(e)}"
        )
