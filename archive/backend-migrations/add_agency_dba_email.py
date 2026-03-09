"""
Migration script to add dba and email columns to the agencies table.
Run this from the project root: python backend/add_agency_dba_email.py
"""
import sqlite3
import os

# Path to the database
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "workbench.db")

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if columns already exist
    cursor.execute("PRAGMA table_info(agencies);")
    columns = [row[1] for row in cursor.fetchall()]
    
    if "dba" not in columns:
        print("Adding 'dba' column to agencies table...")
        cursor.execute("ALTER TABLE agencies ADD COLUMN dba VARCHAR(255);")
        print("Added 'dba' column")
    else:
        print("'dba' column already exists")
    
    if "email" not in columns:
        print("Adding 'email' column to agencies table...")
        cursor.execute("ALTER TABLE agencies ADD COLUMN email VARCHAR(255);")
        print("Added 'email' column")
    else:
        print("'email' column already exists")
    
    conn.commit()
    conn.close()
    print("\nMigration complete!")

if __name__ == "__main__":
    main()

