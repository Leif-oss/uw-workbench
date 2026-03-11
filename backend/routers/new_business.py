from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from .. import crud, schemas
from ..auth.proxy_headers import get_current_user

router = APIRouter(prefix="/new-business", tags=["new-business"])


@router.get("", response_model=List[schemas.NewBusiness])
@router.get("/", response_model=List[schemas.NewBusiness])
def get_new_business(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Get all new business items for the current user that should appear today"""
    employee_id = user.get("employee_id")
    if not employee_id:
        return []
    
    items = crud.get_new_business(db, employee_id=employee_id, status=status)
    return items


@router.get("/{new_business_id}", response_model=schemas.NewBusiness)
def get_new_business_item(
    new_business_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Get a specific new business item"""
    employee_id = user.get("employee_id")
    if not employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee ID not found")
    
    item = crud.get_new_business_item(db, new_business_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="New business item not found")
    
    # Ensure user can only access their own items
    if item.created_by_employee_id != employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    return item


@router.post("", response_model=schemas.NewBusiness, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=schemas.NewBusiness, status_code=status.HTTP_201_CREATED)
def create_new_business(
    new_business: schemas.NewBusinessCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Create a new business tracking item"""
    employee_id = user.get("employee_id")
    if not employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee ID not found")
    
    # Validate frequency_days
    if new_business.frequency_days not in [1, 7, 14]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="frequency_days must be 1 (daily), 7 (weekly), or 14 (bi-weekly)"
        )
    
    return crud.create_new_business(db, new_business, employee_id)


@router.put("/{new_business_id}", response_model=schemas.NewBusiness)
def update_new_business(
    new_business_id: int,
    new_business: schemas.NewBusinessUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Update a new business item"""
    employee_id = user.get("employee_id")
    if not employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee ID not found")
    
    # Check ownership
    existing = crud.get_new_business_item(db, new_business_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="New business item not found")
    
    if existing.created_by_employee_id != employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Validate frequency_days if provided
    if new_business.frequency_days is not None and new_business.frequency_days not in [1, 7, 14]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="frequency_days must be 1 (daily), 7 (weekly), or 14 (bi-weekly)"
        )
    
    updated = crud.update_new_business(db, new_business_id, new_business)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="New business item not found")
    
    return updated


@router.delete("/{new_business_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_new_business(
    new_business_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Delete a new business item"""
    employee_id = user.get("employee_id")
    if not employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee ID not found")
    
    # Check ownership
    existing = crud.get_new_business_item(db, new_business_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="New business item not found")
    
    if existing.created_by_employee_id != employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    success = crud.delete_new_business(db, new_business_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="New business item not found")
    
    return None
