"""Delete all employees except the specified one."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from backend.database import SessionLocal
from backend import models

def cleanup_employees(keep_employee_id: int):
    db = SessionLocal()
    try:
        # Get the employee to keep
        keep_employee = db.get(models.Employee, keep_employee_id)
        if not keep_employee:
            print(f"ERROR: Employee ID {keep_employee_id} not found!")
            return
        
        print(f"Keeping Employee ID {keep_employee_id}:")
        print(f"  Name: {keep_employee.name}")
        print(f"  Email: {keep_employee.email}")
        print(f"  Office ID: {keep_employee.office_id}")
        print(f"  Role: {keep_employee.role}")
        print()
        
        # Get all employees
        all_employees = db.execute(select(models.Employee)).scalars().all()
        
        employees_to_delete = [e for e in all_employees if e.id != keep_employee_id]
        
        if not employees_to_delete:
            print("No other employees to delete.")
            return
        
        print(f"Found {len(employees_to_delete)} employee(s) to delete:")
        for emp in employees_to_delete:
            print(f"  - Employee ID {emp.id}: {emp.name} ({emp.email})")
        
        # Delete each employee
        for emp in employees_to_delete:
            # Check for linked user accounts
            user = db.query(models.User).filter(
                models.User.employee_id == emp.id
            ).first()
            
            if user:
                print(f"\nDeleting Employee ID {emp.id} and unlinking User ID {user.id}...")
                # Unlink user account (don't delete it - it might be needed)
                user.employee_id = None
            else:
                print(f"\nDeleting Employee ID {emp.id}...")
            
            # Check for agencies linked to this employee
            agency_count = db.query(models.Agency).filter(
                models.Agency.primary_underwriter_id == emp.id
            ).count()
            
            if agency_count > 0:
                print(f"  WARNING: Employee has {agency_count} agencies. Reassigning to Employee ID {keep_employee_id}...")
                db.query(models.Agency).filter(
                    models.Agency.primary_underwriter_id == emp.id
                ).update({"primary_underwriter_id": keep_employee_id})
            
            # Delete the employee
            db.delete(emp)
        
        db.commit()
        print(f"\nSUCCESS: Deleted {len(employees_to_delete)} employee(s).")
        print(f"Only Employee ID {keep_employee_id} ({keep_employee.name}) remains.")
        
        # Verify
        remaining = db.execute(select(models.Employee)).scalars().all()
        print(f"\nRemaining employees: {len(remaining)}")
        for emp in remaining:
            print(f"  - Employee ID {emp.id}: {emp.name} ({emp.email})")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        keep_id = int(sys.argv[1])
    else:
        keep_id = 1  # Default to Employee ID 1
    
    cleanup_employees(keep_id)



