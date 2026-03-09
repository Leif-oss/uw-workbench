# Create Admin User (Non-Interactive)
# Usage: .\create-admin-now.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Create Admin User" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$BackendUrl = "https://uw-workbench-backend-4szvavge6a-uc.a.run.app"

# Default credentials (you can change password after login)
$adminData = @{
    username = "admin"
    email = "admin@example.com"
    password = "Admin123!"
    name = "Admin User"
    setup_token = "CHANGE_THIS_IN_PRODUCTION"
}

Write-Host "Creating admin user with default credentials:" -ForegroundColor Yellow
Write-Host "  Username: $($adminData.username)" -ForegroundColor White
Write-Host "  Email: $($adminData.email)" -ForegroundColor White
Write-Host "  Password: $($adminData.password)" -ForegroundColor White
Write-Host ""
Write-Host "Note: You can change the password after logging in." -ForegroundColor Gray
Write-Host ""

$jsonBody = $adminData | ConvertTo-Json -Depth 10

Write-Host "Calling API endpoint..." -ForegroundColor Yellow
Write-Host "URL: $BackendUrl/admin/setup-admin" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$BackendUrl/admin/setup-admin" `
        -Method POST `
        -ContentType "application/json" `
        -Body $jsonBody `
        -TimeoutSec 30 `
        -ErrorAction Stop
    
    Write-Host "✅ SUCCESS: Admin user created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Login Credentials" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Email/Username: $($adminData.email)" -ForegroundColor White
    Write-Host "Password: $($adminData.password)" -ForegroundColor White
    Write-Host ""
    Write-Host "Frontend URL: https://uw-workbench-frontend-4szvavge6a-uc.a.run.app" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can now log in!" -ForegroundColor Green
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ Failed to create user (Status: $statusCode)" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $responseBody = $reader.ReadToEnd()
            Write-Host "Error details:" -ForegroundColor Yellow
            Write-Host $responseBody -ForegroundColor Gray
        } catch {
            Write-Host "Could not read error response" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check if admin users already exist" -ForegroundColor White
    Write-Host "  2. Verify the endpoint is accessible" -ForegroundColor White
    Write-Host "  3. Check backend logs: gcloud run services logs read uw-workbench-backend --region=us-central1 --tail" -ForegroundColor White
    Write-Host ""
    Write-Host "You can also try creating the user via the API documentation:" -ForegroundColor Cyan
    Write-Host "  https://uw-workbench-backend-4szvavge6a-uc.a.run.app/docs" -ForegroundColor White
    
    exit 1
}
