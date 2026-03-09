from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from .. import crud, schemas
from ..auth.proxy_headers import get_current_user

router = APIRouter(prefix="/renewals", tags=["renewals"])


# IMPORTANT: List route must come before detail route to avoid route conflicts
@router.get("", response_model=List[schemas.Renewal])
def get_renewals(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Get all renewals for the current user"""
    employee_id = user.get("employee_id")
    if not employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee ID not found")
    
    renewals = crud.get_renewals(db, employee_id=employee_id, status=status)
    return renewals


@router.get("/contacts-due", response_model=List[dict])
def get_contacts_due_for_contact(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Get contacts that are due for contact based on their contact frequency"""
    employee_id = user.get("employee_id")
    if not employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee ID not found")
    
    contacts_due = crud.get_contacts_due_for_contact(db, employee_id=employee_id)
    return contacts_due


@router.get("/{renewal_id}", response_model=schemas.Renewal)
def get_renewal(
    renewal_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Get a specific renewal"""
    employee_id = user.get("employee_id")
    if not employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee ID not found")
    
    renewal = crud.get_renewal(db, renewal_id)
    if not renewal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Renewal not found")
    
    # Ensure user can only access their own renewals
    if renewal.created_by_employee_id != employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    return renewal


@router.post("/", response_model=schemas.Renewal, status_code=status.HTTP_201_CREATED)
def create_renewal(
    renewal: schemas.RenewalCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Create a new renewal"""
    employee_id = user.get("employee_id")
    if not employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee ID not found")
    
    return crud.create_renewal(db, renewal, employee_id)


@router.post("/bulk", response_model=List[schemas.Renewal], status_code=status.HTTP_201_CREATED)
def create_renewals_bulk(
    renewals: List[schemas.RenewalCreate],
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Create multiple renewals at once, skipping duplicates"""
    employee_id = user.get("employee_id")
    if not employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee ID not found")
    
    # Get existing renewals for this user to check for duplicates
    existing_renewals = crud.get_renewals(db, employee_id=employee_id)
    
    created = []
    skipped = []
    
    for renewal in renewals:
        # Check if this renewal already exists (same policy_number, insured_name, expiration_date)
        is_duplicate = any(
            existing.policy_number == renewal.policy_number
            and existing.insured_name.lower().strip() == renewal.insured_name.lower().strip()
            and existing.expiration_date.date() == renewal.expiration_date.date()
            for existing in existing_renewals
        )
        
        if is_duplicate:
            skipped.append(f"{renewal.policy_number} - {renewal.insured_name}")
            continue
        
        new_renewal = crud.create_renewal(db, renewal, employee_id)
        created.append(new_renewal)
        # Add to existing list to prevent duplicates within the same batch
        existing_renewals.append(new_renewal)
    
    return created


@router.put("/{renewal_id}", response_model=schemas.Renewal)
def update_renewal(
    renewal_id: int,
    renewal: schemas.RenewalUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Update a renewal"""
    employee_id = user.get("employee_id")
    if not employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee ID not found")
    
    existing = crud.get_renewal(db, renewal_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Renewal not found")
    
    # Ensure user can only update their own renewals
    if existing.created_by_employee_id != employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    updated = crud.update_renewal(db, renewal_id, renewal)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Renewal not found")
    
    return updated


@router.delete("/{renewal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_renewal(
    renewal_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Delete a renewal"""
    employee_id = user.get("employee_id")
    if not employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee ID not found")
    
    existing = crud.get_renewal(db, renewal_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Renewal not found")
    
    # Ensure user can only delete their own renewals
    if existing.created_by_employee_id != employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    success = crud.delete_renewal(db, renewal_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Renewal not found")
    
    return None
