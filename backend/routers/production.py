from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status, Request
from sqlalchemy.orm import Session

from .. import crud, schemas, models
from ..database import get_db
from ..auth.proxy_headers import (
    get_current_user,
    require_office_access,
    require_authenticated,
)
from ..services.audit import log_audit_event

router = APIRouter(prefix="/production", tags=["production"])


@router.get("", response_model=List[schemas.Production])
def read_production(
    request: Request,
    office: Optional[str] = Query(None),
    agency_code: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get production data. All employees can view all production data."""
    require_authenticated(user)
    
    # All users can view all production data (no filtering by office)
    production_data = crud.get_production(db, office=office, agency_code=agency_code)
    
    # Skip audit logging for VIEW actions to improve performance
    
    return production_data


@router.post("", response_model=schemas.Production, status_code=status.HTTP_201_CREATED)
def create_production(payload: schemas.ProductionCreate, db: Session = Depends(get_db)):
    return crud.create_production(db, payload)


@router.post("/bulk", status_code=status.HTTP_202_ACCEPTED)
def bulk_upsert_production(rows: List[schemas.ProductionCreate], db: Session = Depends(get_db)):
    written = crud.bulk_upsert_production(db, rows)
    return {"rows_written": written}
