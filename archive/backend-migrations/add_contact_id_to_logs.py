"""
Script to add contact_id column to logs table.
Run this once to update your database schema.
"""
import sqlite3
from pathlib import Path
import os

# Get database path from env or use default (matches backend/database.py)
DB_PATH = Path(__file__).parent.parent / "workbench.db"

print(f"Using database: {DB_PATH}")

def add_contact_id_column():
    """Add contact_id column to logs table if it doesn't exist."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # First, check what tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Tables in database: {tables}")
        
        if "logs" not in tables:
            print("✗ 'logs' table does not exist.")
            print("  The backend will create it automatically when it starts.")
            print("  If you're seeing this, the backend may not have started yet.")
            return
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(logs)")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"Current columns in logs table: {columns}")
        
        if "contact_id" not in columns:
            print("\nAdding contact_id column to logs table...")
            try:
                # SQLite doesn't support FOREIGN KEY in ALTER TABLE the same way
                # We'll add the column first, then add the foreign key constraint if possible
                cursor.execute("""
                    ALTER TABLE logs 
                    ADD COLUMN contact_id INTEGER
                """)
                conn.commit()
                print("✓ Successfully added contact_id column to logs table")
                print("  Note: Foreign key constraint will be enforced by the application layer.")
            except sqlite3.OperationalError as e:
                if "duplicate column" in str(e).lower():
                    print("✓ contact_id column already exists")
                else:
                    raise
        else:
            print("✓ contact_id column already exists in logs table")
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_contact_id_column()

