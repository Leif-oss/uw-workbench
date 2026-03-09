# Initial Google Cloud setup for UW-WORKBENCH (PowerShell version)
# Project ID: ultra-ace-481723-e6

$PROJECT_ID = "ultra-ace-481723-e6"
$PROJECT_NUMBER = "944484068966"
$REGION = "us-central1"

Write-Host "🔧 Setting up Google Cloud for UW-WORKBENCH" -ForegroundColor Cyan
Write-Host "Project ID: $PROJECT_ID"
Write-Host "Project Number: $PROJECT_NUMBER"
Write-Host ""

# Set the active project
gcloud config set project $PROJECT_ID

# Enable required APIs
Write-Host "📡 Enabling required APIs..." -ForegroundColor Yellow
gcloud services enable `
  cloudbuild.googleapis.com `
  run.googleapis.com `
  sql-component.googleapis.com `
  sqladmin.googleapis.com `
  secretmanager.googleapis.com `
  containerregistry.googleapis.com `
  artifactregistry.googleapis.com

Write-Host ""
Write-Host "✅ APIs enabled!" -ForegroundColor Green

# Create secrets
Write-Host ""
Write-Host "🔐 Setting up secrets..." -ForegroundColor Yellow
Write-Host "Note: You'll need to add secret values separately"
Write-Host ""

# Create secrets (user will need to add versions)
try {
    gcloud secrets create ai-api-key --replication-policy="automatic" 2>$null
    Write-Host "Created secret: ai-api-key" -ForegroundColor Green
} catch {
    Write-Host "Secret ai-api-key already exists" -ForegroundColor Yellow
}

try {
    gcloud secrets create admin-password --replication-policy="automatic" 2>$null
    Write-Host "Created secret: admin-password" -ForegroundColor Green
} catch {
    Write-Host "Secret admin-password already exists" -ForegroundColor Yellow
}

try {
    gcloud secrets create db-password --replication-policy="automatic" 2>$null
    Write-Host "Created secret: db-password" -ForegroundColor Green
} catch {
    Write-Host "Secret db-password already exists" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 To add secret values, run:" -ForegroundColor Cyan
Write-Host "   `$env:OPENAI_KEY | gcloud secrets versions add ai-api-key --data-file=-"
Write-Host "   `$env:ADMIN_PASS | gcloud secrets versions add admin-password --data-file=-"
Write-Host "   `$env:DB_PASS | gcloud secrets versions add db-password --data-file=-"
Write-Host ""

# Grant Cloud Run service account access to secrets
$SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

Write-Host "🔑 Granting service account access to secrets..." -ForegroundColor Yellow

try {
    gcloud secrets add-iam-policy-binding ai-api-key `
      --member="serviceAccount:$SERVICE_ACCOUNT" `
      --role="roles/secretmanager.secretAccessor" 2>$null
    Write-Host "Granted access to ai-api-key" -ForegroundColor Green
} catch {
    Write-Host "Policy already set for ai-api-key" -ForegroundColor Yellow
}

try {
    gcloud secrets add-iam-policy-binding admin-password `
      --member="serviceAccount:$SERVICE_ACCOUNT" `
      --role="roles/secretmanager.secretAccessor" 2>$null
    Write-Host "Granted access to admin-password" -ForegroundColor Green
} catch {
    Write-Host "Policy already set for admin-password" -ForegroundColor Yellow
}

try {
    gcloud secrets add-iam-policy-binding db-password `
      --member="serviceAccount:$SERVICE_ACCOUNT" `
      --role="roles/secretmanager.secretAccessor" 2>$null
    Write-Host "Granted access to db-password" -ForegroundColor Green
} catch {
    Write-Host "Policy already set for db-password" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Initial setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Add secret values (see commands above)"
Write-Host "2. (Optional) Create Cloud SQL instance"
Write-Host "3. Build and deploy: gcloud builds submit --config cloudbuild.yaml"





