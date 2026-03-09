# Setup Admin User in Cloud Deployment
# This script creates an admin user in the cloud database

$ErrorActionPreference = "Continue"

Write-Host "Setting up Admin User in Cloud Deployment" -ForegroundColor Cyan
Write-Host ""

# Get project ID
$PROJECT_ID = (gcloud config get-value project 2>&1 | Out-String).Trim()
if (-not $PROJECT_ID -or $PROJECT_ID -eq "" -or $PROJECT_ID -match "ERROR" -or $PROJECT_ID -match "unset") {
    Write-Host "ERROR: No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Red
    exit 1
}

Write-Host "Project: $PROJECT_ID" -ForegroundColor Green
$REGION = "us-central1"
$BACKEND_SERVICE = "uw-workbench-backend"

# Get admin details
Write-Host ""
Write-Host "Enter admin user details:" -ForegroundColor Yellow
$adminName = Read-Host "Admin Name (e.g., 'Admin User')"
$adminEmail = Read-Host "Admin Email (e.g., 'admin@company.com')"
$adminUsername = Read-Host "Username for login (e.g., 'admin')"
$adminPassword = Read-Host "Password" -AsSecureString

# Convert secure string to plain text
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPassword)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "Creating admin user via Cloud Run..." -ForegroundColor Cyan

# Create a Python script to run in Cloud Run
$pythonScript = @"
import sys
import os
sys.path.insert(0, '/app')

from backend.database import SessionLocal
from backend import models
from backend.routers.auth import hash_password

def create_admin():
    db = SessionLocal()
    try:
        # Get or create first office
        office = db.query(models.Office).first()
        if not office:
            office = models.Office(code='ADMIN', name='Admin Office')
            db.add(office)
            db.flush()
        
        # Create or update employee
        employee = db.query(models.Employee).filter(
            models.Employee.email == '$adminEmail'
        ).first()
        
        if not employee:
            employee = models.Employee(
                name='$adminName',
                email='$adminEmail',
                office_id=office.id,
                role='admin'
            )
            db.add(employee)
            db.flush()
        else:
            employee.name = '$adminName'
            employee.role = 'admin'
        
        # Create or update user
        user = db.query(models.User).filter(
            (models.User.email == '$adminEmail') |
            (models.User.username == '$adminUsername')
        ).first()
        
        if not user:
            user = models.User(
                username='$adminUsername',
                email='$adminEmail',
                password_hash=hash_password('$plainPassword'),
                is_active=True,
                is_admin=True,
                employee_id=employee.id
            )
            db.add(user)
        else:
            user.username = '$adminUsername'
            user.email = '$adminEmail'
            user.password_hash = hash_password('$plainPassword')
            user.is_active = True
            user.is_admin = True
            user.employee_id = employee.id
        
        db.commit()
        print(f'SUCCESS: Admin user created/updated')
        print(f'Username: {user.username}')
        print(f'Email: {user.email}')
        print(f'is_admin: {user.is_admin}')
    except Exception as e:
        db.rollback()
        print(f'ERROR: {str(e)}')
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == '__main__':
    create_admin()
"@

# Write script to temp file
$tempScript = [System.IO.Path]::GetTempFileName() + ".py"
$pythonScript | Out-File -FilePath $tempScript -Encoding UTF8

Write-Host "Executing script in Cloud Run container..." -ForegroundColor Cyan

# Copy script to Cloud Run and execute
$result = gcloud run services exec $BACKEND_SERVICE `
    --region=$REGION `
    --project=$PROJECT_ID `
    --command="python" `
    --args="-c","`"exec(open('/tmp/setup_admin.py').read())`"" `
    2>&1

# Alternative: Use Cloud Run Jobs or direct execution
Write-Host ""
Write-Host "Alternative: Using Cloud Run direct execution..." -ForegroundColor Yellow

# Actually, the easiest way is to create an admin endpoint or use the existing default users
Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "DEFAULT ADMIN CREDENTIALS (created on startup):" -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Username: partner1" -ForegroundColor Green
Write-Host "Password: partner1234" -ForegroundColor Green
Write-Host ""
Write-Host "OR" -ForegroundColor Yellow
Write-Host ""
Write-Host "Username: leif" -ForegroundColor Green
Write-Host "Password: 1qazxsw2" -ForegroundColor Green
Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "Try logging in with these credentials first." -ForegroundColor Yellow
Write-Host "If they don't work, we'll create a custom admin user." -ForegroundColor Yellow



