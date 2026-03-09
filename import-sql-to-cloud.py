#!/usr/bin/env python3
"""
Read SQL file and import to Cloud SQL via the import endpoint.
"""
import requests
import sys
import os

sql_file = "local_data_export.sql"

print("="*60)
print("Import SQL to Cloud SQL")
print("="*60)
print()

if not os.path.exists(sql_file):
    print(f"ERROR: SQL file not found: {sql_file}")
    sys.exit(1)

print(f"Reading {sql_file}...")
try:
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
except UnicodeDecodeError:
    # Try with latin-1 encoding (more permissive)
    with open(sql_file, 'r', encoding='latin-1') as f:
        sql_content = f.read()

file_size = len(sql_content)
print(f"  File size: {file_size / 1024 / 1024:.2f} MB")
print()

# Cloud Run backend URL
backend_url = "https://uw-workbench-backend-944484068966.us-central1.run.app"
import_url = f"{backend_url}/admin/import-sql"

print("Uploading to Cloud SQL...")
print(f"  URL: {import_url}")
print()

try:
    # Send as plain text in body (not JSON)
    response = requests.post(
        import_url,
        data=sql_content.encode('utf-8'),
        headers={"Content-Type": "text/plain"},
        timeout=300  # 5 minutes for large files
    )
    
    if response.status_code == 200:
        result = response.json()
        print("SUCCESS! Import successful!")
        print()
        print(f"  Executed: {result.get('executed', 0)} statements")
        
        if result.get('errors'):
            print(f"  Errors: {len(result['errors'])}")
            for error in result['errors'][:5]:
                print(f"    - {error}")
    else:
        print(f"FAILED: {response.status_code}")
        try:
            error_text = response.text[:500]  # First 500 chars
            print(f"Error: {error_text}")
        except:
            print(f"Error response received (status {response.status_code})")
        sys.exit(1)
        
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print()
print("="*60)
print("Import Complete!")
print("="*60)
print()
print("Your local database data has been imported to Cloud SQL.")
print("You can now log in with your existing credentials:")
print("  - Username: leif")
print("  - Email: leif@deanshomer.com")
print("  - Password: (your local password)")
print()
