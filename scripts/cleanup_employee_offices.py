#!/usr/bin/env python3
"""
Cleanup script to fix stale employee_offices relationships.
This script:
1. Removes employee_offices entries that don't match the employee's current office_ids
2. Ensures legacy office_id field is synced with the many-to-many relationship
"""
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir.parent))

from sqlalchemy.orm import Session
from backend.database import engine, get_db
from backend import models

def cleanup_employee_offices():
    """Clean up stale employee_offices relationships."""
    db: Session = next(get_db())
    
    try:
        # Get all employees
        employees = db.query(models.Employee).all()
        
        print(f"Found {len(employees)} employees")
        
        fixed_count = 0
        for emp in employees:
            # Get current office_ids from many-to-many relationship
            current_office_ids = {office.id for office in emp.offices}
            
            # Get office_id from legacy field
            legacy_office_id = emp.office_id
            
            # Determine what the office_ids should be
            if current_office_ids:
                # Use many-to-many relationship as source of truth
                expected_office_ids = current_office_ids
                # Sync legacy field to first office
                if legacy_office_id not in current_office_ids:
                    emp.office_id = list(current_office_ids)[0] if current_office_ids else None
                    fixed_count += 1
                    print(f"  Employee {emp.id} ({emp.name}): Synced legacy office_id to {emp.office_id}")
            elif legacy_office_id:
                # Only legacy field is set, migrate to many-to-many
                office = db.query(models.Office).filter(models.Office.id == legacy_office_id).first()
                if office:
                    emp.offices = [office]
                    fixed_count += 1
                    print(f"  Employee {emp.id} ({emp.name}): Migrated legacy office_id {legacy_office_id} to many-to-many")
            else:
                # No offices assigned, ensure both are cleared
                if emp.offices:
                    emp.offices = []
                    fixed_count += 1
                    print(f"  Employee {emp.id} ({emp.name}): Cleared stale office assignments")
                if emp.office_id:
                    emp.office_id = None
                    fixed_count += 1
                    print(f"  Employee {emp.id} ({emp.name}): Cleared legacy office_id")
        
        if fixed_count > 0:
            db.commit()
            print(f"\n✅ Fixed {fixed_count} employee-office relationships")
        else:
            print("\n✅ No issues found - all relationships are in sync")
        
        # Now check for orphaned employee_offices entries
        from sqlalchemy import text
        result = db.execute(text("""
            SELECT eo.employee_id, eo.office_id 
            FROM employee_offices eo
            LEFT JOIN employees e ON e.id = eo.employee_id
            LEFT JOIN offices o ON o.id = eo.office_id
            WHERE e.id IS NULL OR o.id IS NULL
        """))
        orphaned = result.fetchall()
        
        if orphaned:
            print(f"\n⚠️  Found {len(orphaned)} orphaned employee_offices entries:")
            for emp_id, office_id in orphaned:
                print(f"  - employee_id={emp_id}, office_id={office_id}")
            
            # Delete orphaned entries
            db.execute(text("""
                DELETE FROM employee_offices
                WHERE employee_id NOT IN (SELECT id FROM employees)
                   OR office_id NOT IN (SELECT id FROM offices)
            """))
            db.commit()
            print(f"✅ Deleted {len(orphaned)} orphaned entries")
        else:
            print("\n✅ No orphaned employee_offices entries found")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = cleanup_employee_offices()
    sys.exit(0 if success else 1)
