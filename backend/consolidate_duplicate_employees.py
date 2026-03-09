"""
Script to consolidate duplicate employees (same email, different offices) into single records.

This script:
1. Finds employees with duplicate emails
2. Keeps the first employee and assigns all offices to it via the many-to-many relationship
3. Deletes duplicate employee records
4. Preserves user accounts (linked to the kept employee)
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend import models
from collections import defaultdict

def consolidate_duplicates():
    """Consolidate duplicate employees by email."""
    db: Session = SessionLocal()
    
    try:
        # Find all employees grouped by email
        all_employees = db.query(models.Employee).all()
        employees_by_email = defaultdict(list)
        
        for emp in all_employees:
            if emp.email:
                employees_by_email[emp.email.lower()].append(emp)
        
        # Process duplicates
        consolidated_count = 0
        deleted_count = 0
        
        for email, employee_list in employees_by_email.items():
            if len(employee_list) > 1:
                print(f"\nFound {len(employee_list)} employees with email '{email}':")
                for emp in employee_list:
                    offices_info = []
                    if hasattr(emp, 'offices') and emp.offices:
                        offices_info = [f"{o.code} ({o.id})" for o in emp.offices]
                    elif emp.office_id:
                        office = db.query(models.Office).filter(models.Office.id == emp.office_id).first()
                        offices_info = [f"{office.code} ({office.id})"] if office else []
                    print(f"  - Employee ID {emp.id}: {emp.name} (Offices: {', '.join(offices_info) if offices_info else 'None'})")
                
                # Keep the first employee (prefer one with more complete data)
                # Sort by: has user account, has office, has role
                def sort_key(emp):
                    has_user = db.query(models.User).filter(models.User.employee_id == emp.id).first() is not None
                    has_office = (hasattr(emp, 'offices') and emp.offices) or emp.office_id
                    has_role = emp.role is not None
                    return (has_user, has_office, has_role, emp.id)
                
                employee_list.sort(key=sort_key, reverse=True)
                keep_employee = employee_list[0]
                duplicate_employees = employee_list[1:]
                
                print(f"  → Keeping Employee ID {keep_employee.id}: {keep_employee.name}")
                
                # Collect all office IDs from duplicates
                all_office_ids = set()
                
                # Get offices from the employee we're keeping
                if hasattr(keep_employee, 'offices') and keep_employee.offices:
                    all_office_ids.update([o.id for o in keep_employee.offices])
                elif keep_employee.office_id:
                    all_office_ids.add(keep_employee.office_id)
                
                # Get offices from duplicate employees
                for dup_emp in duplicate_employees:
                    if hasattr(dup_emp, 'offices') and dup_emp.offices:
                        all_office_ids.update([o.id for o in dup_emp.offices])
                    elif dup_emp.office_id:
                        all_office_ids.add(dup_emp.office_id)
                
                # Assign all offices to the kept employee
                if all_office_ids:
                    offices = db.query(models.Office).filter(models.Office.id.in_(list(all_office_ids))).all()
                    keep_employee.offices = offices
                    print(f"  → Assigned {len(offices)} office(s) to kept employee")
                
                # Transfer user accounts from duplicates to kept employee
                for dup_emp in duplicate_employees:
                    user = db.query(models.User).filter(models.User.employee_id == dup_emp.id).first()
                    if user:
                        # Check if kept employee already has a user
                        keep_user = db.query(models.User).filter(models.User.employee_id == keep_employee.id).first()
                        if not keep_user:
                            # Transfer user account to kept employee
                            user.employee_id = keep_employee.id
                            print(f"  → Transferred user account from Employee ID {dup_emp.id} to {keep_employee.id}")
                        else:
                            print(f"  → Warning: Both employees have user accounts. Keeping user for Employee ID {keep_employee.id}")
                
                # Delete duplicate employees
                for dup_emp in duplicate_employees:
                    print(f"  → Deleting duplicate Employee ID {dup_emp.id}")
                    db.delete(dup_emp)
                    deleted_count += 1
                
                consolidated_count += 1
        
        if consolidated_count > 0:
            db.commit()
            print(f"\n✓ Consolidated {consolidated_count} duplicate email(s)")
            print(f"✓ Deleted {deleted_count} duplicate employee record(s)")
        else:
            print("\n✓ No duplicate employees found. All employees have unique emails.")
        
    except Exception as e:
        db.rollback()
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        db.close()
    
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("Employee Duplicate Consolidation Script")
    print("=" * 60)
    print("\nThis script will:")
    print("1. Find employees with duplicate emails")
    print("2. Keep the first employee and assign all offices to it")
    print("3. Delete duplicate employee records")
    print("4. Preserve user accounts")
    print("\n" + "=" * 60)
    
    response = input("\nContinue? (yes/no): ")
    if response.lower() not in ['yes', 'y']:
        print("Aborted.")
        sys.exit(0)
    
    success = consolidate_duplicates()
    
    if success:
        print("\n" + "=" * 60)
        print("✓ Consolidation complete!")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("✗ Consolidation failed. Check errors above.")
        print("=" * 60)
        sys.exit(1)


