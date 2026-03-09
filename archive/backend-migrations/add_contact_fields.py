"""
Script to add notes and linkedin_url columns to contacts table.
Run this once to update your database schema.
"""
import sqlite3
from pathlib import Path
import os

# Get database path (same logic as add_contact_id_to_logs.py)
DB_NAME = os.getenv("DATABASE_URL", "sqlite:///./workbench.db")
if DB_NAME.startswith("sqlite:///"):
    db_path = DB_NAME.replace("sqlite:///", "")
    if db_path.startswith("./"):
        # Relative to project root (one level up from backend folder)
        DB_PATH = Path(__file__).parent.parent / db_path[2:]
    else:
        DB_PATH = Path(db_path)
else:
    # Default: workbench.db in project root
    DB_PATH = Path(__file__).parent.parent / "workbench.db"

print(f"Using database: {DB_PATH}")

def add_contact_fields():
    """Add notes and linkedin_url columns to contacts table if they don't exist."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # First, check what tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Tables in database: {tables}")
        
        if "contacts" not in tables:
            print("✗ 'contacts' table does not exist.")
            print("  The backend will create it automatically when it starts.")
            return
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(contacts)")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"Current columns in contacts table: {columns}")
        
        added_any = False
        
        # Add notes column if missing
        if "notes" not in columns:
            print("\nAdding notes column to contacts table...")
            try:
                cursor.execute("ALTER TABLE contacts ADD COLUMN notes TEXT")
                conn.commit()
                print("✓ Successfully added notes column")
                added_any = True
            except sqlite3.OperationalError as e:
                if "duplicate column" in str(e).lower():
                    print("✓ notes column already exists")
                else:
                    raise
        else:
            print("✓ notes column already exists")
        
        # Add linkedin_url column if missing
        if "linkedin_url" not in columns:
            print("\nAdding linkedin_url column to contacts table...")
            try:
                cursor.execute("ALTER TABLE contacts ADD COLUMN linkedin_url VARCHAR(500)")
                conn.commit()
                print("✓ Successfully added linkedin_url column")
                added_any = True
            except sqlite3.OperationalError as e:
                if "duplicate column" in str(e).lower():
                    print("✓ linkedin_url column already exists")
                else:
                    raise
        else:
            print("✓ linkedin_url column already exists")
        
        if not added_any:
            print("\n✓ All required columns already exist in contacts table")
            
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_contact_fields()

