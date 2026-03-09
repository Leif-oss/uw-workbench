"""
Script to add email column to employees table if it doesn't exist.
"""
from sqlalchemy import text
from .database import engine

def add_email_column():
    """Add email column to employees table."""
    with engine.connect() as conn:
        try:
            # Check if column exists
            result = conn.execute(text("PRAGMA table_info(employees)"))
            columns = [row[1] for row in result]
            
            if "email" not in columns:
                # Add the email column
                conn.execute(text("""
                    ALTER TABLE employees 
                    ADD COLUMN email VARCHAR(255)
                """))
                conn.commit()
                print("OK: Added email column to employees table")
            else:
                print("OK: Email column already exists")
                
            # Add unique index if it doesn't exist
            try:
                conn.execute(text("""
                    CREATE UNIQUE INDEX IF NOT EXISTS ix_employees_email 
                    ON employees(email)
                """))
                conn.commit()
                print("OK: Email index created (or already exists)")
            except Exception as e:
                print(f"Note: Index creation: {e}")
                
        except Exception as e:
            print(f"ERROR: Failed to add email column: {e}")
            raise

if __name__ == "__main__":
    add_email_column()

