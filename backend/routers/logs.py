from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import schemas, crud
from ..database import get_db

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("", response_model=List[schemas.Log])
def read_logs(agency_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    return crud.get_logs(db, agency_id=agency_id)


@router.post("", response_model=schemas.Log, status_code=status.HTTP_201_CREATED)
def create_log(log: schemas.LogCreate, db: Session = Depends(get_db)):
    return crud.create_log(db, log)


@router.patch("/{log_id}", response_model=schemas.Log)
def update_log(log_id: int, payload: schemas.LogUpdate, db: Session = Depends(get_db)):
    updated = crud.update_log(db, log_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Log not found")
    return updated


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_log(log_id: int, db: Session = Depends(get_db)):
    deleted = crud.delete_log(db, log_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Log not found")
