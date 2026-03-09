# Step 1: Enable Required APIs
# Run this in your PowerShell terminal

Write-Host "Enabling Google Cloud APIs..." -ForegroundColor Yellow

gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable containerregistry.googleapis.com

Write-Host "`n✅ APIs enabled!" -ForegroundColor Green
Write-Host "`nNext step: Store secrets in Secret Manager" -ForegroundColor Cyan



