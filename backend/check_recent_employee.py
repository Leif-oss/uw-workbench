"""Check the most recently created employee and their user account."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, desc
from backend.database import SessionLocal
from backend import models

def check_recent_employee():
    db = SessionLocal()
    try:
        # Get all employees ordered by ID (most recent last)
        employees = db.execute(
            select(models.Employee).order_by(desc(models.Employee.id))
        ).scalars().all()
        
        if not employees:
            print("No employees found.")
            return
        
        print(f"Total employees: {len(employees)}")
        print("\nMost recent employees (last 5):")
        print("="*80)
        
        for emp in employees[:5]:
            print(f"\nEmployee ID: {emp.id}")
            print(f"  Name: {emp.name}")
            print(f"  Email: {emp.email}")
            print(f"  Office ID: {emp.office_id}")
            print(f"  Role: {emp.role}")
            
            # Check user account
            user = db.query(models.User).filter(
                (models.User.employee_id == emp.id) |
                (models.User.email == emp.email)
            ).first()
            
            if user:
                print(f"  User Account:")
                print(f"    User ID: {user.id}")
                print(f"    Username: {user.username}")
                print(f"    Email: {user.email}")
                print(f"    Is Admin: {user.is_admin}")
                print(f"    Password Reset Token: {'SET' if user.password_reset_token else 'NOT SET'}")
                if user.password_reset_token:
                    print(f"    Token Expires: {user.password_reset_expires}")
                    # Generate set-password link
                    from backend.services.email import FRONTEND_URL
                    set_password_link = f"{FRONTEND_URL}/set-password?token={user.password_reset_token}"
                    print(f"    Set Password Link: {set_password_link}")
            else:
                print(f"  User Account: NOT FOUND")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_recent_employee()



