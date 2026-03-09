"""
Script to create or update the admin user.
Run this to set up Leif as an admin user with both Employee and User accounts.
This enforces the 1:1 relationship - every Employee must have a User account.
"""
from sqlalchemy.orm import Session
from .database import SessionLocal
from . import models
from .routers.auth import hash_password
from datetime import datetime
import secrets

def create_admin_user():
    """Create or update the admin user with both Employee and User accounts."""
    db: Session = SessionLocal()
    try:
        email = "leif@deanshomer.com"
        name = "Leif"
        
        # Check if employee already exists
        employee = db.query(models.Employee).filter(
            models.Employee.email == email
        ).first()
        
        if employee:
            print(f"Found existing employee: {employee.name} ({employee.email})")
            print(f"  Employee ID: {employee.id}")
            
            # Update employee name and role
            employee.name = name
            employee.role = "admin"
            print(f"Updated employee: {employee.name}, role: {employee.role}")
        else:
            # Create new employee
            # Get first office (must exist - run seed_data.py first if needed)
            office = db.query(models.Office).first()
            if not office:
                raise RuntimeError(
                    "No offices found. Please run seed_data.py first: "
                    "python -m backend.scripts.seed_data"
                )
            
            employee = models.Employee(
                name=name,
                email=email,
                office_id=office.id,
                role="admin"  # Set admin role
            )
            db.add(employee)
            db.flush()  # Flush to get employee.id
            print(f"Created new employee: {employee.name} ({employee.email})")
            print(f"  Employee ID: {employee.id}")
            print(f"  Office ID: {employee.office_id}")
            print(f"  Role: {employee.role}")
        
        # Now ensure User account exists and is linked (1:1 relationship)
        user = db.query(models.User).filter(
            (models.User.email == email) |
            (models.User.employee_id == employee.id)
        ).first()
        
        if user:
            print(f"Found existing user account: {user.username} ({user.email})")
            print(f"  User ID: {user.id}")
            
            # Update user to ensure it's linked to employee and has admin access
            user.employee_id = employee.id
            user.email = email
            user.is_admin = True  # Grant admin access
            if not user.username:
                # Generate username if missing
                user.username = email.split('@')[0]
            print(f"Updated user: {user.username}, is_admin: {user.is_admin}, employee_id: {user.employee_id}")
        else:
            # Create new user account
            username = email.split('@')[0]
            # Ensure username is unique
            base_username = username
            counter = 1
            while db.query(models.User).filter(models.User.username == username).first():
                username = f"{base_username}{counter}"
                counter += 1
            
            # Generate set-password token
            set_password_token = secrets.token_urlsafe(32)
            temp_password_hash = hash_password(secrets.token_urlsafe(16))
            
            user = models.User(
                username=username,
                email=email,
                password_hash=temp_password_hash,
                is_active=True,
                is_admin=True,  # Grant admin access
                employee_id=employee.id,  # Link to employee (1:1 relationship)
                password_reset_token=set_password_token,
                password_reset_expires=datetime.utcnow().replace(hour=23, minute=59, second=59),  # 24 hours from now
                created_at=datetime.utcnow(),
                must_change_password=False
            )
            db.add(user)
            print(f"Created new user account: {user.username} ({user.email})")
            print(f"  User ID: {user.id}")
            print(f"  is_admin: {user.is_admin}")
            print(f"  employee_id: {user.employee_id}")
        
        # Commit all changes
        db.commit()
        
        print("\n" + "="*60)
        print("✅ Admin user set up successfully!")
        print("="*60)
        print(f"Employee: {employee.name} ({employee.email})")
        print(f"  - Employee ID: {employee.id}")
        print(f"  - Role: {employee.role}")
        print(f"  - Office ID: {employee.office_id}")
        print(f"\nUser Account: {user.username} ({user.email})")
        print(f"  - User ID: {user.id}")
        print(f"  - is_admin: {user.is_admin}")
        print(f"  - employee_id: {user.employee_id}")
        print(f"  - is_active: {user.is_active}")
        print("\n" + "="*60)
        print("Note: The user account is ready to use.")
        print("      Admin access is granted via is_admin=True on the User account")
        print("      and role='admin' on the Employee record.")
        print("="*60)
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ ERROR: Failed to create admin user: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()

