"""
Seed initial data for the database.
Run this script after running migrations to populate initial/required data.

Usage:
    python -m backend.scripts.seed_data

This creates:
- Default office (if none exists)
- Any other required initial data

This does NOT create:
- Users (use /admin/setup-admin endpoint or create_admin_user.py)
- Employees (must be created manually via admin interface)
- Test data (use populate_test_data.py if needed)
"""
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend import models
from backend.crud import create_office
from backend import schemas

def seed_initial_data():
    """Seed initial required data."""
    import logging
    logger = logging.getLogger(__name__)
    
    db: Session = SessionLocal()
    try:
        # Create default office if none exists
        office_count = db.query(models.Office).count()
        if office_count == 0:
            logger.info("No offices found. Creating default office...")
            try:
                default_office = create_office(db, schemas.OfficeCreate(code="MAIN", name="Main Office"))
                db.commit()
                print(f"[OK] Created default office: {default_office.code} - {default_office.name}")
                print("   NOTE: All users, employees, and other data must be added manually.")
                print("   Use /admin/setup-admin endpoint or create_admin_user.py to create admin user.")
            except Exception as e:
                db.rollback()
                print(f"[ERROR] Error creating default office: {e}")
                raise
        else:
            print(f"[INFO] Found {office_count} existing office(s). No seed data needed.")
        
        print("\n[OK] Seed data check complete.")
        
    except Exception as e:
        print(f"[ERROR] Error seeding data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    
    print("=" * 60)
    print("SEEDING INITIAL DATA")
    print("=" * 60)
    print()
    
    seed_initial_data()
    
    print("\n" + "=" * 60)
    print("SEED COMPLETE")
    print("=" * 60)
