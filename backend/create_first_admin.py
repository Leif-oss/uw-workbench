"""
Script to create the first admin user (Employee + User account).
Run this to bootstrap the system with an admin account.

Usage: python -m backend.create_first_admin
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.database import SessionLocal
from backend import models
from backend.routers.auth import hash_password
from datetime import datetime, timedelta
import secrets

def create_first_admin():
    """Create the first admin user with both Employee and User accounts."""
    db = SessionLocal()
    try:
        print("=" * 60)
        print("Creating First Admin User")
        print("=" * 60)
        
        # Get admin details
        name = input("Enter admin name (e.g., 'Leif'): ").strip()
        if not name:
            print("❌ Name is required")
            return
        
        email = input("Enter admin email (e.g., 'admin@company.com'): ").strip()
        if not email:
            print("❌ Email is required")
            return
        
        # Check if employee already exists
        employee = db.query(models.Employee).filter(
            models.Employee.email == email
        ).first()
        
        if employee:
            print(f"\n⚠️  Employee already exists: {employee.name} ({employee.email})")
            print(f"   Employee ID: {employee.id}")
            update = input("Update this employee to admin? (y/n): ").strip().lower()
            if update != 'y':
                print("Cancelled.")
                return
            
            employee.name = name
            employee.role = "admin"
            print(f"✅ Updated employee: {employee.name}, role: {employee.role}")
        else:
            # Create new employee
            # First, get or create a default office
            office = db.query(models.Office).first()
            if not office:
                print("No office found. Creating default office...")
                office = models.Office(code="ADMIN", name="Admin Office")
                db.add(office)
                db.flush()
                print(f"✅ Created office: {office.code} - {office.name}")
            
            employee = models.Employee(
                name=name,
                email=email,
                office_id=office.id,
                role="admin"
            )
            db.add(employee)
            db.flush()
            print(f"✅ Created employee: {employee.name} ({employee.email})")
            print(f"   Employee ID: {employee.id}")
            print(f"   Office ID: {employee.office_id}")
            print(f"   Role: {employee.role}")
        
        # Now create/update User account
        user = db.query(models.User).filter(
            (models.User.email == email) |
            (models.User.employee_id == employee.id)
        ).first()
        
        if user:
            print(f"\n⚠️  User account already exists: {user.username} ({user.email})")
            print(f"   User ID: {user.id}")
            update = input("Update this user to admin? (y/n): ").strip().lower()
            if update != 'y':
                print("Cancelled.")
                return
            
            user.employee_id = employee.id
            user.email = email
            user.is_admin = True
            if not user.username:
                user.username = email.split('@')[0]
            print(f"✅ Updated user: {user.username}, is_admin: {user.is_admin}")
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
                is_admin=True,  # Admin access
                employee_id=employee.id,
                password_reset_token=set_password_token,
                password_reset_expires=datetime.utcnow() + timedelta(hours=24),
                created_at=datetime.utcnow(),
                must_change_password=False
            )
            db.add(user)
            print(f"✅ Created user account: {user.username} ({user.email})")
            print(f"   User ID: {user.id}")
            print(f"   is_admin: {user.is_admin}")
            print(f"   employee_id: {user.employee_id}")
        
        # Commit all changes
        db.commit()
        
        print("\n" + "=" * 60)
        print("✅ First Admin User Created Successfully!")
        print("=" * 60)
        print(f"Employee: {employee.name} ({employee.email})")
        print(f"  - Employee ID: {employee.id}")
        print(f"  - Role: {employee.role}")
        print(f"\nUser Account: {user.username} ({user.email})")
        print(f"  - User ID: {user.id}")
        print(f"  - is_admin: {user.is_admin}")
        print(f"  - Username for login: {user.username}")
        print("\n" + "=" * 60)
        print("You can now log in with:")
        print(f"  Username: {user.username}")
        print(f"  Email: {user.email}")
        print("\nTo set your password, use the password reset link that will be sent")
        print("or contact your system administrator.")
        print("=" * 60)
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ ERROR: Failed to create admin user: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_first_admin()



