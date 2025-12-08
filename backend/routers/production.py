from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/production", tags=["production"])


@router.get("", response_model=List[schemas.Production])
def read_production(
    office: Optional[str] = Query(None),
    agency_code: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return crud.get_production(db, office=office, agency_code=agency_code)


@router.post("", response_model=schemas.Production, status_code=status.HTTP_201_CREATED)
def create_production(payload: schemas.ProductionCreate, db: Session = Depends(get_db)):
    return crud.create_production(db, payload)


@router.post("/bulk", status_code=status.HTTP_202_ACCEPTED)
def bulk_upsert_production(rows: List[schemas.ProductionCreate], db: Session = Depends(get_db)):
    written = crud.bulk_upsert_production(db, rows)
    return {"rows_written": written}
