# Test cloud deployment after fixes
# This script tests the deployed service to ensure fixes are working

param(
    [string]$BackendUrl = "",
    [string]$Region = "us-central1"
)

Write-Host "=" -NoNewline
Write-Host ("=" * 79)
Write-Host "CLOUD DEPLOYMENT TEST"
Write-Host "=" -NoNewline
Write-Host ("=" * 79)
Write-Host ""

# Get backend URL if not provided
if (-not $BackendUrl) {
    Write-Host "Getting backend URL from Cloud Run..." -ForegroundColor Cyan
    $BackendUrl = gcloud run services describe uw-workbench-backend --region $Region --format="value(status.url)" 2>$null
    
    if (-not $BackendUrl) {
        Write-Host "ERROR: Could not get backend URL. Is the service deployed?" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Backend URL: $BackendUrl" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health check
Write-Host "TEST 1: Health Check" -ForegroundColor Yellow
Write-Host "-" * 80
try {
    $healthResponse = Invoke-RestMethod -Uri "$BackendUrl/health" -Method Get -ErrorAction Stop
    Write-Host "  ✓ Health endpoint responded" -ForegroundColor Green
    Write-Host "    Status: $($healthResponse.status)" -ForegroundColor Gray
    Write-Host "    DB: $($healthResponse.db)" -ForegroundColor Gray
    
    if ($healthResponse.db -ne "reachable") {
        Write-Host "  ⚠ WARNING: Database not reachable!" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ Health check failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 2: Network diagnostics
Write-Host "TEST 2: Network Diagnostics" -ForegroundColor Yellow
Write-Host "-" * 80
try {
    $networkDiag = Invoke-RestMethod -Uri "$BackendUrl/_diag/network" -Method Get -ErrorAction Stop
    Write-Host "  ✓ Network diagnostics endpoint responded" -ForegroundColor Green
    
    # Check DNS tests
    if ($networkDiag.dns_tests) {
        Write-Host "  DNS Tests:" -ForegroundColor Gray
        foreach ($test in $networkDiag.dns_tests.PSObject.Properties) {
            $result = $networkDiag.dns_tests.($test.Name)
            if ($result.success) {
                Write-Host "    ✓ $($test.Name): SUCCESS" -ForegroundColor Green
            } else {
                Write-Host "    ✗ $($test.Name): FAILED - $($result.error)" -ForegroundColor Red
            }
        }
    }
    
    # Check TCP tests
    if ($networkDiag.tcp_tests) {
        Write-Host "  TCP Connectivity Tests:" -ForegroundColor Gray
        foreach ($test in $networkDiag.tcp_tests.PSObject.Properties) {
            $result = $networkDiag.tcp_tests.($test.Name)
            if ($result.success) {
                Write-Host "    ✓ $($test.Name): SUCCESS" -ForegroundColor Green
            } else {
                Write-Host "    ✗ $($test.Name): FAILED - $($result.error)" -ForegroundColor Red
            }
        }
    }
} catch {
    Write-Host "  ✗ Network diagnostics failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 3: Check logs for database connection
Write-Host "TEST 3: Recent Logs Check" -ForegroundColor Yellow
Write-Host "-" * 80
Write-Host "  Checking recent logs for database connection status..." -ForegroundColor Gray

$logs = gcloud run services logs read uw-workbench-backend --region $Region --limit 20 --format="value(textPayload)" 2>$null

if ($logs) {
    $dbSuccess = $logs | Where-Object { $_ -match "Successfully connected to Cloud SQL" }
    $dbError = $logs | Where-Object { $_ -match "Database connection failed|CRITICAL.*Database" }
    $emailWarning = $logs | Where-Object { $_ -match "Email not configured" }
    
    if ($dbSuccess) {
        Write-Host "  ✓ Found successful database connection in logs" -ForegroundColor Green
    } elseif ($dbError) {
        Write-Host "  ✗ Found database connection errors in logs:" -ForegroundColor Red
        $dbError | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
    } else {
        Write-Host "  ⚠ No database connection status found in recent logs" -ForegroundColor Yellow
    }
    
    if ($emailWarning) {
        Write-Host "  ⚠ Email configuration warning found:" -ForegroundColor Yellow
        $emailWarning | Select-Object -First 1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkYellow }
    }
} else {
    Write-Host "  ⚠ Could not retrieve logs" -ForegroundColor Yellow
}

Write-Host ""

# Test 4: Verify environment variables via logs
Write-Host "TEST 4: Configuration Verification" -ForegroundColor Yellow
Write-Host "-" * 80
Write-Host "  Note: Run backend/check_cloud_config.py inside Cloud Run to verify configuration" -ForegroundColor Gray
Write-Host "  Or check Cloud Run service environment variables in console" -ForegroundColor Gray

Write-Host ""
Write-Host "=" -NoNewline
Write-Host ("=" * 79)
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "-" * 80
Write-Host ""
Write-Host "1. Create a test user in the admin panel" -ForegroundColor Cyan
Write-Host "2. Wait a few hours or restart the Cloud Run service" -ForegroundColor Cyan
Write-Host "3. Verify the user still exists (should NOT be deleted)" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Test email functionality:" -ForegroundColor Cyan
Write-Host "   - Try password reset" -ForegroundColor White
Write-Host "   - Check logs for email sending status" -ForegroundColor White
Write-Host ""
Write-Host "5. Monitor logs for the first 24 hours:" -ForegroundColor Cyan
Write-Host "   gcloud run services logs tail uw-workbench-backend --region $Region" -ForegroundColor White
Write-Host ""



