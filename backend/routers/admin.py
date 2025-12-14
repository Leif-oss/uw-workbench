from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import select, delete, func
from typing import List, Optional
from pydantic import BaseModel
import os
import pandas as pd
import io
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

from ..database import get_db
from .. import models, schemas, crud

router = APIRouter(prefix="/admin", tags=["admin"])

# Admin password verification dependency
def verify_admin_password(request: "AdminAuthRequest"):
    """Verify admin password."""
    if request.password == ADMIN_PASSWORD:
        return True
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid admin password"
    )

# Load environment variables from private folder (outside Git tracking)
env_path = Path(__file__).parent.parent.parent / 'private' / '.env'
load_dotenv(dotenv_path=env_path)

# Admin password from environment variable - NO DEFAULT for security
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

# Debug logging
import logging
logger = logging.getLogger("uvicorn.error")
logger.info(f"[Admin Router] .env path: {env_path}")
logger.info(f"[Admin Router] .env exists: {env_path.exists()}")
logger.info(f"[Admin Router] ADMIN_PASSWORD loaded: {'Yes' if ADMIN_PASSWORD else 'No'}")
if ADMIN_PASSWORD:
    logger.info(f"[Admin Router] ADMIN_PASSWORD length: {len(ADMIN_PASSWORD)}")

if not ADMIN_PASSWORD:
    raise ValueError(
        "ADMIN_PASSWORD environment variable must be set! "
        "Add it to private/.env file. Never use default passwords in production."
    )


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


# --- PRODUCTION IMPORT (MULTI-OFFICE) ---
@router.post("/production/import-multi")
async def import_production_multi(
    month: str,  # Format: YYYY-MM
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Import production data from Excel file with multiple office tabs.
    - Processes all office sheets (skips 'All Offices', 'Emails', 'Working')
    - Uses sheet name as office code
    - Extracts all fields: Standard Lines, Surplus Lines, All Lines, Prior Year data, metrics
    - Creates new agencies if they don't exist
    - Returns summary of import results per office
    """
    if not file.filename.endswith(('.xls', '.xlsx', '.xlsm')):
        raise HTTPException(
            status_code=400,
            detail="File must be Excel format (.xls, .xlsx, or .xlsm)"
        )
    
    try:
        # Read Excel file
        contents = await file.read()
        xl = pd.ExcelFile(io.BytesIO(contents))
        
        # Get office sheets (skip summary sheets)
        office_sheets = [s for s in xl.sheet_names if s not in ['All Offices', 'Emails', 'Working']]
        
        if not office_sheets:
            raise HTTPException(
                status_code=400,
                detail="No office sheets found. Expected sheets named with office codes."
            )
        
        results = {
            "success": True,
            "month": month,
            "offices_processed": [],
            "total_production_rows": 0,
            "total_new_agencies": 0,
            "errors": []
        }
        
        # Process each office sheet
        for office_code in office_sheets:
            try:
                # Read the sheet
                raw_df = pd.read_excel(xl, sheet_name=office_code, header=None)
                
                # Find header row (row 5, index 4) - contains "Code", "Agency", etc.
                header_row_idx = None
                for idx in range(min(10, len(raw_df))):
                    first_col_val = str(raw_df.iloc[idx, 0]).strip() if pd.notna(raw_df.iloc[idx, 0]) else ""
                    if first_col_val == "Code":
                        header_row_idx = idx
                        break
                
                if header_row_idx is None:
                    results["errors"].append(f"{office_code}: Could not find header row with 'Code'")
                    continue
                
                # Set headers from the header row
                df = raw_df.iloc[header_row_idx:].copy()
                df.columns = df.iloc[0]
                df = df.iloc[1:]
                
                # Normalize column names
                df.columns = [str(c).strip() if pd.notna(c) else f"col_{i}" for i, c in enumerate(df.columns)]
                
                # Filter out empty rows
                df = df[df['Code'].notna() & df['Agency'].notna()]
                
                if len(df) == 0:
                    results["errors"].append(f"{office_code}: No data rows found")
                    continue
                
                # Map columns to our schema
                def safe_int(val):
                    try:
                        if pd.isna(val):
                            return None
                        return int(float(val))
                    except (ValueError, TypeError):
                        return None
                
                def safe_float(val):
                    try:
                        if pd.isna(val):
                            return None
                        return float(val)
                    except (ValueError, TypeError):
                        return None
                
                def safe_str(val):
                    if pd.isna(val):
                        return None
                    return str(val).strip() if str(val).strip() else None
                
                # Extract all fields by column index (headers are merged, so use position)
                # Column mapping: Code(0), Affiliated Code(1), Agency(2), Active?(3)
                # Standard Lines YTD: WP(4), NB#(5)
                # Surplus Lines YTD: WP(6), NB#(7)
                # All Lines YTD: WP(8), NB#(9)
                # Standard Lines PYTD: WP(10), NB#(11), Total NB#(12)
                # Surplus Lines PYTD: WP(13), NB#(14), Total NB#(15)
                # All Lines PYTD: WP(16), NB#(17), Total NB#(18)
                # Premium Change(19), 3-YR+ LR(20), 12 Mo Bind Ratio(21), 12 Mo Bound(22), 12 Mo Quoted(23), 12 Mo Declined(24)
                
                production_rows = []
                for idx, row in df.iterrows():
                    try:
                        # Get values by column index since headers are merged
                        def get_val(col_idx, converter=safe_str):
                            if len(row) > col_idx:
                                return converter(row.iloc[col_idx])
                            return None
                        
                        prod_data = {
                            "office": office_code,
                            "agency_code": get_val(0),
                            "affiliated_code": get_val(1),
                            "agency_name": get_val(2),
                            "active_flag": get_val(3),
                            "month": month,
                            
                            # Standard Lines - Current Year
                            "standard_lines_ytd_wp": get_val(4, safe_int),
                            "standard_lines_ytd_nb": get_val(5, safe_int),
                            
                            # Surplus Lines - Current Year
                            "surplus_lines_ytd_wp": get_val(6, safe_int),
                            "surplus_lines_ytd_nb": get_val(7, safe_int),
                            
                            # All Lines - Current Year
                            "all_ytd_wp": get_val(8, safe_int),
                            "all_ytd_nb": get_val(9, safe_int),
                            
                            # Standard Lines - Prior Year
                            "standard_lines_pytd_wp": get_val(10, safe_int),
                            "standard_lines_pytd_nb": get_val(11, safe_int),
                            
                            # Surplus Lines - Prior Year
                            "surplus_lines_pytd_wp": get_val(13, safe_int),
                            "surplus_lines_pytd_nb": get_val(14, safe_int),
                            
                            # All Lines - Prior Year
                            "pytd_wp": get_val(16, safe_int),
                            "pytd_nb": get_val(17, safe_int),
                            "py_total_nb": get_val(18, safe_int),
                            
                            # Additional metrics
                            "premium_change": get_val(19, safe_int),
                            "three_year_plus": get_val(20, safe_int),
                            "twelve_mo_bind_ratio": get_val(21, safe_str),
                            "twelve_mo_bound": get_val(22, safe_int),
                            "twelve_mo_quoted": get_val(23, safe_int),
                            "twelve_mo_decline": get_val(24, safe_int),
                        }
                        
                        # Normalize active flag
                        if prod_data["active_flag"]:
                            af = str(prod_data["active_flag"]).strip().lower()
                            if af in ["y", "yes", "active", "1", "true"]:
                                prod_data["active_flag"] = "Active"
                            elif af in ["n", "no", "inactive", "0", "false"]:
                                prod_data["active_flag"] = "Inactive"
                        
                        # Skip if no agency code
                        if not prod_data["agency_code"]:
                            continue
                        
                        production_rows.append(prod_data)
                        
                    except Exception as e:
                        results["errors"].append(f"{office_code}: Error processing row - {str(e)}")
                        continue
                
                if not production_rows:
                    results["errors"].append(f"{office_code}: No valid production rows extracted")
                    continue
                
                # Remove duplicates: keep only the last occurrence of each agency_code
                # This handles cases where the same agency appears multiple times in the Excel
                seen_agencies = {}
                for idx, prod_data in enumerate(production_rows):
                    # Normalize agency code for comparison
                    agency_code_normalized = str(prod_data["agency_code"]).strip().upper() if prod_data["agency_code"] else None
                    if agency_code_normalized:
                        seen_agencies[agency_code_normalized] = idx
                
                # Filter to only keep the last occurrence of each agency
                unique_production_rows = [production_rows[idx] for idx in seen_agencies.values()]
                
                # Delete existing production records for this office+month
                # This ensures we don't accumulate data from multiple imports of the same month
                # We delete ALL records for this office+month, then insert fresh ones
                delete_stmt = delete(models.Production).where(
                    (models.Production.office == office_code) & (models.Production.month == month)
                )
                db.execute(delete_stmt)
                db.flush()  # Ensure deletion is applied before inserts
                
                # Insert new production records (now deduplicated)
                new_agencies_count = 0
                for prod_data in unique_production_rows:
                    prod = models.Production(**prod_data)
                    db.add(prod)
                    
                    # Auto-create agencies if they don't exist
                    code_normalized = prod_data["agency_code"].strip().upper()
                    existing_agency = db.execute(
                        select(models.Agency).where(models.Agency.code == code_normalized)
                    ).scalar_one_or_none()
                    
                    if not existing_agency:
                        # Get office ID
                        office_obj = db.execute(
                            select(models.Office).where(models.Office.code == office_code)
                        ).scalar_one_or_none()
                        
                        if office_obj:
                            default_uw = db.execute(
                                select(models.Employee).where(
                                    models.Employee.office_id == office_obj.id
                                ).limit(1)
                            ).scalar_one_or_none()
                            
                            new_agency = models.Agency(
                                name=prod_data["agency_name"],
                                code=prod_data["agency_code"],
                                office_id=office_obj.id,
                                primary_underwriter_id=default_uw.id if default_uw else None,
                                active_flag=prod_data["active_flag"],
                                web_address="",
                                notes=""
                            )
                            db.add(new_agency)
                            new_agencies_count += 1
                
                db.commit()
                
                results["offices_processed"].append({
                    "office": office_code,
                    "rows_imported": len(unique_production_rows),
                    "duplicates_removed": len(production_rows) - len(unique_production_rows),
                    "new_agencies": new_agencies_count
                })
                results["total_production_rows"] += len(unique_production_rows)
                results["total_new_agencies"] += new_agencies_count
                
            except Exception as e:
                results["errors"].append(f"{office_code}: {str(e)}")
                db.rollback()
                continue
        
        return results
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error importing production: {str(e)}"
        )


# --- PRODUCTION IMPORT (SINGLE OFFICE - KEEP FOR BACKWARD COMPATIBILITY) ---
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
        
        # Remove duplicates: keep only the last occurrence of each agency_code
        # This handles cases where the same agency appears multiple times in the Excel
        seen_agencies = {}
        for idx, row in df.iterrows():
            agency_code_normalized = str(row['AgencyCode']).strip().upper() if pd.notna(row['AgencyCode']) else None
            if agency_code_normalized:
                seen_agencies[agency_code_normalized] = idx
        
        # Filter to only keep the last occurrence of each agency
        df_unique = df.loc[[idx for idx in seen_agencies.values()]]
        
        # Delete existing production records for this office+month
        # This ensures we don't accumulate data from multiple imports of the same month
        delete_stmt = delete(models.Production).where(
            (models.Production.office == office) & (models.Production.month == month)
        )
        db.execute(delete_stmt)
        db.flush()  # Ensure deletion is applied before inserts
        
        # Insert new production records (now deduplicated)
        production_rows = []
        for _, row in df_unique.iterrows():
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


# --- CHECK REMAINING DATA (for diagnostics) ---
@router.post("/data-status")
def get_data_status(
    request: AdminAuthRequest,
    db: Session = Depends(get_db)
):
    """
    Get counts of all agency and production data.
    Useful for diagnostics after clearing data.
    Requires admin authentication.
    """
    # Verify admin password
    if request.password != ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin password"
        )
    
    try:
        prod_count = db.query(models.Production).count()
        agency_count = db.query(models.Agency).count()
        contact_count = db.query(models.Contact).count()
        log_count = db.query(models.Log).count()
        task_count = db.query(models.Task).count()
        
        # Get production data grouped by office
        prod_by_office = db.query(
            models.Production.office,
            func.count(models.Production.id).label('count')
        ).group_by(models.Production.office).all()
        
        # Get agencies grouped by office
        agencies_by_office = {}
        for agency in db.query(models.Agency).all():
            office_id = agency.office_id
            if office_id not in agencies_by_office:
                agencies_by_office[office_id] = []
            agencies_by_office[office_id].append({
                "id": agency.id,
                "name": agency.name,
                "code": agency.code
            })
        
        # Get some sample data to see what's remaining
        sample_prod = db.query(models.Production).limit(10).all()
        sample_agencies = db.query(models.Agency).limit(10).all()
        sample_logs = db.query(models.Log).limit(10).all()
        
        return {
            "counts": {
                "production": prod_count,
                "agencies": agency_count,
                "contacts": contact_count,
                "logs": log_count,
                "tasks": task_count,
            },
            "production_by_office": {office: count for office, count in prod_by_office},
            "samples": {
                "production": [{"id": p.id, "office": p.office, "agency_code": p.agency_code, "agency_name": p.agency_name, "month": p.month, "all_ytd_wp": p.all_ytd_wp} for p in sample_prod],
                "agencies": [{"id": a.id, "name": a.name, "code": a.code, "office_id": a.office_id} for a in sample_agencies],
                "logs": [{"id": l.id, "user": l.user, "agency_id": l.agency_id, "datetime": str(l.datetime), "action": l.action} for l in sample_logs],
            }
        }
    except Exception as e:
        return {"error": str(e)}


# --- CLEAR ALL AGENCY AND PRODUCTION DATA ---
@router.post("/clear-all-data")
def clear_all_agency_production_data(
    request: AdminAuthRequest,
    db: Session = Depends(get_db)
):
    """
    Clear ALL agency and production data from the database.
    This will delete:
    - All Production records
    - All Agency records (and their associated Contacts via CASCADE)
    - All Log records
    - All Task records
    
    This will NOT delete:
    - Offices
    - Employees
    - Submissions
    
    Requires admin authentication.
    """
    # Verify admin password
    if request.password != ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin password"
        )
    
    try:
        # Get counts before deletion
        prod_count = db.query(models.Production).count()
        agency_count = db.query(models.Agency).count()
        contact_count = db.query(models.Contact).count()
        log_count = db.query(models.Log).count()
        task_count = db.query(models.Task).count()
        
        # Delete in order to respect foreign key constraints
        # Use explicit table names to ensure we're deleting from the right tables
        
        # 1. Delete all Production records (no dependencies)
        deleted_prod = db.execute(delete(models.Production)).rowcount
        db.flush()
        
        # 2. Delete all Log records (they reference agencies but use SET NULL)
        deleted_log = db.execute(delete(models.Log)).rowcount
        db.flush()
        
        # 3. Delete all Task records (they reference agencies but use SET NULL)
        deleted_task = db.execute(delete(models.Task)).rowcount
        db.flush()
        
        # 4. Delete all Contact records (they will cascade from Agency, but let's be explicit)
        deleted_contact = db.execute(delete(models.Contact)).rowcount
        db.flush()
        
        # 5. Delete all Agency records (this will cascade delete any remaining contacts)
        deleted_agency = db.execute(delete(models.Agency)).rowcount
        db.flush()
        
        # Commit all deletions
        db.commit()
        
        # Verify deletion by checking counts again
        remaining_prod = db.query(models.Production).count()
        remaining_agency = db.query(models.Agency).count()
        remaining_contact = db.query(models.Contact).count()
        remaining_log = db.query(models.Log).count()
        remaining_task = db.query(models.Task).count()
        
        # Log what was actually deleted
        logger.info(f"[Clear All Data] Deleted: {deleted_prod} production, {deleted_agency} agencies, {deleted_contact} contacts, {deleted_log} logs, {deleted_task} tasks")
        logger.info(f"[Clear All Data] Remaining after delete: {remaining_prod} production, {remaining_agency} agencies, {remaining_contact} contacts, {remaining_log} logs, {remaining_task} tasks")
        
        if remaining_prod > 0 or remaining_agency > 0 or remaining_contact > 0 or remaining_log > 0 or remaining_task > 0:
            # Try one more time with explicit table deletion
            logger.warning(f"[Clear All Data] Some records remain, attempting second pass deletion")
            if remaining_prod > 0:
                db.execute(delete(models.Production))
            if remaining_log > 0:
                db.execute(delete(models.Log))
            if remaining_task > 0:
                db.execute(delete(models.Task))
            if remaining_contact > 0:
                db.execute(delete(models.Contact))
            if remaining_agency > 0:
                db.execute(delete(models.Agency))
            db.commit()
            
            # Check one more time
            final_prod = db.query(models.Production).count()
            final_agency = db.query(models.Agency).count()
            final_contact = db.query(models.Contact).count()
            final_log = db.query(models.Log).count()
            final_task = db.query(models.Task).count()
            
            if final_prod > 0 or final_agency > 0 or final_contact > 0 or final_log > 0 or final_task > 0:
                return {
                    "success": False,
                    "message": "Some records could not be deleted",
                    "deleted": {
                        "production_records": prod_count - final_prod,
                        "agency_records": agency_count - final_agency,
                        "contact_records": contact_count - final_contact,
                        "log_records": log_count - final_log,
                        "task_records": task_count - final_task,
                        "total": (prod_count + agency_count + contact_count + log_count + task_count) - (final_prod + final_agency + final_contact + final_log + final_task)
                    },
                    "remaining": {
                        "production_records": final_prod,
                        "agency_records": final_agency,
                        "contact_records": final_contact,
                        "log_records": final_log,
                        "task_records": final_task,
                    },
                    "warning": "Some records remain. You may need to check the database directly."
                }
        
        return {
            "success": True,
            "message": "All agency and production data cleared successfully",
            "deleted": {
                "production_records": prod_count,
                "agency_records": agency_count,
                "contact_records": contact_count,
                "log_records": log_count,
                "task_records": task_count,
                "total": prod_count + agency_count + contact_count + log_count + task_count
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing data: {str(e)}"
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

