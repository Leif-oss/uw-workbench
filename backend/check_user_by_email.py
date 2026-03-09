"""Check for user account with specific email."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from backend.database import SessionLocal
from backend import models

def check_user(email: str):
    db = SessionLocal()
    try:
        # Find user with this email
        user = db.query(models.User).filter(models.User.email == email).first()
        
        if user:
            print(f"Found user account:")
            print(f"  User ID: {user.id}")
            print(f"  Username: {user.username}")
            print(f"  Email: {user.email}")
            print(f"  Is Admin: {user.is_admin}")
            print(f"  Employee ID: {user.employee_id}")
            
            # Check if employee exists
            if user.employee_id:
                employee = db.get(models.Employee, user.employee_id)
                if employee:
                    print(f"\nLinked Employee:")
                    print(f"  Employee ID: {employee.id}")
                    print(f"  Name: {employee.name}")
                    print(f"  Email: {employee.email}")
                    print(f"  Office ID: {employee.office_id}")
                    print(f"  Role: {employee.role}")
                else:
                    print(f"\nWARNING: Employee ID {user.employee_id} not found!")
            else:
                print(f"\nNo employee linked to this user account.")
            
            # Check for other employees with this email
            employees_with_email = db.query(models.Employee).filter(
                models.Employee.email == email
            ).all()
            
            if employees_with_email:
                print(f"\nEmployees with this email ({len(employees_with_email)}):")
                for emp in employees_with_email:
                    print(f"  Employee ID: {emp.id}, Name: {emp.name}, Office: {emp.office_id}")
            else:
                print(f"\nNo employees found with this email.")
        else:
            print(f"No user account found with email: {email}")
            
            # Check for employees with this email
            employees_with_email = db.query(models.Employee).filter(
                models.Employee.email == email
            ).all()
            
            if employees_with_email:
                print(f"\nBut found {len(employees_with_email)} employee(s) with this email:")
                for emp in employees_with_email:
                    print(f"  Employee ID: {emp.id}, Name: {emp.name}, Office: {emp.office_id}")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    email = "leifkeller@hotmail.com"
    check_user(email)



