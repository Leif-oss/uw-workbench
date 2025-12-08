from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/agencies",
    tags=["agencies"]
)

@router.get("/", response_model=List[schemas.Agency])
def get_agencies(db: Session = Depends(get_db)):
    return db.query(models.Agency).all()

@router.get("/{agency_id}", response_model=schemas.Agency)
def get_agency(agency_id: int, db: Session = Depends(get_db)):
    agency = db.query(models.Agency).filter(models.Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    return agency

@router.post("/", response_model=schemas.Agency)
def create_agency(agency: schemas.AgencyCreate, db: Session = Depends(get_db)):
    new_agency = models.Agency(**agency.dict())
    db.add(new_agency)
    db.commit()
    db.refresh(new_agency)
    return new_agency

@router.put("/{agency_id}", response_model=schemas.Agency)
def update_agency(agency_id: int, updated: schemas.AgencyCreate, db: Session = Depends(get_db)):
    agency = db.query(models.Agency).filter(models.Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    for key, value in updated.dict().items():
        setattr(agency, key, value)

    db.commit()
    db.refresh(agency)
    return agency

@router.delete("/{agency_id}")
def delete_agency(agency_id: int, db: Session = Depends(get_db)):
    agency = db.query(models.Agency).filter(models.Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    db.delete(agency)
    db.commit()
    return {"detail": "Agency deleted"}
