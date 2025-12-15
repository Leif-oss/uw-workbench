"""
Script to create or update the admin user.
Run this to set up Leif as an admin user.
"""
from sqlalchemy.orm import Session
from .database import SessionLocal
from . import models

def create_admin_user():
    """Create or update the admin user."""
    db: Session = SessionLocal()
    try:
        # Check if user already exists
        employee = db.query(models.Employee).filter(
            models.Employee.email == "leif@deanshomer.com"
        ).first()
        
        if employee:
            # Update existing employee
            employee.name = "Leif"
            print(f"Updated existing employee: {employee.name} ({employee.email})")
        else:
            # Create new employee
            # First, get or create a default office (or use first office)
            office = db.query(models.Office).first()
            if not office:
                # Create a default office if none exists
                office = models.Office(code="ADMIN", name="Admin Office")
                db.add(office)
                db.flush()
                print("Created default Admin Office")
            
            employee = models.Employee(
                name="Leif",
                email="leif@deanshomer.com",
                office_id=office.id
            )
            db.add(employee)
            print(f"Created new employee: {employee.name} ({employee.email})")
        
        db.commit()
        print(f"Admin user set up: {employee.name} ({employee.email})")
        print(f"  Employee ID: {employee.id}")
        print(f"  Office ID: {employee.office_id}")
        print("\nNote: To grant admin access, set DEV_USER_GROUPS=admin in your .env file")
        print("      or ensure X-Groups header includes 'admin' in production")
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: Failed to create admin user: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()

