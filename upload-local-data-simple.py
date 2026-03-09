#!/usr/bin/env python3
"""
Simple script to export data from local PostgreSQL and import to Cloud SQL.
Uses Python libraries instead of requiring pg_dump/psql.
"""
import os
import sys
from sqlalchemy import create_engine, inspect, text
import urllib.parse

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend import models

def export_local_data():
    """Export data from local database."""
    print("="*60)
    print("Exporting data from local database...")
    print("="*60)
    print()
    
    # Local database connection
    local_url = "postgresql://uw_workbench:dev_password_change_me@localhost:5432/uw_workbench"
    local_engine = create_engine(local_url)
    
    # Get all tables
    inspector = inspect(local_engine)
    tables = inspector.get_table_names()
    
    print(f"Found {len(tables)} tables")
    print()
    
    exported_data = {}
    
    with local_engine.connect() as conn:
        for table_name in tables:
            # Skip alembic version table
            if table_name == 'alembic_version':
                continue
                
            print(f"Exporting {table_name}...", end=" ")
            
            # Get all rows
            result = conn.execute(text(f"SELECT * FROM {table_name}"))
            rows = result.fetchall()
            
            # Get column names
            columns = result.keys()
            
            exported_data[table_name] = {
                'columns': list(columns),
                'rows': [dict(row._mapping) for row in rows]
            }
            
            print(f"{len(rows)} rows")
    
    print()
    print("✅ Export complete!")
    print()
    
    return exported_data

def import_to_cloud(data):
    """Import data to Cloud SQL."""
    print("="*60)
    print("Importing data to Cloud SQL...")
    print("="*60)
    print()
    
    # Get Cloud SQL password
    import subprocess
    result = subprocess.run(
        ["gcloud", "secrets", "versions", "access", "latest", "--secret=db-password"],
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print("ERROR: Could not get Cloud SQL password")
        sys.exit(1)
    
    cloud_password = result.stdout.strip()
    
    # Cloud SQL connection (via Cloud SQL Proxy or direct)
    # Using Cloud SQL connection name
    cloud_connection = "ultra-ace-481723-e6:us-central1:uw-workbench-db"
    cloud_user = "postgres"
    cloud_db = "uw_workbench"
    
    # For Cloud SQL, we need to use the connection name format
    # But this requires Cloud SQL Proxy or running from Cloud Run
    # Let's use the connection string that works from within GCP
    encoded_password = urllib.parse.quote_plus(cloud_password)
    cloud_url = f"postgresql+psycopg2://{cloud_user}:{encoded_password}@/{cloud_db}?host=/cloudsql/{cloud_connection}"
    
    print("Connecting to Cloud SQL...")
    print("Note: This requires Cloud SQL Proxy or running from within GCP")
    print()
    
    try:
        cloud_engine = create_engine(cloud_url)
        
        with cloud_engine.connect() as conn:
            # Disable triggers and constraints temporarily
            conn.execute(text("SET session_replication_role = 'replica';"))
            
            for table_name, table_data in data.items():
                if not table_data['rows']:
                    print(f"Skipping {table_name} (empty)")
                    continue
                
                print(f"Importing {table_name}...", end=" ")
                
                columns = table_data['columns']
                rows = table_data['rows']
                
                # Build INSERT statements
                for row in rows:
                    # Filter out None values and format values
                    values = {k: v for k, v in row.items() if v is not None}
                    
                    if not values:
                        continue
                    
                    col_names = ", ".join(values.keys())
                    placeholders = ", ".join([f":{k}" for k in values.keys()])
                    
                    # Handle special cases (like datetime, JSON, etc.)
                    for key, value in values.items():
                        if isinstance(value, dict) or isinstance(value, list):
                            import json
                            values[key] = json.dumps(value)
                    
                    sql = f"INSERT INTO {table_name} ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
                    
                    try:
                        conn.execute(text(sql), values)
                    except Exception as e:
                        print(f"\nWarning: Error inserting into {table_name}: {e}")
                        print(f"SQL: {sql}")
                        print(f"Values: {values}")
                        continue
                
                conn.commit()
                print(f"{len(rows)} rows")
            
            # Re-enable triggers
            conn.execute(text("SET session_replication_role = 'origin';"))
            conn.commit()
        
        print()
        print("✅ Import complete!")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    data = export_local_data()
    import_to_cloud(data)
    
    print()
    print("="*60)
    print("✅ Upload Complete!")
    print("="*60)
    print()
    print("Your local database data has been uploaded to Cloud SQL.")
    print("You can now log in with your existing credentials.")
    print()
