# Complete Cloud Setup Script
# This script helps you finish the cloud deployment setup

$ErrorActionPreference = "Stop"

Write-Host "🚀 UW Workbench - Complete Cloud Setup" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Get project ID
$PROJECT_ID = gcloud config get-value project 2>&1
if (-not $PROJECT_ID -or $PROJECT_ID -match "ERROR") {
    $PROJECT_ID = Read-Host "Enter your Google Cloud Project ID"
    gcloud config set project $PROJECT_ID
}

Write-Host "Project ID: $PROJECT_ID" -ForegroundColor Green
Write-Host ""

$REGION = "us-central1"

# Step 1: Check what's already deployed
Write-Host "📋 Step 1: Checking Current Deployment Status" -ForegroundColor Yellow
Write-Host "--------------------------------------------" -ForegroundColor Yellow

$backendUrl = $null
$frontendUrl = $null

$backendExists = gcloud run services describe uw-workbench-backend --region=$REGION --project=$PROJECT_ID 2>&1
if ($LASTEXITCODE -eq 0) {
    $backendUrl = gcloud run services describe uw-workbench-backend --region=$REGION --format="value(status.url)" --project=$PROJECT_ID
    Write-Host "✅ Backend is deployed: $backendUrl" -ForegroundColor Green
} else {
    Write-Host "❌ Backend not deployed yet" -ForegroundColor Red
}

$frontendExists = gcloud run services describe uw-workbench-frontend --region=$REGION --project=$PROJECT_ID 2>&1
if ($LASTEXITCODE -eq 0) {
    $frontendUrl = gcloud run services describe uw-workbench-frontend --region=$REGION --format="value(status.url)" --project=$PROJECT_ID
    Write-Host "✅ Frontend is deployed: $frontendUrl" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend not deployed yet" -ForegroundColor Red
}

Write-Host ""

# Step 2: Update CORS if both are deployed
if ($backendUrl -and $frontendUrl) {
    Write-Host "📋 Step 2: Updating CORS Configuration" -ForegroundColor Yellow
    Write-Host "-----------------------------------" -ForegroundColor Yellow
    
    Write-Host "Updating backend CORS to allow frontend..." -ForegroundColor Cyan
    gcloud run services update uw-workbench-backend `
        --region=$REGION `
        --update-env-vars="CORS_ORIGINS=$frontendUrl" `
        --project=$PROJECT_ID
    
    Write-Host "✅ CORS updated" -ForegroundColor Green
    Write-Host ""
}

# Step 3: Rebuild frontend with correct backend URL (if needed)
if ($backendUrl -and -not $frontendUrl) {
    Write-Host "📋 Step 2: Deploying Frontend" -ForegroundColor Yellow
    Write-Host "---------------------------" -ForegroundColor Yellow
    
    $deployFrontend = Read-Host "Deploy frontend now? [y/n]"
    if ($deployFrontend -eq "y") {
        Write-Host "Building frontend with backend URL: $backendUrl" -ForegroundColor Cyan
        
        # Build frontend
        cd frontend
        docker build --build-arg VITE_API_URL=$backendUrl -t gcr.io/$PROJECT_ID/uw-workbench-frontend .
        
        # Push to registry
        docker push gcr.io/$PROJECT_ID/uw-workbench-frontend
        
        # Deploy
        gcloud run deploy uw-workbench-frontend `
            --image gcr.io/$PROJECT_ID/uw-workbench-frontend `
            --platform managed `
            --region=$REGION `
            --allow-unauthenticated `
            --memory=256Mi `
            --project=$PROJECT_ID
        
        $frontendUrl = gcloud run services describe uw-workbench-frontend --region=$REGION --format="value(status.url)" --project=$PROJECT_ID
        
        # Update CORS
        Write-Host "Updating CORS..." -ForegroundColor Cyan
        gcloud run services update uw-workbench-backend `
            --region=$REGION `
            --update-env-vars="CORS_ORIGINS=$frontendUrl" `
            --project=$PROJECT_ID
        
        cd ..
        Write-Host "✅ Frontend deployed: $frontendUrl" -ForegroundColor Green
    }
    Write-Host ""
}

# Step 4: Verify secrets
Write-Host "📋 Step 3: Verifying Secrets" -ForegroundColor Yellow
Write-Host "---------------------------" -ForegroundColor Yellow

$requiredSecrets = @("ai-api-key")
$smtpSecrets = @("smtp-host", "smtp-port", "smtp-user", "smtp-password", "smtp-from-email", "smtp-from-name")

$missingSecrets = @()

foreach ($secret in $requiredSecrets) {
    $exists = gcloud secrets describe $secret --project=$PROJECT_ID 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $secret" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $secret (MISSING)" -ForegroundColor Red
        $missingSecrets += $secret
    }
}

$missingSMTP = @()
foreach ($secret in $smtpSecrets) {
    $exists = gcloud secrets describe $secret --project=$PROJECT_ID 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $secret" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $secret (missing - email won't work)" -ForegroundColor Yellow
        $missingSMTP += $secret
    }
}

if ($missingSecrets.Count -gt 0 -or $missingSMTP.Count -gt 0) {
    Write-Host ""
    $setupSecrets = Read-Host "Set up missing secrets? [y/n]"
    if ($setupSecrets -eq "y") {
        foreach ($secret in $missingSecrets) {
            Write-Host "`nSetting up $secret..." -ForegroundColor Cyan
            $value = Read-Host "Enter value" -AsSecureString
            $valuePlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [Runtime.InteropServices.Marshal]::SecureStringToBSTR($value)
            )
            echo -n $valuePlain | gcloud secrets create $secret --data-file=- --project=$PROJECT_ID
        }
        
        if ($missingSMTP.Count -gt 0) {
            $setupSMTP = Read-Host "`nSet up SMTP secrets? [y/n]"
            if ($setupSMTP -eq "y") {
                $smtpHost = Read-Host "SMTP Host (e.g., smtp.gmail.com)"
                $smtpPort = Read-Host "SMTP Port (e.g., 587)"
                $smtpUser = Read-Host "SMTP User/Email"
                $smtpPass = Read-Host "SMTP Password" -AsSecureString
                $smtpFromEmail = Read-Host "From Email"
                $smtpFromName = Read-Host "From Name (e.g., UW Workbench)"
                
                $smtpPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($smtpPass)
                )
                
                $smtpValues = @{
                    "smtp-host" = $smtpHost
                    "smtp-port" = $smtpPort
                    "smtp-user" = $smtpUser
                    "smtp-password" = $smtpPassPlain
                    "smtp-from-email" = $smtpFromEmail
                    "smtp-from-name" = $smtpFromName
                }
                
                foreach ($name in $smtpValues.Keys) {
                    $value = $smtpValues[$name]
                    if ($value) {
                        echo -n $value | gcloud secrets create $name --data-file=- --project=$PROJECT_ID 2>&1 | Out-Null
                        if ($LASTEXITCODE -ne 0) {
                            echo -n $value | gcloud secrets versions add $name --data-file=- --project=$PROJECT_ID
                        }
                    }
                }
                
                Write-Host "✅ SMTP secrets stored" -ForegroundColor Green
                
                # Grant permissions
                $PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
                $SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
                
                foreach ($name in $smtpValues.Keys) {
                    gcloud secrets add-iam-policy-binding $name `
                        --member="serviceAccount:$SERVICE_ACCOUNT" `
                        --role="roles/secretmanager.secretAccessor" `
                        --project=$PROJECT_ID | Out-Null
                }
                
                Write-Host "✅ SMTP secret permissions granted" -ForegroundColor Green
                
                # Update backend with SMTP secrets
                if ($backendUrl) {
                    Write-Host "Updating backend with SMTP secrets..." -ForegroundColor Cyan
                    gcloud run services update uw-workbench-backend `
                        --region=$REGION `
                        --set-secrets="SMTP_HOST=smtp-host:latest,SMTP_PORT=smtp-port:latest,SMTP_USER=smtp-user:latest,SMTP_PASSWORD=smtp-password:latest,SMTP_FROM_EMAIL=smtp-from-email:latest,SMTP_FROM_NAME=smtp-from-name:latest" `
                        --project=$PROJECT_ID
                    Write-Host "✅ Backend updated with SMTP secrets" -ForegroundColor Green
                }
            }
        }
    }
}

Write-Host ""

# Step 5: Final verification
Write-Host "📋 Step 4: Final Verification" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow

if ($backendUrl) {
    Write-Host "Testing backend..." -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "$backendUrl/health" -Method GET -TimeoutSec 10 -UseBasicParsing 2>&1
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Backend is healthy" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Backend health check failed: $_" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""

if ($backendUrl) {
    Write-Host "Backend URL: $backendUrl" -ForegroundColor Cyan
}
if ($frontendUrl) {
    Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test the application at the frontend URL" -ForegroundColor White
Write-Host "2. Verify email sending (create a new user)" -ForegroundColor White
Write-Host "3. Check logs: gcloud run services logs read uw-workbench-backend --region=$REGION --tail" -ForegroundColor White
Write-Host ""
Write-Host "Run verification: .\verify-cloud-deployment.ps1" -ForegroundColor Gray



