from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Request, Body
from sqlalchemy.orm import Session
from sqlalchemy import select, delete, func
from typing import List, Optional
from pydantic import BaseModel
import os
import pandas as pd
import io
from datetime import datetime
import logging

from ..database import get_db
from .. import models, schemas, crud
from ..auth.proxy_headers import get_current_user, require_authenticated
from ..services.audit import log_audit_event, get_entity_snapshot

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/admin", tags=["admin"])

def require_admin(user: dict):
    """Require user to have admin role."""
    require_authenticated(user)
    # Require admin access
    if "admin" not in user.get("groups", []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )


# --- INITIAL SETUP: Create Admin User (No auth required, one-time use) ---
class SetupAdminRequest(BaseModel):
    username: str
    email: str
    password: str
    name: str
    setup_token: str

@router.post("/setup-admin")
def setup_admin_user(
    request: SetupAdminRequest,
    db: Session = Depends(get_db)
):
    """
    Create the first admin user. This endpoint is only available during initial setup.
    Requires a setup token (check SETUP_TOKEN environment variable).
    """
    # Check setup token
    expected_token = os.getenv("SETUP_TOKEN", "CHANGE_THIS_IN_PRODUCTION")
    if request.setup_token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid setup token"
        )
    
    # Check if admin users already exist
    existing_admins = db.query(models.User).filter(models.User.is_admin == True).count()
    if existing_admins > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin users already exist. Use the admin panel to create additional users."
        )
    
    try:
        # Get or create first office for initial setup
        # This is acceptable for the setup-admin endpoint since it's initial setup only
        # For production deployments, offices should be created via seed scripts first
        office = db.query(models.Office).first()
        if not office:
            logger.info("No offices found during admin setup. Creating default office...")
            office = models.Office(code="ADMIN", name="Admin Office")
            db.add(office)
            db.flush()
            logger.info(f"Created default office: {office.code} - {office.name}")
        
        # Create employee
        employee = models.Employee(
            name=request.name,
            email=request.email,
            office_id=office.id,
            role="admin"
        )
        db.add(employee)
        db.flush()
        
        # Create user
        from ..routers.auth import hash_password
        user = models.User(
            username=request.username,
            email=request.email,
            password_hash=hash_password(request.password),
            is_active=True,
            is_admin=True,
            employee_id=employee.id
        )
        db.add(user)
        db.commit()
        
        logger.info(f"Initial admin user created: {request.username} ({request.email})")
        
        return {
            "success": True,
            "message": "Admin user created successfully",
            "username": request.username,
            "email": request.email
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create admin user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create admin user: {str(e)}"
        )


# --- EMPLOYEE MANAGEMENT ---
@router.post("/employees/{employee_id}/reset-password")
def reset_employee_password(
    employee_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reset password for an employee and send them a password reset email. Requires admin access."""
    require_admin(user)
    
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if not employee.email:
        raise HTTPException(status_code=400, detail="Employee does not have an email address")
    
    # Find user account associated with this employee
    user_account = db.query(models.User).filter(
        (models.User.email == employee.email) |
        (models.User.employee_id == employee_id)
    ).first()
    
    if not user_account:
        raise HTTPException(status_code=404, detail="No user account found for this employee")
    
    # Generate set-password token (same flow as welcome email)
    import secrets
    from datetime import datetime, timedelta
    set_password_token = secrets.token_urlsafe(32)
    user_account.password_reset_token = set_password_token  # Reuse this field for set-password tokens
    user_account.password_reset_expires = datetime.utcnow() + timedelta(hours=24)  # 24 hour expiry
    db.commit()
    
    # Send set-password email (same format as welcome email but with password reset message)
    from ..services.email import send_welcome_email
    import os
    
    set_password_link = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/set-password?token={set_password_token}"
    
    # Use welcome email function which will send set-password link
    email_sent = send_welcome_email(
        to_email=user_account.email,
        username=user_account.username,
        set_password_link=set_password_link
    )
    
    if email_sent:
        logger.info(f"Password set email sent to {user_account.email} by admin {user['email']}")
        return {
            "message": f"Password set email sent to {user_account.email}. The password reset link is also shown below for manual sharing if needed.",
            "set_password_link": set_password_link,
            "username": user_account.username,
            "email": user_account.email,
            "employee_name": employee.name,
            "email_sent": True
        }
    else:
        logger.warning(f"Failed to send password set email to {user_account.email}")
        return {
            "message": f"Password set token generated but email failed to send. Please share the password reset link manually with {employee.name}.",
            "set_password_link": set_password_link,
            "username": user_account.username,
            "email": user_account.email,
            "employee_name": employee.name,
            "email_sent": False
        }


@router.post("/cleanup-employee-offices")
def cleanup_employee_offices(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Clean up stale employee_offices relationships. Requires admin access.
    
    This fixes issues where:
    - employee_offices entries don't match current office_ids
    - Legacy office_id field is out of sync with many-to-many relationship
    """
    require_admin(user)
    
    try:
        from sqlalchemy import text
        
        # Get all employees and fix their relationships
        employees = db.query(models.Employee).all()
        fixed_count = 0
        details = []
        
        for emp in employees:
            # Get current office_ids from many-to-many relationship
            current_office_ids = {office.id for office in emp.offices}
            
            # Get office_id from legacy field
            legacy_office_id = emp.office_id
            
            # Determine what the office_ids should be
            if current_office_ids:
                # Use many-to-many relationship as source of truth
                # Sync legacy field to first office if needed
                if legacy_office_id not in current_office_ids:
                    emp.office_id = list(current_office_ids)[0] if current_office_ids else None
                    fixed_count += 1
                    details.append(f"Employee {emp.id} ({emp.name}): Synced legacy office_id to {emp.office_id}")
            elif legacy_office_id:
                # Only legacy field is set, migrate to many-to-many
                office = db.query(models.Office).filter(models.Office.id == legacy_office_id).first()
                if office:
                    emp.offices = [office]
                    fixed_count += 1
                    details.append(f"Employee {emp.id} ({emp.name}): Migrated legacy office_id {legacy_office_id} to many-to-many")
            else:
                # No offices assigned, ensure both are cleared
                if emp.offices:
                    emp.offices = []
                    fixed_count += 1
                    details.append(f"Employee {emp.id} ({emp.name}): Cleared stale office assignments")
                if emp.office_id:
                    emp.office_id = None
                    fixed_count += 1
                    details.append(f"Employee {emp.id} ({emp.name}): Cleared legacy office_id")
        
        if fixed_count > 0:
            db.commit()
        
        # Check for orphaned employee_offices entries
        result = db.execute(text("""
            SELECT eo.employee_id, eo.office_id 
            FROM employee_offices eo
            LEFT JOIN employees e ON e.id = eo.employee_id
            LEFT JOIN offices o ON o.id = eo.office_id
            WHERE e.id IS NULL OR o.id IS NULL
        """))
        orphaned = result.fetchall()
        
        orphaned_count = 0
        if orphaned:
            orphaned_count = len(orphaned)
            # Delete orphaned entries
            db.execute(text("""
                DELETE FROM employee_offices
                WHERE employee_id NOT IN (SELECT id FROM employees)
                   OR office_id NOT IN (SELECT id FROM offices)
            """))
            db.commit()
        
        return {
            "success": True,
            "employees_fixed": fixed_count,
            "orphaned_entries_deleted": orphaned_count,
            "details": details[:20]  # Limit to first 20 details
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error cleaning up employee_offices: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error cleaning up employee_offices: {str(e)}"
        )


@router.get("/employees/{employee_id}/user-info")
def get_employee_user_info(
    employee_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user account information for an employee. Requires admin access."""
    require_admin(user)
    
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Find user account associated with this employee
    user_account = db.query(models.User).filter(
        (models.User.email == employee.email) |
        (models.User.employee_id == employee_id)
    ).first()
    
    if not user_account:
        return {
            "has_account": False,
            "is_admin": False,
            "role": employee.role,
            "username": None,
            "email": employee.email
        }
    
    # Determine role - if user is admin, role is "admin", otherwise use employee role
    role = None
    if user_account.is_admin:
        role = "admin"
    elif employee.role:
        role = employee.role
    
    return {
        "has_account": True,
        "is_admin": user_account.is_admin,
        "role": role,
        "username": user_account.username,
        "email": user_account.email
    }


@router.delete("/employees/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an employee by ID and their associated user account. Requires admin access.
    This prevents orphaned user accounts that could cause duplicate user issues.
    """
    require_admin(user)
    
    stmt = select(models.Employee).where(models.Employee.id == employee_id)
    employee = db.execute(stmt).scalar_one_or_none()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee_snapshot = get_entity_snapshot(employee)
    
    # Find and delete the associated user account to prevent orphaned users
    # This prevents the issue where deleting an employee leaves a user account
    # that can be accidentally linked to a new employee with the same email
    user_account = None
    if employee.email:
        user_account = db.query(models.User).filter(
            (models.User.email == employee.email) |
            (models.User.employee_id == employee_id)
        ).first()
    
    # Delete user account first (if it exists)
    if user_account:
        logger.info(f"Deleting user account {user_account.username} (ID: {user_account.id}) associated with employee {employee_id}")
        db.delete(user_account)
    
    # Delete the employee
    db.delete(employee)
    db.commit()
    
    # Log delete action
    details = {"deleted": employee_snapshot}
    if user_account:
        details["user_account_deleted"] = {
            "user_id": user_account.id,
            "username": user_account.username,
            "email": user_account.email
        }
    
    log_audit_event(
        actor_email=user["email"],
        action="DELETE",
        entity_type="employee",
        entity_id=employee_id,
        office_id=employee.office_id,
        actor_employee_id=user.get("employee_id"),
        details=details,
        request_path=str(request.url.path),
        request_method="DELETE",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        db=db,
    )
    
    return None


# --- PRODUCTION IMPORT (MULTI-OFFICE) ---
@router.post("/production/import-multi")
async def import_production_multi(
    month: str,  # Format: YYYY-MM
    file: UploadFile = File(...),
    request: Request = None,
    user: dict = Depends(get_current_user),
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
                
                # Find header row - search more rows (up to 50) to handle variations
                header_row_idx = None
                for idx in range(min(50, len(raw_df))):
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
                
                # Find where data ends - look for "Total" row in first column
                # Stop reading when we hit a row that starts with "Total", "Grand Total", or "Summary"
                rows_to_keep = []
                for idx, row in df.iterrows():
                    first_col_val = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""
                    first_col_lower = first_col_val.lower()
                    
                    # Stop if we hit a totals row
                    if first_col_lower in ["total", "grand total", "summary"]:
                        break
                    
                    # Keep rows that have a Code (required for agency)
                    if pd.notna(row.get('Code', None)):
                        rows_to_keep.append(idx)
                
                # Filter to only keep valid rows
                if rows_to_keep:
                    df = df.loc[rows_to_keep]
                else:
                    # Fallback: use original filtering if no valid rows found
                    df = df[df['Code'].notna()]
                
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
                
                def safe_loss_ratio(val):
                    """Convert loss ratio from decimal (0.048827) to integer percentage (5 for 4.88%)
                    Handles both decimal format (< 1) and already-percentage format (>= 1)
                    Also handles negative values (negative loss ratios indicate profit)
                    """
                    try:
                        if pd.isna(val):
                            return None
                        decimal_val = float(val)
                        # Handle negative values (negative loss ratio = profit)
                        is_negative = decimal_val < 0
                        abs_val = abs(decimal_val)
                        
                        # If absolute value is < 1, it's a decimal ratio (0.048827 = 4.88%), convert to percentage integer
                        # If absolute value is >= 1 and < 100, assume it's already a percentage (4.88 = 4.88%)
                        # If absolute value is >= 100, it's likely already in percentage format but high (434 = 434%)
                        if abs_val < 1:
                            # Decimal ratio: multiply by 100 and round
                            result = round(abs_val * 100)
                        elif abs_val < 100:
                            # Already a percentage, just round
                            result = round(abs_val)
                        else:
                            # Very high value, likely already a percentage, round it
                            result = round(abs_val)
                        
                        # Restore negative sign if original was negative
                        return -result if is_negative else result
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
                            "three_year_plus": get_val(20, safe_loss_ratio),  # Convert from decimal (0.048827) to integer percentage (5)
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
    request: Request = None,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Import production data from Excel file.
    - Parses Excel looking for 'Code' header row
    - Maps columns to production fields
    - Creates new agencies if they don't exist
    - Updates ActiveFlag for existing agencies
    - Returns summary of import results
    Requires admin access.
    """
    require_admin(user)
    
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
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get counts of all agency and production data.
    Useful for diagnostics after clearing data.
    Requires admin access.
    """
    require_admin(user)
    
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
    request: Request,
    user: dict = Depends(get_current_user),
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
    
    Requires admin access.
    """
    require_admin(user)
    
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


@router.post("/cleanup-database")
def cleanup_database(
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    TEMPORARY: Clean up database to keep only Leif employee.
    This endpoint should be removed after cleanup is complete.
    
    WARNING: This endpoint DELETES all users and employees except Leif!
    Use with extreme caution.
    
    In production, this endpoint requires the ENABLE_CLEANUP_ENDPOINT environment variable.
    """
    import os
    require_authenticated(user)
    require_admin(user)
    
    # Prevent accidental use in production unless explicitly enabled
    is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
    if is_production and not os.getenv("ENABLE_CLEANUP_ENDPOINT"):
        logger.warning(f"Cleanup endpoint called in production by {user.get('email')} but ENABLE_CLEANUP_ENDPOINT not set")
        raise HTTPException(
            status_code=403,
            detail="Cleanup endpoint is disabled in production. Set ENABLE_CLEANUP_ENDPOINT=true to enable (DANGEROUS!)"
        )
    
    from .. import models
    from sqlalchemy import select
    
    try:
        # Find or create Leif employee
        leif_employee = db.query(models.Employee).filter(
            models.Employee.email == "leif@deanshomer.com"
        ).first()
        
        if not leif_employee:
            # Create Leif employee if it doesn't exist
            leif_employee = models.Employee(
                name="Leif",
                email="leif@deanshomer.com",
                role="admin"
            )
            db.add(leif_employee)
            db.flush()
            db.refresh(leif_employee)
        
        deleted_employees = []
        deleted_users = []
        
        # Get all employees except Leif
        all_employees = db.execute(select(models.Employee)).scalars().all()
        employees_to_delete = [e for e in all_employees if e.id != leif_employee.id]
        
        # Delete each employee
        for emp in employees_to_delete:
            # Unlink user account
            user_account = db.query(models.User).filter(
                models.User.employee_id == emp.id
            ).first()
            
            if user_account:
                user_account.employee_id = None
            
            # Reassign agencies
            agency_count = db.query(models.Agency).filter(
                models.Agency.primary_underwriter_id == emp.id
            ).count()
            
            if agency_count > 0:
                db.query(models.Agency).filter(
                    models.Agency.primary_underwriter_id == emp.id
                ).update({"primary_underwriter_id": leif_employee.id})
            
            deleted_employees.append({"id": emp.id, "name": emp.name, "email": emp.email})
            db.delete(emp)
        
        # Delete orphaned user accounts
        all_users = db.execute(select(models.User)).scalars().all()
        for user_account in all_users:
            if not user_account.employee_id:
                # Check if this is Leif's user by email
                if user_account.email != "leif@deanshomer.com":
                    deleted_users.append({"id": user_account.id, "username": user_account.username, "email": user_account.email})
                    db.delete(user_account)
            else:
                employee = db.get(models.Employee, user_account.employee_id)
                if not employee:
                    deleted_users.append({"id": user_account.id, "username": user_account.username, "email": user_account.email})
                    db.delete(user_account)
        
        # Ensure Leif has a user account
        # First check by email (more reliable)
        leif_user = db.query(models.User).filter(
            models.User.email == "leif@deanshomer.com"
        ).first()
        
        # If not found by email, check by employee_id
        if not leif_user:
            leif_user = db.query(models.User).filter(
                models.User.employee_id == leif_employee.id
            ).first()
        
        # If still not found, check by username
        if not leif_user:
            leif_user = db.query(models.User).filter(
                models.User.username == "leif"
            ).first()
        
        if not leif_user:
            from ..routers.auth import hash_password
            import secrets
            from datetime import datetime
            
            username = "leif"
            temp_password = secrets.token_urlsafe(16)
            password_hash = hash_password(temp_password)
            
            leif_user = models.User(
                username=username,
                email="leif@deanshomer.com",
                password_hash=password_hash,
                is_active=True,
                is_admin=True,
                employee_id=leif_employee.id,
                created_at=datetime.utcnow()
            )
            db.add(leif_user)
            logger.info(f"Created Leif user account: {username}")
        else:
            # Ensure user is properly linked
            if leif_user.employee_id != leif_employee.id:
                logger.info(f"Linking User ID {leif_user.id} to Employee ID {leif_employee.id}")
                leif_user.employee_id = leif_employee.id
            if not leif_user.is_admin:
                logger.info(f"Granting admin access to User ID {leif_user.id}")
                leif_user.is_admin = True
            if leif_user.email != "leif@deanshomer.com":
                logger.info(f"Updating email for User ID {leif_user.id}")
                leif_user.email = "leif@deanshomer.com"
        
        db.commit()
        
        # Get remaining counts
        remaining_employees = db.execute(select(models.Employee)).scalars().all()
        remaining_users = db.execute(select(models.User)).scalars().all()
        
        return {
            "success": True,
            "deleted_employees": deleted_employees,
            "deleted_users": deleted_users,
            "remaining_employees": len(remaining_employees),
            "remaining_users": len(remaining_users),
            "leif_employee_id": leif_employee.id,
            "leif_user_id": leif_user.id if leif_user else None
        }
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        return {"error": str(e)}


@router.get("/users/debug")
def debug_users(
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug endpoint to list all users with their employee linkage info. Admin only."""
    require_admin(user)
    
    all_users = db.query(models.User).all()
    users_info = []
    
    for u in all_users:
        linked_employee = None
        is_orphaned = False
        if u.employee_id:
            linked_employee = db.query(models.Employee).filter(models.Employee.id == u.employee_id).first()
            if not linked_employee:
                is_orphaned = True
        
        users_info.append({
            "user_id": u.id,
            "username": u.username,
            "email": u.email,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "employee_id": u.employee_id,
            "linked_employee_name": linked_employee.name if linked_employee else None,
            "linked_employee_email": linked_employee.email if linked_employee else None,
            "is_orphaned": is_orphaned,  # User linked to deleted employee
            "is_unlinked": u.employee_id is None,  # User not linked to any employee
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    
    return {
        "total_users": len(users_info),
        "orphaned_users": [u for u in users_info if u["is_orphaned"]],
        "unlinked_users": [u for u in users_info if u["is_unlinked"]],
        "all_users": users_info
    }

@router.get("/db-status")
def get_db_status(
    db: Session = Depends(get_db),
):
    """
    Get database status - shows employees and users.
    This endpoint works with TEMP_SETUP_MODE (no auth required during setup).
    """
    from .. import models
    from sqlalchemy import select
    
    try:
        employees = db.execute(select(models.Employee)).scalars().all()
        users = db.execute(select(models.User)).scalars().all()
        
        # Check for orphaned users (users with employee_id pointing to non-existent employee)
        orphaned_users = []
        for u in users:
            if u.employee_id:
                employee = db.get(models.Employee, u.employee_id)
                if not employee:
                    orphaned_users.append({
                        "id": u.id,
                        "username": u.username,
                        "email": u.email,
                        "orphaned_employee_id": u.employee_id
                    })
        
        # Check for users without employees
        users_without_employees = []
        for u in users:
            if not u.employee_id:
                # Check if there's an employee with matching email
                matching_employee = db.query(models.Employee).filter(
                    models.Employee.email == u.email
                ).first() if u.email else None
                users_without_employees.append({
                    "id": u.id,
                    "username": u.username,
                    "email": u.email,
                    "has_matching_employee": matching_employee is not None,
                    "matching_employee_id": matching_employee.id if matching_employee else None
                })
        
        # Check for employees without users
        employees_without_users = []
        for e in employees:
            if e.email:
                matching_user = db.query(models.User).filter(
                    (models.User.email == e.email) |
                    (models.User.employee_id == e.id)
                ).first()
                if not matching_user:
                    employees_without_users.append({
                        "id": e.id,
                        "name": e.name,
                        "email": e.email,
                        "office_id": e.office_id
                    })
        
        return {
            "employees": [
                {
                    "id": e.id,
                    "name": e.name,
                    "email": e.email,
                    "office_id": e.office_id,
                    "role": e.role
                }
                for e in employees
            ],
            "users": [
                {
                    "id": u.id,
                    "username": u.username,
                    "email": u.email,
                    "is_admin": u.is_admin,
                    "employee_id": u.employee_id,
                    "is_active": u.is_active
                }
                for u in users
            ],
            "total_employees": len(employees),
            "total_users": len(users),
            "issues": {
                "orphaned_users": orphaned_users,
                "users_without_employees": users_without_employees,
                "employees_without_users": employees_without_users
            }
        }
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

