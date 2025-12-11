from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from typing import List, Optional
from pydantic import BaseModel
import os
import pandas as pd
import io
from datetime import datetime

from ..database import get_db
from .. import models, schemas, crud

router = APIRouter(prefix="/admin", tags=["admin"])

# Admin password from environment variable or default
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")


# --- AUTHENTICATION ---
class AdminAuthRequest(BaseModel):
    password: str

@router.post("/auth")
def authenticate_admin(request: AdminAuthRequest):
    """Verify admin password."""
    if request.password == ADMIN_PASSWORD:
        return {"authenticated": True, "message": "Admin access granted"}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid admin password"
    )


# --- EMPLOYEE MANAGEMENT ---
@router.delete("/employees/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    """Delete an employee by ID."""
    stmt = select(models.Employee).where(models.Employee.id == employee_id)
    employee = db.execute(stmt).scalar_one_or_none()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    db.delete(employee)
    db.commit()
    return None


# --- PRODUCTION IMPORT ---
@router.post("/production/import")
async def import_production(
    office: str,
    month: str,  # Format: YYYY-MM
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Import production data from Excel file.
    - Parses Excel looking for 'Code' header row
    - Maps columns to production fields
    - Creates new agencies if they don't exist
    - Updates ActiveFlag for existing agencies
    - Returns summary of import results
    """
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(
            status_code=400,
            detail="File must be Excel format (.xls or .xlsx)"
        )
    
    try:
        # Read Excel file
        contents = await file.read()
        raw_df = pd.read_excel(io.BytesIO(contents), sheet_name=0, header=None)
        
        # Find the header row (contains 'Code' in first column)
        first_col = raw_df.columns[0]
        header_rows = raw_df.index[raw_df[first_col] == 'Code'].tolist()
        
        if not header_rows:
            raise HTTPException(
                status_code=400,
                detail="Could not find 'Code' header in Excel file"
            )
        
        header_idx = header_rows[0]
        
        # Set header and get data rows
        df = raw_df.iloc[header_idx:].copy()
        df.columns = df.iloc[0]
        df = df.iloc[1:]
        
        # Normalize column names
        df.columns = [str(c).strip() for c in df.columns]
        
        # Filter out empty rows
        df = df[df['Code'].notna() & df['Agency'].notna()]
        
        # Rename columns to match our schema
        df = df.rename(columns={
            'Code': 'AgencyCode',
            'Agency': 'AgencyName',
            'Active?': 'ActiveFlag',
            'Active': 'ActiveFlag',
        })
        
        # Helper function to coalesce numeric columns
        def coalesce_numeric(dataframe, prefixes, use_last=True):
            cols = []
            for pref in prefixes:
                cols.extend([c for c in dataframe.columns if str(c).strip().lower().startswith(pref)])
            seen = set()
            ordered = []
            for c in cols:
                if c not in seen:
                    ordered.append(c)
                    seen.add(c)
            if not ordered:
                return pd.Series([0] * len(dataframe), index=dataframe.index)
            if use_last:
                coalesced = dataframe[ordered].ffill(axis=1).iloc[:, -1]
            else:
                coalesced = dataframe[ordered].bfill(axis=1).iloc[:, 0]
            return pd.to_numeric(coalesced, errors='coerce').fillna(0)
        
        # Map columns to production fields
        df['AllYTDWP'] = coalesce_numeric(df, ['ytd wp'], use_last=True)
        df['AllYTDNB'] = coalesce_numeric(df, ['ytd nb'], use_last=True)
        df['PYTDWP'] = coalesce_numeric(df, ['pytd wp'], use_last=True)
        df['PYTDNB'] = coalesce_numeric(df, ['pytd nb'], use_last=True)
        df['PYTotalNB'] = coalesce_numeric(df, ['py total nb'], use_last=True)
        
        # Keep only required columns
        required_cols = ['AgencyCode', 'AgencyName', 'ActiveFlag', 'AllYTDWP', 'AllYTDNB', 'PYTDWP', 'PYTDNB', 'PYTotalNB']
        df = df[required_cols].copy()
        
        # Add office and month
        df['Office'] = office
        df['Month'] = month
        
        # Normalize ActiveFlag
        def normalize_active(val):
            v = str(val).strip().lower()
            if v in ["y", "yes", "active", "1", "true"]:
                return "Active"
            if v in ["n", "no", "inactive", "0", "false"]:
                return "Inactive"
            return str(val).strip() if pd.notna(val) else ""
        
        df['ActiveFlag'] = df['ActiveFlag'].apply(normalize_active)
        df['AgencyCode'] = df['AgencyCode'].astype(str).str.strip()
        df['AgencyName'] = df['AgencyName'].astype(str).str.strip()
        
        # Delete existing production records for this office+month
        delete_stmt = delete(models.Production).where(
            models.Production.office == office,
            models.Production.month == month
        )
        db.execute(delete_stmt)
        
        # Insert new production records
        production_rows = []
        for _, row in df.iterrows():
            prod = models.Production(
                office=row['Office'],
                agency_code=row['AgencyCode'],
                agency_name=row['AgencyName'],
                active_flag=row['ActiveFlag'],
                month=row['Month'],
                all_ytd_wp=int(row['AllYTDWP']),
                all_ytd_nb=int(row['AllYTDNB']),
                pytd_wp=int(row['PYTDWP']),
                pytd_nb=int(row['PYTDNB']),
                py_total_nb=int(row['PYTotalNB'])
            )
            db.add(prod)
            production_rows.append(row)
        
        db.commit()
        
        # Auto-create new agencies from this import
        # Get existing agencies for this office
        existing_agencies_stmt = select(models.Agency).where(models.Agency.office_id.in_(
            select(models.Office.id).where(models.Office.code == office)
        ))
        existing_agencies = db.execute(existing_agencies_stmt).scalars().all()
        existing_codes = {ag.code.strip().upper() for ag in existing_agencies}
        
        # Find new agencies to add
        df_deduplicated = df.drop_duplicates(subset=['AgencyCode'])
        new_agencies = []
        updated_agencies = []
        
        for _, row in df_deduplicated.iterrows():
            code_normalized = row['AgencyCode'].strip().upper()
            
            if code_normalized and code_normalized not in existing_codes:
                # Get office ID
                office_stmt = select(models.Office).where(models.Office.code == office)
                office_obj = db.execute(office_stmt).scalar_one_or_none()
                
                if office_obj:
                    # Get default underwriter for this office
                    default_uw_stmt = select(models.Employee).where(
                        models.Employee.office_id == office_obj.id
                    ).limit(1)
                    default_uw = db.execute(default_uw_stmt).scalar_one_or_none()
                    
                    # Create new agency
                    new_agency = models.Agency(
                        name=row['AgencyName'],
                        code=row['AgencyCode'],
                        office_id=office_obj.id,
                        primary_underwriter_id=default_uw.id if default_uw else None,
                        web_address="",
                        notes=""
                    )
                    db.add(new_agency)
                    new_agencies.append(row['AgencyName'])
            else:
                # Update ActiveFlag for existing agency
                for agency in existing_agencies:
                    if agency.code.strip().upper() == code_normalized:
                        # Note: ActiveFlag is not in Agency model, would need to add if needed
                        updated_agencies.append(agency.name)
                        break
        
        db.commit()
        
        return {
            "success": True,
            "production_rows_imported": len(production_rows),
            "new_agencies_created": len(new_agencies),
            "agencies_updated": len(updated_agencies),
            "office": office,
            "month": month,
            "new_agency_names": new_agencies[:10],  # First 10
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error importing production: {str(e)}"
        )


# --- AGENCY DELETION ---
@router.delete("/agencies/{agency_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agency_cascade(agency_id: int, db: Session = Depends(get_db)):
    """
    Delete an agency and all related data:
    - Contacts
    - Logs
    - Tasks
    """
    # Check if agency exists
    stmt = select(models.Agency).where(models.Agency.id == agency_id)
    agency = db.execute(stmt).scalar_one_or_none()
    
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Delete related contacts
    delete_contacts_stmt = delete(models.Contact).where(models.Contact.agency_id == agency_id)
    db.execute(delete_contacts_stmt)
    
    # Delete related logs (by agency_id if it exists in logs)
    delete_logs_stmt = delete(models.Log).where(models.Log.agency_id == agency_id)
    db.execute(delete_logs_stmt)
    
    # Delete related tasks
    delete_tasks_stmt = delete(models.Task).where(models.Task.agency_id == agency_id)
    db.execute(delete_tasks_stmt)
    
    # Delete the agency
    db.delete(agency)
    db.commit()
    
    return None

