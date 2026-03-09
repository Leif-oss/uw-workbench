"""Check all users and employees to find orphaned accounts."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from backend.database import SessionLocal
from backend import models

def check_all_users():
    db = SessionLocal()
    try:
        print("="*80)
        print("ALL EMPLOYEES:")
        print("="*80)
        employees = db.execute(select(models.Employee)).scalars().all()
        for emp in employees:
            print(f"Employee ID: {emp.id}")
            print(f"  Name: {emp.name}")
            print(f"  Email: {emp.email}")
            print(f"  Office ID: {emp.office_id}")
            print(f"  Role: {emp.role}")
            print()
        
        print("="*80)
        print("ALL USERS:")
        print("="*80)
        users = db.execute(select(models.User)).scalars().all()
        for user in users:
            employee = db.get(models.Employee, user.employee_id) if user.employee_id else None
            print(f"User ID: {user.id}")
            print(f"  Username: {user.username}")
            print(f"  Email: {user.email}")
            print(f"  Is Admin: {user.is_admin}")
            print(f"  Employee ID: {user.employee_id}")
            if employee:
                print(f"  Linked Employee: {employee.name} (ID: {employee.id})")
            else:
                print(f"  Linked Employee: NONE (ORPHANED USER ACCOUNT)")
            print()
        
        print("="*80)
        print("ORPHANED USER ACCOUNTS (users without employees):")
        print("="*80)
        orphaned = [u for u in users if not u.employee_id or not db.get(models.Employee, u.employee_id)]
        if orphaned:
            for user in orphaned:
                print(f"User ID: {user.id}, Email: {user.email}, Username: {user.username}")
                print(f"  This user account exists but is not linked to any employee!")
        else:
            print("No orphaned user accounts found.")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_all_users()



