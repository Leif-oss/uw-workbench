# Google Cloud Deployment Script for UW Workbench
# This script guides you through deploying the backend to Google Cloud Run

$ErrorActionPreference = "Stop"

Write-Host "🚀 UW Workbench - Google Cloud Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
try {
    $gcloudVersion = gcloud --version 2>&1 | Select-Object -First 1
    Write-Host "✅ Google Cloud SDK found: $gcloudVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Google Cloud SDK not found!" -ForegroundColor Red
    Write-Host "Please install from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Step 1: Get or create GCP project
Write-Host "`n📋 Step 1: Google Cloud Project Setup" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

$currentProject = gcloud config get-value project 2>&1
if ($currentProject -and $currentProject -notmatch "ERROR") {
    Write-Host "Current project: $currentProject" -ForegroundColor Cyan
    $useCurrent = Read-Host "Use this project? [y/n]"
    if ($useCurrent -ne "y") {
        $PROJECT_ID = Read-Host "Enter your Google Cloud Project ID"
        gcloud config set project $PROJECT_ID
    } else {
        $PROJECT_ID = $currentProject
    }
} else {
    $PROJECT_ID = Read-Host "Enter your Google Cloud Project ID (or create one at console.cloud.google.com)"
    gcloud config set project $PROJECT_ID
}

Write-Host "✅ Using project: $PROJECT_ID" -ForegroundColor Green

# Step 2: Enable required APIs
Write-Host "`n📋 Step 2: Enabling Required APIs" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

$apis = @(
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "sql-component.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "containerregistry.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "Enabling $api..." -ForegroundColor Cyan
    gcloud services enable $api --project=$PROJECT_ID 2>&1 | Out-Null
}

Write-Host "✅ All APIs enabled" -ForegroundColor Green

# Step 3: Create Cloud SQL instance (optional - can skip for now)
Write-Host "`n📋 Step 3: Cloud SQL Database Setup" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow
Write-Host "Note: You can skip this and use SQLite for initial testing" -ForegroundColor Gray

$setupDB = Read-Host "Create Cloud SQL PostgreSQL instance? [y/n]"
$CONNECTION_NAME = $null
$DB_PASSWORD = $null

if ($setupDB -eq "y") {
    $DB_INSTANCE = Read-Host "Database instance name (default: uw-workbench-db)"
    if ([string]::IsNullOrWhiteSpace($DB_INSTANCE)) {
        $DB_INSTANCE = "uw-workbench-db"
    }
    
    $DB_PASSWORD = Read-Host "Database root password (min 8 chars)" -AsSecureString
    $DB_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD)
    )
    
    Write-Host "Creating Cloud SQL instance (this may take 5-10 minutes)..." -ForegroundColor Cyan
    gcloud sql instances create $DB_INSTANCE `
        --database-version=POSTGRES_15 `
        --tier=db-f1-micro `
        --region=us-central1 `
        --root-password=$DB_PASSWORD_PLAIN `
        --project=$PROJECT_ID
    
    Write-Host "Creating database..." -ForegroundColor Cyan
    gcloud sql databases create workbench --instance=$DB_INSTANCE --project=$PROJECT_ID
    
    Write-Host "Creating database user..." -ForegroundColor Cyan
    $DB_USER_PASSWORD = Read-Host "Database user password" -AsSecureString
    $DB_USER_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_USER_PASSWORD)
    )
    
    gcloud sql users create workbench_user `
        --instance=$DB_INSTANCE `
        --password=$DB_USER_PASSWORD_PLAIN `
        --project=$PROJECT_ID
    
    $CONNECTION_NAME = gcloud sql instances describe $DB_INSTANCE --format="value(connectionName)" --project=$PROJECT_ID
    Write-Host "✅ Database created. Connection name: $CONNECTION_NAME" -ForegroundColor Green
    
    # Store DB password in Secret Manager
    Write-Host "Storing database password in Secret Manager..." -ForegroundColor Cyan
    echo -n $DB_USER_PASSWORD_PLAIN | gcloud secrets create db-password --data-file=- --project=$PROJECT_ID 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        # Secret might already exist, try adding a new version
        echo -n $DB_USER_PASSWORD_PLAIN | gcloud secrets versions add db-password --data-file=- --project=$PROJECT_ID
    }
}

# Step 4: Store secrets
Write-Host "`n📋 Step 4: Storing Secrets in Secret Manager" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

$secrets = @{
    "ai-api-key" = "OpenAI API Key"
    "smtp-host" = "SMTP Host (e.g., smtp.gmail.com)"
    "smtp-port" = "SMTP Port (e.g., 587)"
    "smtp-user" = "SMTP Username/Email"
    "smtp-password" = "SMTP Password"
    "smtp-from-email" = "From Email Address"
    "smtp-from-name" = "From Name (e.g., UW Workbench)"
}

$storedSecrets = @{}

foreach ($secretName in $secrets.Keys) {
    $description = $secrets[$secretName]
    Write-Host "`n$description" -ForegroundColor Cyan
    $skip = Read-Host "Skip this secret? [y/n]"
    
    if ($skip -ne "y") {
        $value = Read-Host "Enter value" -AsSecureString
        $valuePlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($value)
        )
        
        Write-Host "Storing $secretName..." -ForegroundColor Cyan
        $result = echo -n $valuePlain | gcloud secrets create $secretName --data-file=- --project=$PROJECT_ID 2>&1
        if ($LASTEXITCODE -ne 0) {
            # Secret might already exist, try adding a new version
            echo -n $valuePlain | gcloud secrets versions add $secretName --data-file=- --project=$PROJECT_ID
        }
        $storedSecrets[$secretName] = $true
        Write-Host "✅ Stored $secretName" -ForegroundColor Green
    }
}

# Step 5: Grant service account access to secrets
Write-Host "`n📋 Step 5: Granting Service Account Access" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

Write-Host "Service account: $SERVICE_ACCOUNT" -ForegroundColor Cyan

foreach ($secretName in $storedSecrets.Keys) {
    Write-Host "Granting access to $secretName..." -ForegroundColor Cyan
    gcloud secrets add-iam-policy-binding $secretName `
        --member="serviceAccount:$SERVICE_ACCOUNT" `
        --role="roles/secretmanager.secretAccessor" `
        --project=$PROJECT_ID | Out-Null
}

if ($CONNECTION_NAME) {
    Write-Host "Granting Cloud SQL access..." -ForegroundColor Cyan
    gcloud projects add-iam-policy-binding $PROJECT_ID `
        --member="serviceAccount:$SERVICE_ACCOUNT" `
        --role="roles/cloudsql.client" | Out-Null
}

Write-Host "✅ Service account permissions granted" -ForegroundColor Green

# Step 6: Build and deploy
Write-Host "`n📋 Step 6: Building and Deploying Backend" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

$REGION = "us-central1"
$SERVICE_NAME = "uw-workbench-backend"
$IMAGE = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

Write-Host "Building Docker image..." -ForegroundColor Cyan
Write-Host "This may take 5-10 minutes..." -ForegroundColor Gray

# Build the image
gcloud builds submit --tag $IMAGE --project=$PROJECT_ID ./backend

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Image built successfully" -ForegroundColor Green

# Prepare deployment command
$deployArgs = @(
    "run", "deploy", $SERVICE_NAME,
    "--image", $IMAGE,
    "--platform", "managed",
    "--region", $REGION,
    "--allow-unauthenticated",
    "--memory", "512Mi",
    "--cpu", "1",
    "--timeout", "300",
    "--max-instances", "10",
    "--set-env-vars", "ENVIRONMENT=production"
)

# Add secrets
$secretList = @()
foreach ($secretName in $storedSecrets.Keys) {
    $envVarName = $secretName.ToUpper().Replace("-", "_")
    $secretList += "$envVarName=$secretName`:latest"
}
if ($secretList.Count -gt 0) {
    $deployArgs += "--set-secrets"
    $deployArgs += ($secretList -join ",")
}

# Add Cloud SQL connection if set up
if ($CONNECTION_NAME) {
    $deployArgs += "--add-cloudsql-instances"
    $deployArgs += $CONNECTION_NAME
    
    $deployArgs += "--set-env-vars"
    $deployArgs += "CLOUD_SQL_CONNECTION_NAME=$CONNECTION_NAME,DB_USER=workbench_user,DB_NAME=workbench"
}

# Get frontend URL for CORS (optional)
$FRONTEND_URL = Read-Host "`nFrontend URL (for CORS, press Enter to skip)"
if ($FRONTEND_URL) {
    $deployArgs += "--update-env-vars"
    $deployArgs += "CORS_ORIGINS=$FRONTEND_URL"
}

Write-Host "`nDeploying to Cloud Run..." -ForegroundColor Cyan
& gcloud $deployArgs --project=$PROJECT_ID

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

# Get the service URL
$SERVICE_URL = gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)" --project=$PROJECT_ID

Write-Host "`n✅ Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Backend URL: $SERVICE_URL" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Test the API: $SERVICE_URL/health" -ForegroundColor White
Write-Host "2. Update frontend .env with: VITE_API_URL=$SERVICE_URL" -ForegroundColor White
Write-Host "3. Deploy frontend (optional)" -ForegroundColor White
Write-Host "`nTo view logs: gcloud run services logs read $SERVICE_NAME --region=$REGION" -ForegroundColor Gray

