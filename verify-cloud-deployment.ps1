# Cloud Deployment Verification Script
# This script verifies that your cloud deployment is set up correctly

$ErrorActionPreference = "Stop"

Write-Host "🔍 UW Workbench - Cloud Deployment Verification" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Get project ID
$PROJECT_ID = gcloud config get-value project 2>&1
if (-not $PROJECT_ID -or $PROJECT_ID -match "ERROR") {
    Write-Host "❌ No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Red
    exit 1
}

Write-Host "Project ID: $PROJECT_ID" -ForegroundColor Green
Write-Host ""

$REGION = "us-central1"
$BACKEND_SERVICE = "uw-workbench-backend"
$FRONTEND_SERVICE = "uw-workbench-frontend"

$allGood = $true

# Check 1: APIs Enabled
Write-Host "📋 Checking Required APIs..." -ForegroundColor Yellow
$requiredApis = @(
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "containerregistry.googleapis.com"
)

foreach ($api in $requiredApis) {
    $enabled = gcloud services list --enabled --filter="name:$api" --format="value(name)" --project=$PROJECT_ID 2>&1
    if ($enabled -and $enabled -match $api) {
        Write-Host "  ✅ $api" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $api (not enabled)" -ForegroundColor Red
        $allGood = $false
    }
}
Write-Host ""

# Check 2: Secrets Exist
Write-Host "📋 Checking Secrets..." -ForegroundColor Yellow
$requiredSecrets = @(
    "ai-api-key"
)

$optionalSecrets = @(
    "smtp-host",
    "smtp-port",
    "smtp-user",
    "smtp-password",
    "smtp-from-email",
    "smtp-from-name"
)

foreach ($secret in $requiredSecrets) {
    $exists = gcloud secrets describe $secret --project=$PROJECT_ID 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $secret" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $secret (missing - required!)" -ForegroundColor Red
        $allGood = $false
    }
}

foreach ($secret in $optionalSecrets) {
    $exists = gcloud secrets describe $secret --project=$PROJECT_ID 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $secret" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $secret (missing - optional)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Check 3: Service Account Permissions
Write-Host "📋 Checking Service Account Permissions..." -ForegroundColor Yellow
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
Write-Host "  Service Account: $SERVICE_ACCOUNT" -ForegroundColor Cyan

$hasAccess = $true
foreach ($secret in $requiredSecrets) {
    $policy = gcloud secrets get-iam-policy $secret --project=$PROJECT_ID --format="value(bindings.members)" 2>&1
    if ($policy -match $SERVICE_ACCOUNT) {
        Write-Host "  ✅ $secret access granted" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $secret access NOT granted" -ForegroundColor Red
        $hasAccess = $false
        $allGood = $false
    }
}
Write-Host ""

# Check 4: Backend Service
Write-Host "📋 Checking Backend Service..." -ForegroundColor Yellow
$backendExists = gcloud run services describe $BACKEND_SERVICE --region=$REGION --project=$PROJECT_ID 2>&1
if ($LASTEXITCODE -eq 0) {
    $backendUrl = gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(status.url)" --project=$PROJECT_ID
    Write-Host "  ✅ Backend service exists" -ForegroundColor Green
    Write-Host "  URL: $backendUrl" -ForegroundColor Cyan
    
    # Test health endpoint
    Write-Host "  Testing health endpoint..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri "$backendUrl/health" -Method GET -TimeoutSec 10 -UseBasicParsing 2>&1
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ Backend is responding" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Backend returned status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ❌ Backend health check failed: $_" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "  ❌ Backend service not found" -ForegroundColor Red
    $allGood = $false
}
Write-Host ""

# Check 5: Frontend Service
Write-Host "📋 Checking Frontend Service..." -ForegroundColor Yellow
$frontendExists = gcloud run services describe $FRONTEND_SERVICE --region=$REGION --project=$PROJECT_ID 2>&1
if ($LASTEXITCODE -eq 0) {
    $frontendUrl = gcloud run services describe $FRONTEND_SERVICE --region=$REGION --format="value(status.url)" --project=$PROJECT_ID
    Write-Host "  ✅ Frontend service exists" -ForegroundColor Green
    Write-Host "  URL: $frontendUrl" -ForegroundColor Cyan
    
    # Test frontend
    Write-Host "  Testing frontend..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri $frontendUrl -Method GET -TimeoutSec 10 -UseBasicParsing 2>&1
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ Frontend is responding" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Frontend returned status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠️  Frontend check failed: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  Frontend service not found (optional)" -ForegroundColor Yellow
}
Write-Host ""

# Check 6: CORS Configuration
Write-Host "📋 Checking CORS Configuration..." -ForegroundColor Yellow
if ($backendExists -and $frontendExists) {
    $corsOrigins = gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(spec.template.spec.containers[0].env)" --project=$PROJECT_ID 2>&1
    if ($corsOrigins -match "CORS_ORIGINS") {
        Write-Host "  ✅ CORS_ORIGINS is configured" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  CORS_ORIGINS not configured (frontend may not work)" -ForegroundColor Yellow
        Write-Host "  Run: gcloud run services update $BACKEND_SERVICE --region=$REGION --update-env-vars=`"CORS_ORIGINS=$frontendUrl`"" -ForegroundColor Gray
    }
} else {
    Write-Host "  ⚠️  Cannot check CORS (services not deployed)" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "================================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✅ All critical checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your deployment appears to be set up correctly." -ForegroundColor Green
    Write-Host ""
    if ($backendUrl) {
        Write-Host "Backend URL: $backendUrl" -ForegroundColor Cyan
    }
    if ($frontendUrl) {
        Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Cyan
    }
} else {
    Write-Host "❌ Some issues found. Please fix them before deploying." -ForegroundColor Red
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "1. Enable APIs: gcloud services enable <api-name> --project=$PROJECT_ID" -ForegroundColor White
    Write-Host "2. Create secrets: gcloud secrets create <secret-name> --data-file=-" -ForegroundColor White
    Write-Host "3. Grant permissions: gcloud secrets add-iam-policy-binding <secret> --member=`"serviceAccount:$SERVICE_ACCOUNT`" --role=`"roles/secretmanager.secretAccessor`"" -ForegroundColor White
    exit 1
}



