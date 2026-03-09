# Enable all required APIs
Write-Host "Enabling Google Cloud APIs..." -ForegroundColor Yellow

Write-Host "`n1. Cloud Build API..." -ForegroundColor Cyan
gcloud services enable cloudbuild.googleapis.com

Write-Host "`n2. Cloud Run API..." -ForegroundColor Cyan
gcloud services enable run.googleapis.com

Write-Host "`n3. SQL Component API..." -ForegroundColor Cyan
gcloud services enable sql-component.googleapis.com

Write-Host "`n4. SQL Admin API..." -ForegroundColor Cyan
gcloud services enable sqladmin.googleapis.com

Write-Host "`n5. Secret Manager API..." -ForegroundColor Cyan
gcloud services enable secretmanager.googleapis.com

Write-Host "`n6. Container Registry API..." -ForegroundColor Cyan
gcloud services enable containerregistry.googleapis.com

Write-Host "`n✅ All APIs enabled!" -ForegroundColor Green
Write-Host "`nNext step: Store your OpenAI API key" -ForegroundColor Cyan



