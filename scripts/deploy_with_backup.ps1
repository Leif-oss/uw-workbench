# Deploy with Automatic Backup
# Usage: .\scripts\deploy_with_backup.ps1

param(
    [string]$ProjectId = "",
    [string]$InstanceName = "uw-workbench-db",
    [switch]$SkipPreCheck,
    [switch]$SkipBackup,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Get project ID
if ([string]::IsNullOrEmpty($ProjectId)) {
    $ProjectId = gcloud config get-value project 2>$null
    if ([string]::IsNullOrEmpty($ProjectId)) {
        Write-Host "ERROR: Project ID not found. Please set PROJECT_ID or run 'gcloud config set project PROJECT_ID'" -ForegroundColor Red
        exit 1
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploy with Automatic Backup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Project: $ProjectId" -ForegroundColor White
Write-Host ""

# Step 1: Pre-deployment checks
if (-not $SkipPreCheck) {
    Write-Host "Step 1: Running pre-deployment checks..." -ForegroundColor Yellow
    Write-Host ""
    
    $PreCheckResult = & .\scripts\pre_deployment_check.ps1 -SkipBackup:$SkipBackup
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ Pre-deployment checks failed. Deployment cancelled." -ForegroundColor Red
        exit 1
    }
    Write-Host ""
} else {
    Write-Host "Step 1: Skipping pre-deployment checks (using -SkipPreCheck)" -ForegroundColor Yellow
    Write-Host ""
}

# Step 2: Create backup
if (-not $SkipBackup) {
    Write-Host "Step 2: Creating database backup..." -ForegroundColor Yellow
    Write-Host ""
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would run: .\scripts\backup_database.ps1 -ProjectId $ProjectId -InstanceName $InstanceName" -ForegroundColor Gray
    } else {
        & .\scripts\backup_database.ps1 -ProjectId $ProjectId -InstanceName $InstanceName
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "❌ Backup failed. Deployment cancelled." -ForegroundColor Red
            exit 1
        }
    }
    Write-Host ""
} else {
    Write-Host "Step 2: Skipping backup (using -SkipBackup)" -ForegroundColor Yellow
    Write-Host "⚠️  WARNING: Deploying without backup!" -ForegroundColor Red
    Write-Host ""
}

# Step 3: Deploy
Write-Host "Step 3: Deploying to Cloud Run..." -ForegroundColor Yellow
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] Would run: gcloud builds submit --config cloudbuild.yaml" -ForegroundColor Gray
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Dry run completed" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To actually deploy, run without -DryRun:" -ForegroundColor Yellow
    Write-Host "  .\scripts\deploy_with_backup.ps1" -ForegroundColor White
    exit 0
}

# Get current git commit for deployment log
$GitCommit = "unknown"
$GitTag = "unknown"
if (Test-Command "git") {
    try {
        $GitCommit = git rev-parse --short HEAD 2>$null
        $GitTag = git describe --tags --exact-match 2>$null
        if ($LASTEXITCODE -ne 0) {
            $GitTag = "none"
        }
    } catch {
        # Ignore git errors
    }
}

Write-Host "Deployment Info:" -ForegroundColor Cyan
Write-Host "  Git Commit: $GitCommit" -ForegroundColor White
Write-Host "  Git Tag: $GitTag" -ForegroundColor White
Write-Host ""

# Submit build
Write-Host "Submitting build to Cloud Build..." -ForegroundColor Yellow
gcloud builds submit --config cloudbuild.yaml --project=$ProjectId

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Rollback options:" -ForegroundColor Yellow
    Write-Host "  1. Check Cloud Run revisions:" -ForegroundColor White
    Write-Host "     gcloud run revisions list --service=uw-workbench-backend --region=us-central1" -ForegroundColor Gray
    Write-Host "  2. Rollback to previous revision:" -ForegroundColor White
    Write-Host "     gcloud run services update-traffic uw-workbench-backend --to-revisions=PREVIOUS_REVISION=100" -ForegroundColor Gray
    Write-Host "  3. Restore database from backup if needed" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 4: Post-deployment verification
Write-Host "Step 4: Post-deployment verification..." -ForegroundColor Yellow
Write-Host ""

# Get service URLs
$BackendUrl = gcloud run services describe uw-workbench-backend --region=us-central1 --format="value(status.url)" 2>$null
$FrontendUrl = gcloud run services describe uw-workbench-frontend --region=us-central1 --format="value(status.url)" 2>$null

if ($BackendUrl) {
    Write-Host "Backend URL: $BackendUrl" -ForegroundColor Cyan
    
    # Test health endpoint
    try {
        $HealthResponse = Invoke-WebRequest -Uri "$BackendUrl/health" -Method GET -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        if ($HealthResponse.StatusCode -eq 200) {
            Write-Check "Backend health check passed" "PASS"
        } else {
            Write-Check "Backend health check returned status $($HealthResponse.StatusCode)" "WARN"
        }
    } catch {
        Write-Check "Backend health check failed: $_" "WARN"
    }
} else {
    Write-Check "Could not retrieve backend URL" "WARN"
}

if ($FrontendUrl) {
    Write-Host "Frontend URL: $FrontendUrl" -ForegroundColor Cyan
    
    # Test frontend
    try {
        $FrontendResponse = Invoke-WebRequest -Uri $FrontendUrl -Method GET -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        if ($FrontendResponse.StatusCode -eq 200) {
            Write-Check "Frontend is accessible" "PASS"
        } else {
            Write-Check "Frontend returned status $($FrontendResponse.StatusCode)" "WARN"
        }
    } catch {
        Write-Check "Frontend check failed: $_" "WARN"
    }
} else {
    Write-Check "Could not retrieve frontend URL" "WARN"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Test the application manually" -ForegroundColor White
Write-Host "  2. Check Cloud Run logs for errors" -ForegroundColor White
Write-Host "  3. Verify all features work correctly" -ForegroundColor White
Write-Host "  4. Monitor for the first hour after deployment" -ForegroundColor White
Write-Host ""
Write-Host "View logs:" -ForegroundColor Yellow
Write-Host "  gcloud run services logs read uw-workbench-backend --region=us-central1 --tail" -ForegroundColor Gray
Write-Host ""

function Write-Check {
    param([string]$Message, [string]$Status = "INFO")
    $color = switch ($Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "WARN" { "Yellow" }
        default { "White" }
    }
    $symbol = switch ($Status) {
        "PASS" { "✅" }
        "FAIL" { "❌" }
        "WARN" { "⚠️ " }
        default { "ℹ️ " }
    }
    Write-Host "$symbol $Message" -ForegroundColor $color
}
