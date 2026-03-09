# Check cloud database state
$backendUrl = "https://uw-workbench-backend-4szvavge6a-uc.a.run.app"

Write-Host "Checking cloud database state..." -ForegroundColor Cyan
Write-Host ""

# Try to get employees (this requires auth, but TEMP_SETUP_MODE might allow it)
try {
    $response = Invoke-RestMethod -Uri "$backendUrl/employees" -Method GET -ContentType "application/json" -ErrorAction Stop
    
    Write-Host "Employees in cloud database:" -ForegroundColor Yellow
    if ($response.Count -eq 0) {
        Write-Host "  No employees found!" -ForegroundColor Red
    } else {
        foreach ($emp in $response) {
            Write-Host "  - Employee ID $($emp.id): $($emp.name) ($($emp.email))" -ForegroundColor White
        }
    }
} catch {
    Write-Host "ERROR: Could not check employees" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "You may need to log in first to check the database." -ForegroundColor Yellow
}



