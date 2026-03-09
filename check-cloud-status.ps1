# Quick Cloud Status Check
# This script quickly checks if your cloud deployment is live and stable

$ErrorActionPreference = "Continue"

Write-Host "Checking Cloud Deployment Status..." -ForegroundColor Cyan
Write-Host ""

# Get project ID
$PROJECT_ID = ""
try {
    $result = gcloud config get-value project 2>&1
    $PROJECT_ID = ($result | Out-String).Trim()
    
    if (-not $PROJECT_ID -or $PROJECT_ID -eq "" -or $PROJECT_ID -match "ERROR" -or $PROJECT_ID -match "unset") {
        Write-Host "ERROR: No GCP project set." -ForegroundColor Red
        Write-Host "Run: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "ERROR: Could not get GCP project. Make sure gcloud is installed and configured." -ForegroundColor Red
    exit 1
}

Write-Host "Project: $PROJECT_ID" -ForegroundColor Green
$REGION = "us-central1"

# Check Backend
Write-Host ""
Write-Host "Backend Service:" -ForegroundColor Yellow
$backendUrl = $null
try {
    $backendOutput = & gcloud run services describe uw-workbench-backend --region=$REGION --format="value(status.url)" --project=$PROJECT_ID 2>&1
    $backendUrl = ($backendOutput | Out-String).Trim()
    
    if ($backendUrl -and $backendUrl.StartsWith("http")) {
        Write-Host "  OK - Deployed: $backendUrl" -ForegroundColor Green
        
        # Check health
        try {
            $health = Invoke-WebRequest -Uri "$backendUrl/health" -Method GET -TimeoutSec 10 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($health.StatusCode -eq 200) {
                Write-Host "  OK - Health check: OK" -ForegroundColor Green
                $healthContent = $health.Content | ConvertFrom-Json
                if ($healthContent.db -eq "unreachable") {
                    Write-Host "  WARNING - Database connection issue (using SQLite fallback)" -ForegroundColor Yellow
                }
            } else {
                Write-Host "  WARNING - Health check: Status $($health.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            # Try root endpoint as fallback
            try {
                $root = Invoke-WebRequest -Uri "$backendUrl/" -Method GET -TimeoutSec 10 -UseBasicParsing -ErrorAction SilentlyContinue
                if ($root.StatusCode -eq 200) {
                    Write-Host "  OK - Backend is responding (health endpoint may be slow)" -ForegroundColor Green
                } else {
                    Write-Host "  ERROR - Health check: FAILED" -ForegroundColor Red
                }
            } catch {
                Write-Host "  ERROR - Health check: FAILED" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "  ERROR - Not deployed" -ForegroundColor Red
        $backendUrl = $null
    }
} catch {
    Write-Host "  ERROR - Not deployed or error: $_" -ForegroundColor Red
    $backendUrl = $null
}

# Check Frontend
Write-Host ""
Write-Host "Frontend Service:" -ForegroundColor Yellow
$frontendUrl = $null
try {
    $frontendOutput = & gcloud run services describe uw-workbench-frontend --region=$REGION --format="value(status.url)" --project=$PROJECT_ID 2>&1
    $frontendUrl = ($frontendOutput | Out-String).Trim()
    
    if ($frontendUrl -and $frontendUrl.StartsWith("http")) {
        Write-Host "  OK - Deployed: $frontendUrl" -ForegroundColor Green
        
        # Check if accessible
        try {
            $response = Invoke-WebRequest -Uri $frontendUrl -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "  OK - Accessible: OK" -ForegroundColor Green
            } else {
                Write-Host "  WARNING - Accessible: Status $($response.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  ERROR - Accessible: FAILED" -ForegroundColor Red
        }
    } else {
        Write-Host "  ERROR - Not deployed" -ForegroundColor Red
        $frontendUrl = $null
    }
} catch {
    Write-Host "  ERROR - Not deployed or error: $_" -ForegroundColor Red
    $frontendUrl = $null
}

# Check CORS
Write-Host ""
Write-Host "CORS Configuration:" -ForegroundColor Yellow
if ($backendUrl -and $frontendUrl) {
    try {
        $corsOutput = & gcloud run services describe uw-workbench-backend --region=$REGION --format="json" --project=$PROJECT_ID 2>&1 | Out-String
        $envVars = $corsOutput | ConvertFrom-Json
        $corsOrigins = $envVars.spec.template.spec.containers[0].env | Where-Object { $_.name -eq "CORS_ORIGINS" }
        if ($corsOrigins -and $corsOrigins.value -match [regex]::Escape($frontendUrl)) {
            Write-Host "  OK - CORS configured correctly" -ForegroundColor Green
        } else {
            Write-Host "  WARNING - CORS may not be configured correctly" -ForegroundColor Yellow
            Write-Host "     Run: gcloud run services update uw-workbench-backend --region=$REGION --update-env-vars='CORS_ORIGINS=$frontendUrl'" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  WARNING - Could not check CORS configuration" -ForegroundColor Yellow
    }
} else {
    Write-Host "  WARNING - Cannot check (services not deployed)" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host ("=" * 50) -ForegroundColor Cyan
if ($backendUrl -and $frontendUrl) {
    Write-Host "SUCCESS - Both services are deployed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Backend:  $backendUrl" -ForegroundColor Cyan
    Write-Host "Frontend: $frontendUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To test stability:" -ForegroundColor Yellow
    Write-Host "1. Open the frontend URL in a browser" -ForegroundColor White
    Write-Host "2. Try logging in" -ForegroundColor White
    Write-Host "3. Check logs: gcloud run services logs read uw-workbench-backend --region=$REGION --tail" -ForegroundColor White
} else {
    Write-Host "WARNING - Services not fully deployed" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To deploy:" -ForegroundColor Yellow
    Write-Host "1. Run: .\complete-cloud-setup.ps1" -ForegroundColor White
    Write-Host "2. Or: gcloud builds submit --config cloudbuild.yaml" -ForegroundColor White
}
