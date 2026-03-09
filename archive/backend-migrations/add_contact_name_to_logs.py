import sqlite3
from pathlib import Path

# Database path (project root)
DB_PATH = Path(__file__).parent.parent / "workbench.db"

print(f"Using database: {DB_PATH}")

def add_contact_field_to_logs():
    """Add contact field (string) to logs table if it doesn't exist."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if logs table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Tables in database: {tables}")

        if "logs" not in tables:
            print("✗ 'logs' table does not exist.")
            print("  The backend will create it automatically when it starts.")
            return

        # Check current columns in logs table
        cursor.execute("PRAGMA table_info(logs)")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"Current columns in logs table: {columns}")

        if "contact" not in columns:
            print("Adding 'contact' column to logs table...")
            cursor.execute("""
                ALTER TABLE logs
                ADD COLUMN contact VARCHAR(255)
            """)
            conn.commit()
            print("✓ Successfully added 'contact' column to logs table")
        else:
            print("✓ 'contact' column already exists in logs table")

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_contact_field_to_logs()

