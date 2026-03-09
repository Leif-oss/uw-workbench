# Complete Deployment Script
# Run this in your PowerShell terminal: .\run-all-steps.ps1

$ErrorActionPreference = "Stop"

$PROJECT_ID = "ultra-ace-481723-e6"
$REGION = "us-central1"
$SERVICE_NAME = "uw-workbench-backend"

Write-Host "🚀 UW Workbench Deployment" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Enable APIs
Write-Host "Step 1: Enabling APIs..." -ForegroundColor Yellow
gcloud services enable cloudbuild.googleapis.com --project=$PROJECT_ID
gcloud services enable run.googleapis.com --project=$PROJECT_ID
gcloud services enable sql-component.googleapis.com --project=$PROJECT_ID
gcloud services enable sqladmin.googleapis.com --project=$PROJECT_ID
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID
gcloud services enable containerregistry.googleapis.com --project=$PROJECT_ID
Write-Host "✅ APIs enabled" -ForegroundColor Green
Write-Host ""

# Step 2: Store Secrets
Write-Host "Step 2: Storing Secrets..." -ForegroundColor Yellow
Write-Host "You'll be prompted for each secret. Press Enter to skip optional ones." -ForegroundColor Gray
Write-Host ""

# OpenAI API Key (Required)
$aiKey = Read-Host "Enter your OpenAI API Key (required)"
if ($aiKey) {
    echo -n $aiKey | gcloud secrets create ai-api-key --data-file=- --project=$PROJECT_ID 2>$null
    if ($LASTEXITCODE -ne 0) {
        echo -n $aiKey | gcloud secrets versions add ai-api-key --data-file=- --project=$PROJECT_ID
    }
    Write-Host "✅ AI API Key stored" -ForegroundColor Green
}

# SMTP Settings (Optional)
$setupSMTP = Read-Host "`nSet up SMTP for email? [y/n]"
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
    
    $smtpSecrets = @{
        "smtp-host" = $smtpHost
        "smtp-port" = $smtpPort
        "smtp-user" = $smtpUser
        "smtp-password" = $smtpPassPlain
        "smtp-from-email" = $smtpFromEmail
        "smtp-from-name" = $smtpFromName
    }
    
    foreach ($name in $smtpSecrets.Keys) {
        $value = $smtpSecrets[$name]
        if ($value) {
            echo -n $value | gcloud secrets create $name --data-file=- --project=$PROJECT_ID 2>$null
            if ($LASTEXITCODE -ne 0) {
                echo -n $value | gcloud secrets versions add $name --data-file=- --project=$PROJECT_ID
            }
        }
    }
    Write-Host "✅ SMTP secrets stored" -ForegroundColor Green
}

Write-Host ""

# Step 3: Grant Permissions
Write-Host "Step 3: Granting Service Account Permissions..." -ForegroundColor Yellow
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

# Grant access to AI API key
gcloud secrets add-iam-policy-binding ai-api-key `
    --member="serviceAccount:$SERVICE_ACCOUNT" `
    --role="roles/secretmanager.secretAccessor" `
    --project=$PROJECT_ID 2>$null

if ($setupSMTP -eq "y") {
    $smtpSecretNames = @("smtp-host", "smtp-port", "smtp-user", "smtp-password", "smtp-from-email", "smtp-from-name")
    foreach ($secretName in $smtpSecretNames) {
        gcloud secrets add-iam-policy-binding $secretName `
            --member="serviceAccount:$SERVICE_ACCOUNT" `
            --role="roles/secretmanager.secretAccessor" `
            --project=$PROJECT_ID 2>$null
    }
}

Write-Host "✅ Permissions granted" -ForegroundColor Green
Write-Host ""

# Step 4: Build
Write-Host "Step 4: Building Docker Image..." -ForegroundColor Yellow
Write-Host "This will take 5-10 minutes..." -ForegroundColor Gray
$IMAGE = "gcr.io/$PROJECT_ID/$SERVICE_NAME"
gcloud builds submit --tag $IMAGE --project=$PROJECT_ID ./backend
Write-Host "✅ Build complete" -ForegroundColor Green
Write-Host ""

# Step 5: Deploy
Write-Host "Step 5: Deploying to Cloud Run..." -ForegroundColor Yellow

$deployCmd = "gcloud run deploy $SERVICE_NAME --image $IMAGE --platform managed --region $REGION --allow-unauthenticated --memory 512Mi --cpu 1 --timeout 300 --max-instances 10 --set-env-vars `"ENVIRONMENT=production`" --project=$PROJECT_ID"

# Add secrets
$secretList = "AI_API_KEY=ai-api-key:latest"
if ($setupSMTP -eq "y") {
    $secretList += ",SMTP_HOST=smtp-host:latest,SMTP_PORT=smtp-port:latest,SMTP_USER=smtp-user:latest,SMTP_PASSWORD=smtp-password:latest,SMTP_FROM_EMAIL=smtp-from-email:latest,SMTP_FROM_NAME=smtp-from-name:latest"
}

$deployCmd += " --set-secrets `"$secretList`""

Invoke-Expression $deployCmd

Write-Host ""

# Step 6: Get URL
$SERVICE_URL = gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)" --project=$PROJECT_ID

Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Cyan
Write-Host "Backend URL: $SERVICE_URL" -ForegroundColor Green
Write-Host ""
Write-Host "Test it: $SERVICE_URL/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: Update frontend .env with:" -ForegroundColor Yellow
Write-Host "VITE_API_URL=$SERVICE_URL" -ForegroundColor White



