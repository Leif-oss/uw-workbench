"""Reset password for leif user in local database."""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from backend.database import SessionLocal
from backend import models
from backend.routers.auth import hash_password

db = SessionLocal()

try:
    # Find leif user
    user = db.query(models.User).filter(models.User.username == "leif").first()
    
    if not user:
        print("[ERROR] User 'leif' not found")
        sys.exit(1)
    
    # Set new password
    new_password = "Temp!local123"
    user.password_hash = hash_password(new_password)
    user.must_change_password = True  # Force password change on next login
    user.failed_login_attempts = 0  # Reset failed attempts
    user.locked_until = None  # Unlock if locked
    
    db.commit()
    
    print("[OK] Password reset successfully!")
    print("")
    print("Login credentials:")
    print(f"  Username: {user.username}")
    print(f"  Email: {user.email}")
    print(f"  Password: {new_password}")
    print("")
    print("[WARNING] You will be prompted to change this password after login.")
    
except Exception as e:
    print(f"[ERROR] Error resetting password: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
    sys.exit(1)
finally:
    db.close()
