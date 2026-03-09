"""
Migration script to add new columns to the production table.
Run this once to update existing databases with the new fields.
"""
import sqlite3
from pathlib import Path

# Path to database
db_path = Path(__file__).parent.parent / 'private' / 'databases' / 'workbench.db'

if not db_path.exists():
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

# Get existing columns
cursor.execute("PRAGMA table_info(production)")
existing_columns = [row[1] for row in cursor.fetchall()]
print(f"Existing columns: {existing_columns}")

# Columns to add (if they don't exist)
new_columns = [
    ("affiliated_code", "VARCHAR(50)"),
    ("standard_lines_ytd_wp", "INTEGER"),
    ("standard_lines_ytd_nb", "INTEGER"),
    ("standard_lines_pytd_wp", "INTEGER"),
    ("standard_lines_pytd_nb", "INTEGER"),
    ("surplus_lines_ytd_wp", "INTEGER"),
    ("surplus_lines_ytd_nb", "INTEGER"),
    ("surplus_lines_pytd_wp", "INTEGER"),
    ("surplus_lines_pytd_nb", "INTEGER"),
    ("premium_change", "INTEGER"),
    ("three_year_plus", "INTEGER"),
    ("twelve_mo_bind_ratio", "VARCHAR(20)"),
    ("twelve_mo_bound", "INTEGER"),
    ("twelve_mo_quoted", "INTEGER"),
    ("twelve_mo_decline", "INTEGER"),
]

added_count = 0
for col_name, col_type in new_columns:
    if col_name not in existing_columns:
        try:
            cursor.execute(f"ALTER TABLE production ADD COLUMN {col_name} {col_type}")
            print(f"[OK] Added column: {col_name}")
            added_count += 1
        except sqlite3.OperationalError as e:
            print(f"[ERROR] Error adding {col_name}: {e}")
    else:
        print(f"[SKIP] Column {col_name} already exists")

conn.commit()
conn.close()

print(f"\n[DONE] Migration complete! Added {added_count} new columns.")

