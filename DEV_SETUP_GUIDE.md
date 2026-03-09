# DEV Environment Setup Guide

This guide shows how PROD was set up, so you can replicate it for DEV.

## How PROD (main) Was Set Up

### 1. Cloud SQL Instance
```bash
gcloud sql instances create uw-workbench-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --project=ultra-ace-481723-e6
```

### 2. Database Created
```bash
gcloud sql databases create uw_workbench \
    --instance=uw-workbench-db \
    --project=ultra-ace-481723-e6
```

### 3. Database User & Password
- Used default `postgres` user
- Password stored in Secret Manager as `db-password`

### 4. Secrets Created in Secret Manager
```bash
# AI API Key
echo "your-openai-api-key" | gcloud secrets create ai-api-key --data-file=-

# Database Password
echo "your-db-password" | gcloud secrets create db-password --data-file=-

# SMTP Secrets
echo "smtp.gmail.com" | gcloud secrets create smtp-host --data-file=-
echo "587" | gcloud secrets create smtp-port --data-file=-
echo "your-email@gmail.com" | gcloud secrets create smtp-user --data-file=-
echo "your-app-password" | gcloud secrets create smtp-password --data-file=-
echo "your-email@gmail.com" | gcloud secrets create smtp-from-email --data-file=-
echo "UW Workbench" | gcloud secrets create smtp-from-name --data-file=-
```

### 5. Service Account Permissions
```bash
# Get project number and service account
PROJECT_NUMBER=$(gcloud projects describe ultra-ace-481723-e6 --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant Secret Accessor role for each secret
gcloud secrets add-iam-policy-binding ai-api-key \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding db-password \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor"

# ... repeat for all SMTP secrets
```

### 6. Cloud Run Deployment
- Used `cloudbuild.yaml` for automated deployment
- Backend connects to Cloud SQL via connection name
- Secrets are injected as environment variables
- CORS configured with frontend URL

---

## DEV Setup (Replicate PROD)

### Step 1: Create DEV Cloud SQL Instance
```bash
gcloud sql instances create uw-workbench-db-dev \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --project=ultra-ace-481723-e6
```

### Step 2: Create DEV Database
```bash
gcloud sql databases create uw_workbench \
    --instance=uw-workbench-db-dev \
    --project=ultra-ace-481723-e6
```

### Step 3: Set Database Password
```bash
# Generate a secure password (or use existing one)
# Then set it for the postgres user
gcloud sql users set-password postgres \
    --instance=uw-workbench-db-dev \
    --password=YOUR_SECURE_PASSWORD \
    --project=ultra-ace-481723-e6
```

### Step 4: Create DEV Secrets
```bash
# AI API Key (can reuse PROD value)
echo "your-openai-api-key" | gcloud secrets create ai-api-key-dev --data-file=-

# Database Password (MUST be different from PROD)
echo "YOUR_SECURE_PASSWORD" | gcloud secrets create db-password-dev --data-file=-

# SMTP Secrets (can reuse PROD values or use different ones)
echo "smtp.gmail.com" | gcloud secrets create smtp-host-dev --data-file=-
echo "587" | gcloud secrets create smtp-port-dev --data-file=-
echo "your-email@gmail.com" | gcloud secrets create smtp-user-dev --data-file=-
echo "your-app-password" | gcloud secrets create smtp-password-dev --data-file=-
echo "your-email@gmail.com" | gcloud secrets create smtp-from-email-dev --data-file=-
echo "UW Workbench DEV" | gcloud secrets create smtp-from-name-dev --data-file=-
```

### Step 5: Grant Service Account Access to DEV Secrets
```bash
# Get project number and service account
PROJECT_NUMBER=$(gcloud projects describe ultra-ace-481723-e6 --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant access to all DEV secrets
for secret in ai-api-key-dev db-password-dev smtp-host-dev smtp-port-dev smtp-user-dev smtp-password-dev smtp-from-email-dev smtp-from-name-dev; do
    gcloud secrets add-iam-policy-binding $secret \
        --member="serviceAccount:${SERVICE_ACCOUNT}" \
        --role="roles/secretmanager.secretAccessor" \
        --project=ultra-ace-481723-e6
done
```

### Step 6: Deploy to DEV
```bash
# Option A: Use Cloud Build (recommended)
gcloud builds submit --config cloudbuild.dev.yaml

# Option B: Use deploy script
.\scripts\deploy_dev.ps1
```

---

## Quick Setup Script

Save this as `setup-dev.ps1`:

```powershell
$PROJECT_ID = "ultra-ace-481723-e6"
$REGION = "us-central1"
$INSTANCE_NAME = "uw-workbench-db-dev"
$DB_NAME = "uw_workbench"
$DB_PASSWORD = "CHANGE_THIS_TO_SECURE_PASSWORD"

# Step 1: Create Cloud SQL instance
Write-Host "Creating Cloud SQL instance..." -ForegroundColor Cyan
gcloud sql instances create $INSTANCE_NAME `
    --database-version=POSTGRES_15 `
    --tier=db-f1-micro `
    --region=$REGION `
    --project=$PROJECT_ID

# Step 2: Create database
Write-Host "Creating database..." -ForegroundColor Cyan
gcloud sql databases create $DB_NAME `
    --instance=$INSTANCE_NAME `
    --project=$PROJECT_ID

# Step 3: Set password
Write-Host "Setting database password..." -ForegroundColor Cyan
gcloud sql users set-password postgres `
    --instance=$INSTANCE_NAME `
    --password=$DB_PASSWORD `
    --project=$PROJECT_ID

# Step 4: Get service account
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

# Step 5: Create secrets (you'll need to provide values)
Write-Host "Creating secrets..." -ForegroundColor Cyan
Write-Host "NOTE: You'll need to provide actual values for these secrets" -ForegroundColor Yellow

# Step 6: Grant permissions
Write-Host "Granting service account permissions..." -ForegroundColor Cyan
$secrets = @("ai-api-key-dev", "db-password-dev", "smtp-host-dev", "smtp-port-dev", "smtp-user-dev", "smtp-password-dev", "smtp-from-email-dev", "smtp-from-name-dev")
foreach ($secret in $secrets) {
    gcloud secrets add-iam-policy-binding $secret `
        --member="serviceAccount:$SERVICE_ACCOUNT" `
        --role="roles/secretmanager.secretAccessor" `
        --project=$PROJECT_ID
}

Write-Host "`n✅ DEV environment setup complete!" -ForegroundColor Green
Write-Host "Next: Deploy using: gcloud builds submit --config cloudbuild.dev.yaml" -ForegroundColor Cyan
```
