from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import schemas, crud
from ..database import get_db

router = APIRouter(prefix="/offices", tags=["offices"])


@router.get("", response_model=List[schemas.Office])
def read_offices(db: Session = Depends(get_db)):
    return crud.get_offices(db)


@router.post("", response_model=schemas.Office, status_code=status.HTTP_201_CREATED)
def create_office(office: schemas.OfficeCreate, db: Session = Depends(get_db)):
    existing = [o for o in crud.get_offices(db) if o.code == office.code]
    if existing:
        raise HTTPException(status_code=400, detail="Office code already exists")
    return crud.create_office(db, office)
