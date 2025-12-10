"""Quick script to check what logs exist in the database"""
import sqlite3
from pathlib import Path

db_path = Path(__file__).parent.parent / "workbench.db"
print(f"Checking database: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check all logs
cursor.execute("SELECT id, user, datetime, contact_id FROM logs ORDER BY id DESC LIMIT 10")
logs = cursor.fetchall()

print(f"\nFound {len(logs)} recent logs:")
for log in logs:
    print(f"  ID: {log[0]}, User: {log[1]}, Date: {log[2]}, Contact ID: {log[3]}")

# Check total count
cursor.execute("SELECT COUNT(*) FROM logs")
total = cursor.fetchone()[0]
print(f"\nTotal logs in database: {total}")

conn.close()

