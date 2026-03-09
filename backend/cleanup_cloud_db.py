"""
Script to clean up cloud database - keep only Leif employee.
This can be run on the cloud instance or locally if connected to cloud DB.
"""
import sys
from pathlib import Path
import os

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from backend.database import SessionLocal
from backend import models

def cleanup_cloud_db():
    """Clean up database to keep only Leif employee."""
    db = SessionLocal()
    try:
        print("="*80)
        print("CLEANING UP CLOUD DATABASE")
        print("="*80)
        print()
        
        # Find Leif employee (leif@deanshomer.com)
        leif_employee = db.query(models.Employee).filter(
            models.Employee.email == "leif@deanshomer.com"
        ).first()
        
        if not leif_employee:
            print("ERROR: Could not find Leif employee (leif@deanshomer.com)")
            print("Creating Leif employee...")
            # Create Leif employee if it doesn't exist
            leif_employee = models.Employee(
                name="Leif",
                email="leif@deanshomer.com",
                role="admin"
            )
            db.add(leif_employee)
            db.flush()
            print(f"Created Employee ID {leif_employee.id}: {leif_employee.name} ({leif_employee.email})")
        else:
            print(f"Found Employee ID {leif_employee.id}: {leif_employee.name} ({leif_employee.email})")
        
        print()
        
        # Get all employees except Leif
        all_employees = db.execute(select(models.Employee)).scalars().all()
        employees_to_delete = [e for e in all_employees if e.id != leif_employee.id]
        
        print(f"Employees to delete: {len(employees_to_delete)}")
        for emp in employees_to_delete:
            print(f"  - Employee ID {emp.id}: {emp.name} ({emp.email})")
        print()
        
        # Delete each employee
        for emp in employees_to_delete:
            # Unlink user account
            user = db.query(models.User).filter(
                models.User.employee_id == emp.id
            ).first()
            
            if user:
                print(f"Unlinking User ID {user.id} from Employee ID {emp.id}")
                user.employee_id = None
            
            # Reassign agencies
            agency_count = db.query(models.Agency).filter(
                models.Agency.primary_underwriter_id == emp.id
            ).count()
            
            if agency_count > 0:
                print(f"  Reassigning {agency_count} agencies to Employee ID {leif_employee.id}")
                db.query(models.Agency).filter(
                    models.Agency.primary_underwriter_id == emp.id
                ).update({"primary_underwriter_id": leif_employee.id})
            
            # Delete employee
            print(f"Deleting Employee ID {emp.id}")
            db.delete(emp)
        
        print()
        print("Cleaning up orphaned user accounts...")
        
        # Delete orphaned user accounts (users without employees, except Leif's user)
        all_users = db.execute(select(models.User)).scalars().all()
        orphaned_users = []
        for user in all_users:
            if not user.employee_id:
                orphaned_users.append(user)
            else:
                employee = db.get(models.Employee, user.employee_id)
                if not employee:
                    orphaned_users.append(user)
        
        for user in orphaned_users:
            # Keep user if it's linked to Leif
            if user.employee_id == leif_employee.id:
                continue
            print(f"Deleting orphaned User ID {user.id}: {user.username} ({user.email})")
            db.delete(user)
        
        # Ensure Leif has a user account
        leif_user = db.query(models.User).filter(
            (models.User.employee_id == leif_employee.id) |
            (models.User.email == "leif@deanshomer.com")
        ).first()
        
        if not leif_user:
            print()
            print("Creating user account for Leif...")
            from backend.routers.auth import hash_password
            import secrets
            from datetime import datetime, timedelta
            
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
            print(f"Created User ID {leif_user.id}: {leif_user.username} ({leif_user.email})")
        else:
            # Ensure user is linked to employee
            if leif_user.employee_id != leif_employee.id:
                print(f"Linking User ID {leif_user.id} to Employee ID {leif_employee.id}")
                leif_user.employee_id = leif_employee.id
            # Ensure user is admin
            if not leif_user.is_admin:
                print(f"Granting admin access to User ID {leif_user.id}")
                leif_user.is_admin = True
        
        db.commit()
        
        print()
        print("="*80)
        print("CLEANUP COMPLETE")
        print("="*80)
        
        # Verify
        remaining_employees = db.execute(select(models.Employee)).scalars().all()
        remaining_users = db.execute(select(models.User)).scalars().all()
        
        print(f"\nRemaining employees: {len(remaining_employees)}")
        for emp in remaining_employees:
            print(f"  - Employee ID {emp.id}: {emp.name} ({emp.email})")
        
        print(f"\nRemaining users: {len(remaining_users)}")
        for user in remaining_users:
            employee = db.get(models.Employee, user.employee_id) if user.employee_id else None
            print(f"  - User ID {user.id}: {user.username} ({user.email})")
            if employee:
                print(f"    Linked to: Employee ID {employee.id} ({employee.name})")
            else:
                print(f"    NOT LINKED TO ANY EMPLOYEE")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Check if we're in cloud environment
    if os.getenv("ENVIRONMENT") == "production":
        print("Running in PRODUCTION environment. Proceed with caution!")
        response = input("Type 'yes' to proceed with database cleanup: ")
        if response.lower() == "yes":
            cleanup_cloud_db()
        else:
            print("Cancelled.")
    else:
        print("Running in development environment.")
        cleanup_cloud_db()



