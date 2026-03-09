"""Restore Leif employee and user account."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database import SessionLocal
from backend import models
from backend.routers.auth import hash_password
from datetime import datetime
import secrets

def restore_leif():
    db = SessionLocal()
    try:
        print("="*80)
        print("RESTORING LEIF EMPLOYEE AND USER")
        print("="*80)
        print()
        
        # Check if Leif employee exists
        leif_employee = db.query(models.Employee).filter(
            models.Employee.email == "leif@deanshomer.com"
        ).first()
        
        if not leif_employee:
            print("Creating Leif employee...")
            leif_employee = models.Employee(
                name="Leif",
                email="leif@deanshomer.com",
                role="admin"
            )
            db.add(leif_employee)
            db.flush()
            db.refresh(leif_employee)
            print(f"Created Employee ID {leif_employee.id}: {leif_employee.name} ({leif_employee.email})")
        else:
            print(f"Found Employee ID {leif_employee.id}: {leif_employee.name} ({leif_employee.email})")
            # Ensure role is admin
            if leif_employee.role != "admin":
                leif_employee.role = "admin"
                print("Updated role to admin")
        
        # Check if Leif user exists
        leif_user = db.query(models.User).filter(
            (models.User.email == "leif@deanshomer.com") |
            (models.User.username == "leif")
        ).first()
        
        if not leif_user:
            print("Creating Leif user account...")
            # Generate a temporary password
            temp_password = secrets.token_urlsafe(16)
            password_hash = hash_password(temp_password)
            
            leif_user = models.User(
                username="leif",
                email="leif@deanshomer.com",
                password_hash=password_hash,
                is_active=True,
                is_admin=True,
                employee_id=leif_employee.id,
                created_at=datetime.utcnow()
            )
            db.add(leif_user)
            print(f"Created User ID {leif_user.id}: {leif_user.username} ({leif_user.email})")
            print(f"Temporary password: {temp_password}")
            print("IMPORTANT: User should reset password after first login!")
        else:
            print(f"Found User ID {leif_user.id}: {leif_user.username} ({leif_user.email})")
            # Ensure user is linked to employee
            if leif_user.employee_id != leif_employee.id:
                print(f"Linking User ID {leif_user.id} to Employee ID {leif_employee.id}")
                leif_user.employee_id = leif_employee.id
            # Ensure user is admin
            if not leif_user.is_admin:
                print("Granting admin access")
                leif_user.is_admin = True
        
        db.commit()
        
        print()
        print("="*80)
        print("RESTORATION COMPLETE")
        print("="*80)
        print()
        print(f"Employee ID: {leif_employee.id}")
        print(f"User ID: {leif_user.id}")
        print(f"Username: {leif_user.username}")
        print(f"Email: {leif_user.email}")
        print(f"Is Admin: {leif_user.is_admin}")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    restore_leif()



