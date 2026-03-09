# Complete DEV Environment Setup and Deployment
# This script sets up all DEV resources and deploys

$ErrorActionPreference = "Continue"

$PROJECT_ID = "ultra-ace-481723-e6"
$REGION = "us-central1"
$INSTANCE_NAME = "uw-workbench-db-dev"
$DB_NAME = "uw_workbench"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DEV Environment Setup and Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create Cloud SQL Instance
Write-Host "Step 1: Creating Cloud SQL instance..." -ForegroundColor Yellow
gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Cloud SQL instance already exists" -ForegroundColor Green
} else {
    Write-Host "Creating Cloud SQL instance (this may take a few minutes)..." -ForegroundColor Cyan
    gcloud sql instances create $INSTANCE_NAME `
        --database-version=POSTGRES_15 `
        --tier=db-f1-micro `
        --region=$REGION `
        --project=$PROJECT_ID
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to create Cloud SQL instance" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Cloud SQL instance created" -ForegroundColor Green
}

# Step 2: Create Database
Write-Host "`nStep 2: Creating database..." -ForegroundColor Yellow
gcloud sql databases describe $DB_NAME --instance=$INSTANCE_NAME --project=$PROJECT_ID 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database already exists" -ForegroundColor Green
} else {
    gcloud sql databases create $DB_NAME `
        --instance=$INSTANCE_NAME `
        --project=$PROJECT_ID
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to create database" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Database created" -ForegroundColor Green
}

# Step 3: Generate and Set Database Password
Write-Host "`nStep 3: Setting database password..." -ForegroundColor Yellow
# Generate a secure password
$dbPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 20 | ForEach-Object {[char]$_})
Write-Host "Generated secure password for database" -ForegroundColor Gray
gcloud sql users set-password postgres `
    --instance=$INSTANCE_NAME `
    --password=$dbPassword `
    --project=$PROJECT_ID 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Password setting returned error, but this might be OK if already set" -ForegroundColor Yellow
}
Write-Host "✅ Database password set" -ForegroundColor Green

# Step 4: Get PROD secret values
Write-Host "`nStep 4: Getting PROD secret values..." -ForegroundColor Yellow
try {
    $aiKey = gcloud secrets versions access latest --secret=ai-api-key --project=$PROJECT_ID 2>&1 | Out-String
    $aiKey = $aiKey.Trim()
    $smtpHost = gcloud secrets versions access latest --secret=smtp-host --project=$PROJECT_ID 2>&1 | Out-String
    $smtpHost = $smtpHost.Trim()
    $smtpPort = gcloud secrets versions access latest --secret=smtp-port --project=$PROJECT_ID 2>&1 | Out-String
    $smtpPort = $smtpPort.Trim()
    $smtpUser = gcloud secrets versions access latest --secret=smtp-user --project=$PROJECT_ID 2>&1 | Out-String
    $smtpUser = $smtpUser.Trim()
    $smtpPassword = gcloud secrets versions access latest --secret=smtp-password --project=$PROJECT_ID 2>&1 | Out-String
    $smtpPassword = $smtpPassword.Trim()
    $smtpFromEmail = gcloud secrets versions access latest --secret=smtp-from-email --project=$PROJECT_ID 2>&1 | Out-String
    $smtpFromEmail = $smtpFromEmail.Trim()
    $smtpFromName = gcloud secrets versions access latest --secret=smtp-from-name --project=$PROJECT_ID 2>&1 | Out-String
    $smtpFromName = $smtpFromName.Trim()
    Write-Host "✅ Got PROD secret values" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not get all PROD secrets - will use defaults" -ForegroundColor Yellow
    $aiKey = $null
    $smtpHost = "smtp.gmail.com"
    $smtpPort = "587"
    $smtpUser = ""
    $smtpPassword = ""
    $smtpFromEmail = ""
    $smtpFromName = "UW Workbench DEV"
}

# Step 5: Create DEV Secrets
Write-Host "`nStep 5: Creating DEV secrets..." -ForegroundColor Yellow
$secrets = @{
    "ai-api-key-dev" = $aiKey
    "db-password-dev" = $dbPassword
    "smtp-host-dev" = $smtpHost
    "smtp-port-dev" = $smtpPort
    "smtp-user-dev" = $smtpUser
    "smtp-password-dev" = $smtpPassword
    "smtp-from-email-dev" = $smtpFromEmail
    "smtp-from-name-dev" = "UW Workbench DEV"
}

foreach ($secretName in $secrets.Keys) {
    $secretValue = $secrets[$secretName]
    if ([string]::IsNullOrWhiteSpace($secretValue)) {
        Write-Host "⚠️  Skipping $secretName (no value)" -ForegroundColor Yellow
        continue
    }
    
    gcloud secrets describe $secretName --project=$PROJECT_ID 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $secretName already exists" -ForegroundColor Green
    } else {
        Write-Host "  Creating $secretName..." -ForegroundColor Gray
        $secretValue | gcloud secrets create $secretName --data-file=- --project=$PROJECT_ID 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ $secretName created" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Failed to create $secretName" -ForegroundColor Red
        }
    }
}

# Step 6: Grant Service Account Permissions
Write-Host "`nStep 6: Granting service account permissions..." -ForegroundColor Yellow
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)" 2>&1 | Out-String
$PROJECT_NUMBER = $PROJECT_NUMBER.Trim()
$SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
Write-Host "Service Account: $SERVICE_ACCOUNT" -ForegroundColor Gray

foreach ($secretName in $secrets.Keys) {
    Write-Host "  Granting access to $secretName..." -ForegroundColor Gray
    gcloud secrets add-iam-policy-binding $secretName `
        --member="serviceAccount:$SERVICE_ACCOUNT" `
        --role="roles/secretmanager.secretAccessor" `
        --project=$PROJECT_ID 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Permissions granted for $secretName" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Permission grant returned error (may already be granted)" -ForegroundColor Yellow
    }
}

# Step 7: Deploy
Write-Host "`nStep 7: Deploying to DEV..." -ForegroundColor Yellow
Write-Host "Using Cloud Build (recommended)..." -ForegroundColor Cyan
gcloud builds submit --config cloudbuild.dev.yaml --project=$PROJECT_ID

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "✅ DEV Setup and Deployment Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    # Get service URLs
    $backendUrl = gcloud run services describe uw-workbench-backend-dev --region=$REGION --format="value(status.url)" --project=$PROJECT_ID 2>&1 | Out-String
    $backendUrl = $backendUrl.Trim()
    $frontendUrl = gcloud run services describe uw-workbench-frontend-dev --region=$REGION --format="value(status.url)" --project=$PROJECT_ID 2>&1 | Out-String
    $frontendUrl = $frontendUrl.Trim()
    
    Write-Host "Backend URL: $backendUrl" -ForegroundColor Cyan
    Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next: Create admin user with:" -ForegroundColor Yellow
    Write-Host "  .\scripts\create_dev_admin.ps1" -ForegroundColor Gray
} else {
    Write-Host "`n❌ Deployment failed" -ForegroundColor Red
    Write-Host "Check logs above for errors" -ForegroundColor Yellow
    exit 1
}
