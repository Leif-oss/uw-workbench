from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import schemas, crud
from ..database import get_db

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("", response_model=List[schemas.Employee])
def read_employees(office: Optional[str] = Query(None), db: Session = Depends(get_db)):
    return crud.get_employees(db, office=office)


@router.post("", response_model=schemas.Employee, status_code=status.HTTP_201_CREATED)
def create_employee(emp: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    return crud.create_employee(db, emp)


@router.patch("/{employee_id}", response_model=schemas.Employee)
def update_employee(employee_id: int, payload: schemas.EmployeeUpdate, db: Session = Depends(get_db)):
    updated = crud.update_employee(db, employee_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Employee not found")
    return updated
