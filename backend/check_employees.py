"""Script to check for employees that might not be showing up in the admin page."""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from backend.database import SessionLocal
from backend import models

def check_employees():
    db = SessionLocal()
    try:
        # Get all employees
        employees = db.execute(select(models.Employee)).scalars().all()
        
        print(f"Total employees in database: {len(employees)}")
        print("\n" + "="*80)
        print("All Employees:")
        print("="*80)
        
        for emp in employees:
            # Check if employee has a user account
            user = db.query(models.User).filter(
                (models.User.employee_id == emp.id) |
                (models.User.email == emp.email)
            ).first()
            
            user_status = "[HAS USER]" if user else "[NO USER]"
            user_email = f" (User email: {user.email})" if user and user.email else ""
            
            print(f"\nID: {emp.id}")
            print(f"  Name: {emp.name}")
            print(f"  Email: {emp.email or '(NO EMAIL)'}")
            print(f"  Office ID: {emp.office_id or '(NO OFFICE)'}")
            print(f"  Role: {emp.role or '(NO ROLE)'}")
            print(f"  User Account: {user_status}{user_email}")
            
            # Check for duplicate emails
            if emp.email:
                duplicates = db.query(models.Employee).filter(
                    models.Employee.email == emp.email,
                    models.Employee.id != emp.id
                ).all()
                if duplicates:
                    print(f"  WARNING: Email {emp.email} is used by other employees:")
                    for dup in duplicates:
                        print(f"      - Employee ID {dup.id}: {dup.name}")
        
        print("\n" + "="*80)
        print("Summary:")
        print("="*80)
        
        employees_with_email = [e for e in employees if e.email]
        employees_without_email = [e for e in employees if not e.email]
        employees_with_user = []
        employees_without_user = []
        
        for emp in employees:
            user = db.query(models.User).filter(
                (models.User.employee_id == emp.id) |
                (models.User.email == emp.email)
            ).first()
            if user:
                employees_with_user.append(emp)
            else:
                employees_without_user.append(emp)
        
        print(f"Employees with email: {len(employees_with_email)}")
        print(f"Employees without email: {len(employees_without_email)}")
        print(f"Employees with user account: {len(employees_with_user)}")
        print(f"Employees without user account: {len(employees_without_user)}")
        
        # Check for duplicate emails
        email_counts = {}
        for emp in employees:
            if emp.email:
                email_counts[emp.email] = email_counts.get(emp.email, 0) + 1
        
        duplicate_emails = {email: count for email, count in email_counts.items() if count > 1}
        if duplicate_emails:
            print(f"\nDUPLICATE EMAILS FOUND:")
            for email, count in duplicate_emails.items():
                print(f"  {email}: used by {count} employees")
                emps_with_email = [e for e in employees if e.email == email]
                for emp in emps_with_email:
                    print(f"    - Employee ID {emp.id}: {emp.name} (Office: {emp.office_id})")
        
        if employees_without_email:
            print(f"\nEMPLOYEES WITHOUT EMAIL (may not show up properly):")
            for emp in employees_without_email:
                print(f"  - Employee ID {emp.id}: {emp.name}")
        
        if employees_without_user:
            print(f"\nEMPLOYEES WITHOUT USER ACCOUNT:")
            for emp in employees_without_user:
                print(f"  - Employee ID {emp.id}: {emp.name} (Email: {emp.email or 'NO EMAIL'})")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_employees()

