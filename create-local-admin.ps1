# Create local admin user
# This calls the /admin/setup-admin endpoint to create the first user

Write-Host "Creating local admin user..." -ForegroundColor Cyan
Write-Host ""

$setupToken = "CHANGE_THIS_IN_PRODUCTION"  # Default setup token
$username = "leif"
$email = "leif@deanshomer.com"
$password = "Temp!local123"  # Temporary password - change after first login
$name = "Leif"

$body = @{
    username = $username
    email = $email
    password = $password
    name = $name
    setup_token = $setupToken
} | ConvertTo-Json

Write-Host "Calling /admin/setup-admin endpoint..." -ForegroundColor Gray
Write-Host "  Username: $username" -ForegroundColor Gray
Write-Host "  Email: $email" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/admin/setup-admin" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    
    Write-Host "✅ Admin user created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Login credentials:" -ForegroundColor Cyan
    Write-Host "  Username: $username" -ForegroundColor White
    Write-Host "  Email: $email" -ForegroundColor White
    Write-Host "  Password: $password" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Change this password after first login!" -ForegroundColor Yellow
} catch {
    $errorMessage = $_.Exception.Message
    Write-Host "❌ Failed to create admin user" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error response: $responseBody" -ForegroundColor Red
    } else {
        Write-Host "Error: $errorMessage" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "  1. Backend is not running (start with: .\start_backend.ps1)" -ForegroundColor Gray
    Write-Host "  2. Admin users already exist" -ForegroundColor Gray
    Write-Host "  3. Database connection issue" -ForegroundColor Gray
}
