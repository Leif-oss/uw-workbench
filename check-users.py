"""Check existing users in the database."""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from backend.database import SessionLocal
from backend import models

db = SessionLocal()

try:
    users = db.query(models.User).all()
    
    if not users:
        print("[INFO] No users found in database")
    else:
        print(f"[INFO] Found {len(users)} user(s):")
        print("")
        for user in users:
            print(f"  Username: {user.username}")
            print(f"  Email: {user.email}")
            print(f"  Is Active: {user.is_active}")
            print(f"  Is Admin: {user.is_admin}")
            print(f"  Must Change Password: {user.must_change_password}")
            if user.locked_until:
                print(f"  Locked Until: {user.locked_until}")
            print(f"  Failed Login Attempts: {user.failed_login_attempts}")
            print("")
    
    # Also check employees
    employees = db.query(models.Employee).all()
    if employees:
        print(f"[INFO] Found {len(employees)} employee(s):")
        for emp in employees:
            print(f"  - {emp.name} ({emp.email}) - Role: {emp.role}")
    
except Exception as e:
    print(f"[ERROR] Error checking users: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
