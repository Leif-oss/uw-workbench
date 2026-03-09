# Script to clean up cloud database
$backendUrl = "https://uw-workbench-backend-4szvavge6a-uc.a.run.app"

Write-Host "Cleaning up cloud database..." -ForegroundColor Cyan
Write-Host "Backend URL: $backendUrl" -ForegroundColor Yellow
Write-Host ""

# Try to call cleanup endpoint
# Since TEMP_SETUP_MODE is enabled, we might be able to call without auth
try {
    $response = Invoke-RestMethod -Uri "$backendUrl/admin/cleanup-database" -Method POST -ContentType "application/json" -ErrorAction Stop
    
    if ($response.success) {
        Write-Host "SUCCESS: Database cleanup completed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Deleted employees: $($response.deleted_employees.Count)" -ForegroundColor White
        foreach ($emp in $response.deleted_employees) {
            Write-Host "  - Employee ID $($emp.id): $($emp.name) ($($emp.email))" -ForegroundColor Gray
        }
        Write-Host ""
        Write-Host "Deleted users: $($response.deleted_users.Count)" -ForegroundColor White
        foreach ($user in $response.deleted_users) {
            Write-Host "  - User ID $($user.id): $($user.username) ($($user.email))" -ForegroundColor Gray
        }
        Write-Host ""
        Write-Host "Remaining employees: $($response.remaining_employees)" -ForegroundColor Green
        Write-Host "Remaining users: $($response.remaining_users)" -ForegroundColor Green
        Write-Host "Leif Employee ID: $($response.leif_employee_id)" -ForegroundColor Green
        Write-Host "Leif User ID: $($response.leif_user_id)" -ForegroundColor Green
    } else {
        Write-Host "ERROR: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: Failed to call cleanup endpoint" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "You may need to:" -ForegroundColor Yellow
    Write-Host "  1. Log in to the cloud app" -ForegroundColor White
    Write-Host "  2. Get your auth token from localStorage" -ForegroundColor White
    Write-Host "  3. Call the endpoint with: curl -X POST $backendUrl/admin/cleanup-database -H 'Authorization: Bearer YOUR_TOKEN'" -ForegroundColor White
}



