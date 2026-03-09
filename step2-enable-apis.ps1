# Step 2: Enable Required APIs
Write-Host "Enabling Google Cloud APIs..." -ForegroundColor Yellow

gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable containerregistry.googleapis.com

Write-Host "`n✅ All APIs enabled!" -ForegroundColor Green
Write-Host "`nNext: Store your OpenAI API key" -ForegroundColor Cyan



