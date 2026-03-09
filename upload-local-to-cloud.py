#!/usr/bin/env python3
"""
Export data from local PostgreSQL and upload to Cloud SQL.
"""
import os
import sys
from sqlalchemy import create_engine, text, inspect
import urllib.parse
import subprocess
import json

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def get_cloud_db_url():
    """Get Cloud SQL connection URL."""
    # Get password from Secret Manager
    result = subprocess.run(
        ["gcloud", "secrets", "versions", "access", "latest", "--secret=db-password"],
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print("ERROR: Could not get Cloud SQL password from Secret Manager")
        sys.exit(1)
    
    password = result.stdout.strip()
    connection_name = "ultra-ace-481723-e6:us-central1:uw-workbench-db"
    user = "postgres"
    db_name = "uw_workbench"
    
    encoded_password = urllib.parse.quote_plus(password)
    return f"postgresql+psycopg2://{user}:{encoded_password}@/{db_name}?host=/cloudsql/{connection_name}"

def export_table_data(engine, table_name):
    """Export all data from a table."""
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT * FROM {table_name}"))
        columns = result.keys()
        rows = result.fetchall()
        
        return {
            'columns': list(columns),
            'rows': [dict(row._mapping) for row in rows]
        }

def import_table_data(engine, table_name, data, dry_run=False):
    """Import data into a table."""
    if not data['rows']:
        return 0
    
    imported = 0
    
    with engine.begin() as conn:
        # Disable triggers temporarily
        conn.execute(text("SET session_replication_role = 'replica';"))
        
        for row in data['rows']:
            # Filter None values
            values = {k: v for k, v in row.items() if v is not None}
            
            if not values:
                continue
            
            # Convert complex types to JSON strings
            for key, value in values.items():
                if isinstance(value, (dict, list)):
                    values[key] = json.dumps(value)
            
            col_names = ", ".join(values.keys())
            placeholders = ", ".join([f":{k}" for k in values.keys()])
            
            # Use ON CONFLICT DO NOTHING to avoid duplicates
            sql = f"""
                INSERT INTO {table_name} ({col_names})
                VALUES ({placeholders})
                ON CONFLICT DO NOTHING
            """
            
            try:
                if not dry_run:
                    conn.execute(text(sql), values)
                imported += 1
            except Exception as e:
                print(f"  ⚠️  Error: {e}")
                continue
        
        # Re-enable triggers
        conn.execute(text("SET session_replication_role = 'origin';"))
    
    return imported

def main():
    print("="*60)
    print("Upload Local Database to Cloud SQL")
    print("="*60)
    print()
    
    # Connect to local database
    print("Step 1: Connecting to local database...")
    local_url = "postgresql://uw_workbench:dev_password_change_me@localhost:5432/uw_workbench"
    local_engine = create_engine(local_url)
    
    # Get list of tables (excluding alembic)
    inspector = inspect(local_engine)
    all_tables = inspector.get_table_names()
    tables = [t for t in all_tables if t != 'alembic_version']
    
    print(f"  Found {len(tables)} tables to export")
    print()
    
    # Export data
    print("Step 2: Exporting data from local database...")
    exported_data = {}
    for table in tables:
        print(f"  Exporting {table}...", end=" ")
        data = export_table_data(local_engine, table)
        exported_data[table] = data
        print(f"{len(data['rows'])} rows")
    
    print()
    print(f"✅ Exported {len(tables)} tables")
    print()
    
    # Connect to Cloud SQL
    print("Step 3: Connecting to Cloud SQL...")
    print("  (This requires Cloud SQL Proxy or running from Cloud Run)")
    print()
    
    cloud_url = get_cloud_db_url()
    cloud_engine = create_engine(cloud_url)
    
    # Test connection
    try:
        with cloud_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("  ✅ Connected to Cloud SQL")
        print()
    except Exception as e:
        print(f"  ❌ Failed to connect: {e}")
        print()
        print("Note: To connect to Cloud SQL, you need either:")
        print("  1. Cloud SQL Proxy running locally")
        print("  2. Run this script from Cloud Run")
        print("  3. Use 'gcloud sql connect' to import manually")
        print()
        print("For now, I'll save the data to a file you can import manually...")
        
        # Save to JSON file
        output_file = "database_export.json"
        with open(output_file, 'w') as f:
            json.dump(exported_data, f, indent=2, default=str)
        print(f"  ✅ Data saved to {output_file}")
        print(f"  You can import this later using a Cloud Run job")
        sys.exit(0)
    
    # Import data
    print("Step 4: Importing data to Cloud SQL...")
    print()
    
    total_imported = 0
    for table, data in exported_data.items():
        print(f"  Importing {table}...", end=" ")
        imported = import_table_data(cloud_engine, table, data)
        print(f"{imported} rows imported")
        total_imported += imported
    
    print()
    print("="*60)
    print("✅ Upload Complete!")
    print("="*60)
    print()
    print(f"Imported {total_imported} rows across {len(exported_data)} tables")
    print()
    print("You can now log in with your existing local credentials:")
    print("  - Username: leif")
    print("  - Email: leif@deanshomer.com")
    print("  - Password: (your local password)")
    print()

if __name__ == "__main__":
    main()
