# Create Admin User Script
# Run this in PowerShell to create your first admin user

$ErrorActionPreference = "Stop"

Write-Host "Admin User Setup" -ForegroundColor Cyan
Write-Host "================" -ForegroundColor Cyan
Write-Host ""

$backendUrl = "https://uw-workbench-backend-4szvavge6a-uc.a.run.app"

Write-Host "Enter admin details:" -ForegroundColor Yellow
$name = Read-Host "Admin Name (e.g., Admin User)"
$email = Read-Host "Email (e.g., admin@company.com)"
$username = Read-Host "Username (e.g., admin)"
$password = Read-Host "Password" -AsSecureString
$setupToken = Read-Host "Setup Token (default: CHANGE_THIS_IN_PRODUCTION)"
if (-not $setupToken) {
    $setupToken = "CHANGE_THIS_IN_PRODUCTION"
}

# Convert secure string to plain text
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "Creating admin user..." -ForegroundColor Cyan

$body = @{
    username = $username
    email = $email
    password = $plainPassword
    name = $name
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
    Write-Host "SUCCESS! Admin user created!" -ForegroundColor Green
    Write-Host "=" * 60 -ForegroundColor Green
    Write-Host "Username: $($response.username)" -ForegroundColor Cyan
    Write-Host "Email: $($response.email)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can now log in with these credentials!" -ForegroundColor Yellow
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to create admin user" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Yellow
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Yellow
        } catch {
            Write-Host "Could not read response body" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "If you get a 404 error, the setup-admin endpoint may not be deployed yet." -ForegroundColor Yellow
    Write-Host "Try using the default credentials first:" -ForegroundColor Yellow
    Write-Host "  Username: partner1" -ForegroundColor Cyan
    Write-Host "  Password: partner1234" -ForegroundColor Cyan
}



