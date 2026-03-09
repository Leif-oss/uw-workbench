"""Fix orphaned user account by linking it to the correct employee."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database import SessionLocal
from backend import models

def fix_orphaned_user(email: str):
    db = SessionLocal()
    try:
        # Find user with this email
        user = db.query(models.User).filter(models.User.email == email).first()
        
        if not user:
            print(f"No user account found with email: {email}")
            return
        
        print(f"Found user account:")
        print(f"  User ID: {user.id}")
        print(f"  Email: {user.email}")
        print(f"  Currently linked to Employee ID: {user.employee_id}")
        
        # Check if the linked employee exists
        if user.employee_id:
            employee = db.get(models.Employee, user.employee_id)
            if employee:
                print(f"  Employee ID {user.employee_id} exists: {employee.name}")
                print("  User is already correctly linked. No action needed.")
                return
            else:
                print(f"  WARNING: Employee ID {user.employee_id} does not exist!")
        
        # Find employee with this email
        employee = db.query(models.Employee).filter(
            models.Employee.email == email
        ).first()
        
        if employee:
            print(f"\nFound employee with this email:")
            print(f"  Employee ID: {employee.id}")
            print(f"  Name: {employee.name}")
            print(f"  Office ID: {employee.office_id}")
            
            # Check if this employee already has a user account
            existing_user = db.query(models.User).filter(
                models.User.employee_id == employee.id
            ).first()
            
            if existing_user:
                if existing_user.id == user.id:
                    print("  User is already linked to this employee. Updating link...")
                else:
                    print(f"  WARNING: Employee {employee.id} already has a different user account (User ID: {existing_user.id})")
                    print(f"  This user account ({user.id}) will be unlinked.")
                    user.employee_id = None
                    db.commit()
                    print("  User account unlinked (employee already has a different user account)")
                    return
            
            # Link user to employee
            user.employee_id = employee.id
            db.commit()
            print(f"\nSUCCESS: Linked User ID {user.id} to Employee ID {employee.id}")
        else:
            print(f"\nNo employee found with email: {email}")
            print("  Unlinking user account from non-existent employee...")
            user.employee_id = None
            db.commit()
            print("  User account is now unlinked (no employee with this email)")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    email = "leifkeller@hotmail.com"
    fix_orphaned_user(email)



