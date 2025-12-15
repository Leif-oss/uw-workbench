"""
Script to clear all agency and production data from the database.
This will delete:
- All Production records
- All Agency records (and their associated Contacts via CASCADE)
- All Log records (agency_id will be set to NULL)
- All Task records (agency_id will be set to NULL)

This will NOT delete:
- Offices
- Employees
- Submissions
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import delete
from backend.database import SessionLocal
from backend import models

def clear_agency_production_data():
    """Clear all agency and production data from the database."""
    db = SessionLocal()
    
    try:
        print("Starting data cleanup...")
        
        # 1. Delete all Production records
        print("Deleting Production records...")
        prod_count = db.query(models.Production).count()
        db.execute(delete(models.Production))
        print(f"  - Deleted {prod_count} Production records")
        
        # 2. Delete all Log records (they reference agencies but use SET NULL)
        print("Deleting Log records...")
        log_count = db.query(models.Log).count()
        db.execute(delete(models.Log))
        print(f"  - Deleted {log_count} Log records")
        
        # 3. Delete all Task records (they reference agencies but use SET NULL)
        print("Deleting Task records...")
        task_count = db.query(models.Task).count()
        db.execute(delete(models.Task))
        print(f"  - Deleted {task_count} Task records")
        
        # 4. Delete all Contact records (they will cascade from Agency, but let's be explicit)
        print("Deleting Contact records...")
        contact_count = db.query(models.Contact).count()
        db.execute(delete(models.Contact))
        print(f"  - Deleted {contact_count} Contact records")
        
        # 5. Delete all Agency records (this will cascade delete any remaining contacts)
        print("Deleting Agency records...")
        agency_count = db.query(models.Agency).count()
        db.execute(delete(models.Agency))
        print(f"  - Deleted {agency_count} Agency records")
        
        # Commit all deletions
        db.commit()
        
        print("\n" + "="*50)
        print("Data cleanup completed successfully!")
        print("="*50)
        print(f"Summary:")
        print(f"  - Production records: {prod_count}")
        print(f"  - Agency records: {agency_count}")
        print(f"  - Contact records: {contact_count}")
        print(f"  - Log records: {log_count}")
        print(f"  - Task records: {task_count}")
        print(f"\nTotal records deleted: {prod_count + agency_count + contact_count + log_count + task_count}")
        print("\nOffices and Employees were NOT deleted.")
        print("You can now import fresh data from Excel files.")
        
    except Exception as e:
        db.rollback()
        print(f"\nERROR: Failed to clear data: {e}")
        print("Changes have been rolled back.")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    # Confirm before proceeding
    print("="*50)
    print("WARNING: This will delete ALL agency and production data!")
    print("="*50)
    print("\nThis will delete:")
    print("  - All Production records")
    print("  - All Agency records")
    print("  - All Contact records")
    print("  - All Log records")
    print("  - All Task records")
    print("\nThis will NOT delete:")
    print("  - Offices")
    print("  - Employees")
    print("  - Submissions")
    print("\n" + "="*50)
    
    response = input("\nAre you sure you want to proceed? (type 'yes' to confirm): ")
    
    if response.lower() == 'yes':
        clear_agency_production_data()
    else:
        print("\nOperation cancelled.")

