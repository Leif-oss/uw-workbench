"""
Script to create the initial user account.
Usage: python -m backend.create_user
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.database import SessionLocal
from backend import models
from backend.routers.auth import hash_password

def create_user():
    """Create the partner1 user."""
    db = SessionLocal()
    try:
        # Check if user already exists
        existing = db.query(models.User).filter(
            models.User.username == "partner1"
        ).first()
        
        if existing:
            print("User 'partner1' already exists. Updating password...")
            existing.password_hash = hash_password("partner1234")
            db.commit()
            print("✅ Password updated for user 'partner1'")
        else:
            # Create new user
            user = models.User(
                username="partner1",
                password_hash=hash_password("partner1234"),
                is_active=True
            )
            db.add(user)
            db.commit()
            print("✅ User 'partner1' created successfully")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating user: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_user()





