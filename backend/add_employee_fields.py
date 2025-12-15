"""
Script to add website, password_hash, and password reset fields to employees table.
"""
from sqlalchemy import text
from .database import engine

def add_employee_fields():
    """Add new fields to employees table."""
    with engine.connect() as conn:
        try:
            # Check if columns exist
            result = conn.execute(text("PRAGMA table_info(employees)"))
            columns = [row[1] for row in result]
            
            if "website" not in columns:
                conn.execute(text("ALTER TABLE employees ADD COLUMN website VARCHAR(255)"))
                conn.commit()
                print("OK: Added website column to employees table")
            else:
                print("OK: Website column already exists")
            
            if "password_hash" not in columns:
                conn.execute(text("ALTER TABLE employees ADD COLUMN password_hash VARCHAR(255)"))
                conn.commit()
                print("OK: Added password_hash column to employees table")
            else:
                print("OK: password_hash column already exists")
            
            if "password_reset_token" not in columns:
                conn.execute(text("ALTER TABLE employees ADD COLUMN password_reset_token VARCHAR(255)"))
                conn.commit()
                print("OK: Added password_reset_token column to employees table")
            else:
                print("OK: password_reset_token column already exists")
            
            if "password_reset_expires" not in columns:
                conn.execute(text("ALTER TABLE employees ADD COLUMN password_reset_expires DATETIME"))
                conn.commit()
                print("OK: Added password_reset_expires column to employees table")
            else:
                print("OK: password_reset_expires column already exists")
                
        except Exception as e:
            print(f"ERROR: Failed to add employee fields: {e}")
            raise

if __name__ == "__main__":
    add_employee_fields()

