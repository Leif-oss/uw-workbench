# Create Admin User in Cloud Deployment
# This script calls the admin setup endpoint to create an admin user

$ErrorActionPreference = "Continue"

Write-Host "Creating Admin User in Cloud Deployment" -ForegroundColor Cyan
Write-Host ""

# Get project ID
$PROJECT_ID = (gcloud config get-value project 2>&1 | Out-String).Trim()
if (-not $PROJECT_ID -or $PROJECT_ID -eq "" -or $PROJECT_ID -match "ERROR" -or $PROJECT_ID -match "unset") {
    Write-Host "ERROR: No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Red
    exit 1
}

# Get backend URL
$REGION = "us-central1"
$backendUrl = (gcloud run services describe uw-workbench-backend --region=$REGION --format="value(status.url)" --project=$PROJECT_ID 2>&1 | Out-String).Trim()

if (-not $backendUrl -or -not $backendUrl.StartsWith("http")) {
    Write-Host "ERROR: Could not get backend URL. Is the backend deployed?" -ForegroundColor Red
    exit 1
}

Write-Host "Backend URL: $backendUrl" -ForegroundColor Green
Write-Host ""

# Get admin details
Write-Host "Enter admin user details:" -ForegroundColor Yellow
$adminName = Read-Host "Admin Name (e.g., 'Admin User')"
$adminEmail = Read-Host "Admin Email (e.g., 'admin@company.com')"
$adminUsername = Read-Host "Username for login (e.g., 'admin')"
$adminPassword = Read-Host "Password" -AsSecureString

# Convert secure string to plain text
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPassword)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Setup token (default, should be changed in production)
$setupToken = Read-Host "Setup Token (default: 'CHANGE_THIS_IN_PRODUCTION')"
if (-not $setupToken) {
    $setupToken = "CHANGE_THIS_IN_PRODUCTION"
}

Write-Host ""
Write-Host "Creating admin user..." -ForegroundColor Cyan

# Call the setup endpoint
$body = @{
    username = $adminUsername
    email = $adminEmail
    password = $plainPassword
    name = $adminName
    setup_token = $setupToken
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$backendUrl/admin/setup-admin" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host ""
    Write-Host "=" * 60 -ForegroundColor Green
    Write-Host "SUCCESS: Admin user created!" -ForegroundColor Green
    Write-Host "=" * 60 -ForegroundColor Green
    Write-Host "Username: $($response.username)" -ForegroundColor Cyan
    Write-Host "Email: $($response.email)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can now log in with these credentials." -ForegroundColor Yellow
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to create admin user" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Note: If admin users already exist, try using default credentials:" -ForegroundColor Yellow
    Write-Host "  Username: partner1" -ForegroundColor Cyan
    Write-Host "  Password: partner1234" -ForegroundColor Cyan
}



