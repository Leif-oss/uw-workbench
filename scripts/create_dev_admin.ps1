# Create Admin User in DEV Cloud Deployment
# This script calls the admin setup endpoint to create an admin user in DEV

$ErrorActionPreference = "Continue"

Write-Host "Creating Admin User in DEV Cloud Deployment" -ForegroundColor Cyan
Write-Host ""

# Configuration
$PROJECT_ID = "ultra-ace-481723-e6"
$REGION = "us-central1"
$BACKEND_SERVICE = "uw-workbench-backend-dev"

# Get backend URL
$backendUrl = (gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(status.url)" --project=$PROJECT_ID 2>&1 | Out-String).Trim()

if (-not $backendUrl -or -not $backendUrl.StartsWith("http")) {
    Write-Host "ERROR: Could not get backend URL. Is the backend deployed?" -ForegroundColor Red
    Write-Host "Please run: .\scripts\deploy_dev.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "Backend URL: $backendUrl" -ForegroundColor Green
Write-Host ""

# Default admin user details
$adminName = "Leif"
$adminEmail = "leif@deanshomer.com"
$adminUsername = "leif"
$adminPassword = "TempPassword123!"  # Change this after first login
$setupToken = "CHANGE_THIS_IN_PRODUCTION"  # Default token

Write-Host "Creating admin user with:" -ForegroundColor Yellow
Write-Host "  Name: $adminName" -ForegroundColor Gray
Write-Host "  Email: $adminEmail" -ForegroundColor Gray
Write-Host "  Username: $adminUsername" -ForegroundColor Gray
Write-Host "  Password: $adminPassword" -ForegroundColor Gray
Write-Host ""

# Call the setup endpoint
$body = @{
    username = $adminUsername
    email = $adminEmail
    password = $adminPassword
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
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS: Admin user created!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Username: $($response.username)" -ForegroundColor Cyan
    Write-Host "Email: $($response.email)" -ForegroundColor Cyan
    Write-Host "Password: $adminPassword" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You can now log in with these credentials." -ForegroundColor Green
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
    Write-Host "Note: If admin users already exist, the endpoint will return an error." -ForegroundColor Yellow
    Write-Host "In that case, you can log in with existing credentials." -ForegroundColor Yellow
}
