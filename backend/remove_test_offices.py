"""
Script to remove TEST and LAX offices from the database.
Run this after ensuring no employees or agencies are associated with these offices.
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database import SessionLocal
from backend import models

def remove_test_offices():
    """Remove TEST and LAX offices."""
    db = SessionLocal()
    
    try:
        # Find offices to remove
        test_office = db.query(models.Office).filter(models.Office.code == "TEST").first()
        lax_office = db.query(models.Office).filter(models.Office.code == "LAX").first()
        
        removed = []
        
        if test_office:
            # Check for associated data
            employee_count = db.query(models.Employee).filter(models.Employee.office_id == test_office.id).count()
            agency_count = db.query(models.Agency).filter(models.Agency.office_id == test_office.id).count()
            
            if employee_count > 0 or agency_count > 0:
                print(f"WARNING: TEST office has {employee_count} employees and {agency_count} agencies. Skipping deletion.")
            else:
                print(f"Removing TEST office (ID: {test_office.id})...")
                db.delete(test_office)
                removed.append("TEST")
        
        if lax_office:
            # Check for associated data
            employee_count = db.query(models.Employee).filter(models.Employee.office_id == lax_office.id).count()
            agency_count = db.query(models.Agency).filter(models.Agency.office_id == lax_office.id).count()
            
            if employee_count > 0 or agency_count > 0:
                print(f"WARNING: LAX office has {employee_count} employees and {agency_count} agencies. Skipping deletion.")
            else:
                print(f"Removing LAX office (ID: {lax_office.id})...")
                db.delete(lax_office)
                removed.append("LAX")
        
        if removed:
            db.commit()
            print(f"SUCCESS: Removed offices: {', '.join(removed)}")
        else:
            print("No offices were removed.")
            
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    remove_test_offices()



