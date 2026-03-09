# Reset Admin Password
# This script resets the password for the existing admin user

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Reset Admin Password" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Generate new temporary password
$random = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 14 | ForEach-Object {[char]$_})
$NewPassword = "Temp!$random"

Write-Host "New temporary password: $NewPassword" -ForegroundColor Green
Write-Host ""

# Use password reset request endpoint (doesn't require auth)
Write-Host "Requesting password reset for admin@example.com..." -ForegroundColor Yellow
$BackendUrl = "https://uw-workbench-backend-4szvavge6a-uc.a.run.app"

try {
    $response = Invoke-RestMethod -Uri "$BackendUrl/auth/request-password-reset" `
        -Method POST `
        -ContentType "application/json" `
        -Body (@{username="admin@example.com"} | ConvertTo-Json) `
        -TimeoutSec 30 `
        -ErrorAction Stop
    
    Write-Host "✅ Password reset email sent!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Check the email for: admin@example.com" -ForegroundColor White
    Write-Host "You'll receive a password reset link." -ForegroundColor White
    Write-Host ""
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "⚠️  Password reset request failed (Status: $statusCode)" -ForegroundColor Yellow
    
    if ($_.Exception.Response) {
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Response: $errorBody" -ForegroundColor Gray
        } catch {
            Write-Host "Could not read error response" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "Alternative: Try logging in with common passwords:" -ForegroundColor Cyan
    Write-Host "  - admin@example.com / Admin123!" -ForegroundColor White
    Write-Host "  - admin@example.com / admin" -ForegroundColor White
    Write-Host "  - admin@example.com / password" -ForegroundColor White
    Write-Host ""
    Write-Host "Or contact your system administrator for the admin password." -ForegroundColor Yellow
}
