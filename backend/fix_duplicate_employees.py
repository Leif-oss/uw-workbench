"""Script to fix duplicate employees with the same email."""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from backend.database import SessionLocal
from backend import models

def fix_duplicate_employees():
    db = SessionLocal()
    try:
        # Find all employees with duplicate emails
        employees = db.execute(select(models.Employee)).scalars().all()
        
        # Group by email
        email_groups = {}
        for emp in employees:
            if emp.email:
                if emp.email not in email_groups:
                    email_groups[emp.email] = []
                email_groups[emp.email].append(emp)
        
        print("Checking for duplicate employees...")
        print("="*80)
        
        duplicates_found = False
        for email, emps in email_groups.items():
            if len(emps) > 1:
                duplicates_found = True
                print(f"\nFound {len(emps)} employees with email: {email}")
                
                # Find the "best" employee to keep (prefer one with admin role, then one with office)
                best_emp = None
                for emp in emps:
                    if not best_emp:
                        best_emp = emp
                    elif emp.role == "admin" and best_emp.role != "admin":
                        best_emp = emp
                    elif emp.office_id and not best_emp.office_id:
                        best_emp = emp
                    elif emp.role and not best_emp.role:
                        best_emp = emp
                
                print(f"  Keeping: Employee ID {best_emp.id} (Name: {best_emp.name}, Office: {best_emp.office_id}, Role: {best_emp.role})")
                
                # Delete the others
                for emp in emps:
                    if emp.id != best_emp.id:
                        # Check if employee has agencies or other relationships
                        agency_count = db.query(models.Agency).filter(
                            models.Agency.primary_underwriter_id == emp.id
                        ).count()
                        
                        if agency_count > 0:
                            print(f"  WARNING: Employee ID {emp.id} has {agency_count} agencies. Reassigning to Employee ID {best_emp.id}...")
                            # Reassign agencies
                            db.query(models.Agency).filter(
                                models.Agency.primary_underwriter_id == emp.id
                            ).update({"primary_underwriter_id": best_emp.id})
                        
                        # Check if there's a user account linked to this employee
                        user = db.query(models.User).filter(
                            models.User.employee_id == emp.id
                        ).first()
                        
                        if user:
                            # If the best employee doesn't have a user account, link this one
                            best_user = db.query(models.User).filter(
                                models.User.employee_id == best_emp.id
                            ).first()
                            
                            if not best_user:
                                print(f"  Linking user account from Employee ID {emp.id} to Employee ID {best_emp.id}")
                                user.employee_id = best_emp.id
                            else:
                                print(f"  Removing user account link from Employee ID {emp.id} (best employee already has one)")
                                user.employee_id = None
                        
                        print(f"  Deleting: Employee ID {emp.id}")
                        db.delete(emp)
        
        if duplicates_found:
            db.commit()
            print("\n" + "="*80)
            print("SUCCESS: Duplicate employees have been consolidated!")
            print("="*80)
        else:
            print("\nNo duplicate employees found.")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--yes":
        fix_duplicate_employees()
    else:
        print("This script will consolidate duplicate employees.")
        print("Run with --yes flag to proceed: python fix_duplicate_employees.py --yes")

