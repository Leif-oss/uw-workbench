# Create Admin User in Cloud Database
# Usage: .\create-cloud-user.ps1

param(
    [string]$Email = "",
    [string]$Password = "",
    [string]$Name = "",
    [switch]$EnableSetupMode
)

$BackendUrl = "https://uw-workbench-backend-4szvavge6a-uc.a.run.app"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Create Cloud Admin User" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if setup mode is enabled
Write-Host "Checking TEMP_SETUP_MODE status..." -ForegroundColor Yellow
$Env = gcloud run services describe uw-workbench-backend --region=us-central1 --format=json 2>$null | ConvertFrom-Json
$EnvVars = $Env.spec.template.spec.containers[0].env
$SetupMode = ($EnvVars | Where-Object { $_.name -eq "TEMP_SETUP_MODE" }).value

if ($SetupMode -ne "true" -and -not $EnableSetupMode) {
    Write-Host "⚠️  TEMP_SETUP_MODE is not enabled" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "  1. Enable TEMP_SETUP_MODE and use API endpoint (recommended)" -ForegroundColor White
    Write-Host "  2. Connect to Cloud SQL and create user directly" -ForegroundColor White
    Write-Host ""
    $Choice = Read-Host "Enable TEMP_SETUP_MODE and proceed? (yes/no)"
    
    if ($Choice -eq "yes") {
        Write-Host ""
        Write-Host "Enabling TEMP_SETUP_MODE..." -ForegroundColor Yellow
        gcloud run services update uw-workbench-backend `
            --region=us-central1 `
            --update-env-vars="TEMP_SETUP_MODE=true"
        
        Write-Host "✅ TEMP_SETUP_MODE enabled" -ForegroundColor Green
        Write-Host "Waiting 10 seconds for service to update..." -ForegroundColor Gray
        Start-Sleep -Seconds 10
    } else {
        Write-Host ""
        Write-Host "To create user via Cloud SQL, run:" -ForegroundColor Yellow
        Write-Host "  gcloud sql connect uw-workbench-db --user=postgres" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Then create user via SQL or use the admin setup endpoint." -ForegroundColor White
        exit 0
    }
}

# Get user details
if ([string]::IsNullOrEmpty($Email)) {
    Write-Host ""
    Write-Host "Enter admin user details:" -ForegroundColor Yellow
    $Email = Read-Host "Email"
    $Password = Read-Host "Password" -AsSecureString
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
    $Name = Read-Host "Name (optional)"
}

if ([string]::IsNullOrEmpty($Email) -or [string]::IsNullOrEmpty($Password)) {
    Write-Host "❌ Email and password are required" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Creating admin user via API..." -ForegroundColor Yellow
Write-Host "Email: $Email" -ForegroundColor Gray

# Try to use setup-admin endpoint if available
$SetupBody = @{
    email = $Email
    password = $Password
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BackendUrl/api/admin/setup-admin" `
        -Method POST `
        -ContentType "application/json" `
        -Body $SetupBody `
        -TimeoutSec 30 `
        -UseBasicParsing `
        -ErrorAction Stop
    
    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 201) {
        Write-Host "✅ Admin user created successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now log in with:" -ForegroundColor Cyan
        Write-Host "  Email: $Email" -ForegroundColor White
        Write-Host "  Password: [the password you entered]" -ForegroundColor White
        Write-Host ""
        Write-Host "Frontend URL: https://uw-workbench-frontend-4szvavge6a-uc.a.run.app" -ForegroundColor Cyan
        exit 0
    }
} catch {
    $StatusCode = $_.Exception.Response.StatusCode.value__
    $ErrorResponse = $_.Exception.Response
    
    Write-Host "⚠️  Setup endpoint failed (Status: $StatusCode)" -ForegroundColor Yellow
    
    if ($ErrorResponse) {
        $reader = New-Object System.IO.StreamReader($ErrorResponse.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Gray
    }
}

# Alternative: Try users endpoint
Write-Host ""
Write-Host "Trying alternative user creation method..." -ForegroundColor Yellow

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Manual Setup Required" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The API endpoints are not available. You need to create a user manually." -ForegroundColor White
Write-Host ""
Write-Host "Option 1: Connect to Cloud SQL Database" -ForegroundColor Cyan
Write-Host "  1. Connect: gcloud sql connect uw-workbench-db --user=postgres" -ForegroundColor White
Write-Host "  2. Insert user record (see backend/models.py for schema)" -ForegroundColor White
Write-Host ""
Write-Host "Option 2: Use Python script locally" -ForegroundColor Cyan
Write-Host "  1. Set DATABASE_URL to cloud database" -ForegroundColor White
Write-Host "  2. Run: python backend/scripts/create_admin_user.py" -ForegroundColor White
Write-Host ""
Write-Host "Option 3: Enable setup mode and retry" -ForegroundColor Cyan
Write-Host "  1. Enable TEMP_SETUP_MODE: gcloud run services update uw-workbench-backend --update-env-vars='TEMP_SETUP_MODE=true'" -ForegroundColor White
Write-Host "  2. Run this script again: .\create-cloud-user.ps1" -ForegroundColor White
Write-Host ""
