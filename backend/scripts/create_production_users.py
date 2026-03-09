"""
Script to create production users.
Run this after deploying to create initial users.
"""
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.orm import Session
from backend.database import SessionLocal, Base, engine
from backend import models
from backend.routers.auth import hash_password

def create_user(username: str, password: str, is_admin: bool = False, employee_id: int = None):
    """Create a new user account in the database."""
    db: Session = SessionLocal()
    try:
        # Tables should exist from Alembic migrations
        # Run 'alembic upgrade head' before using this script

        existing_user = db.query(models.User).filter(models.User.username == username).first()
        if existing_user:
            print(f"User '{username}' already exists. Updating...")
            existing_user.password_hash = hash_password(password)
            existing_user.is_admin = is_admin
            existing_user.is_active = True
            if employee_id:
                existing_user.employee_id = employee_id
            db.commit()
            print(f"✅ User '{username}' updated successfully.")
            return existing_user
        else:
            print(f"Creating new user '{username}'...")
            user = models.User(
                username=username,
                password_hash=hash_password(password),
                is_active=True,
                is_admin=is_admin,
                employee_id=employee_id
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"✅ User '{username}' created successfully.")
            print(f"   - Admin: {is_admin}")
            print(f"   - Employee ID: {employee_id}")
            return user
    except Exception as e:
        print(f"❌ Error creating/updating user: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Creating production users...")
    print("")
    
    # Create admin user: Leif
    create_user("leif", "1qazxsw2", is_admin=True)
    
    # Create underwriter user: Leif (if they want the same username, we can use a variation)
    # Or create a separate underwriter user
    # For now, creating a separate underwriter user "leif_uw" 
    # If they want both to be "leif", we'll need to clarify or use employee_id to distinguish
    create_user("leif_uw", "1qazxsw2", is_admin=False)
    
    print("")
    print("✅ All users created!")


