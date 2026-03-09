# Step 5: Build Docker Image
Write-Host "Building Docker Image..." -ForegroundColor Yellow
Write-Host "This will take 5-10 minutes..." -ForegroundColor Gray
Write-Host ""

$PROJECT_ID = "ultra-ace-481723-e6"
$IMAGE = "gcr.io/$PROJECT_ID/uw-workbench-backend"

Write-Host "Project: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "Image: $IMAGE" -ForegroundColor Cyan
Write-Host ""

Write-Host "Starting build..." -ForegroundColor Yellow
gcloud builds submit --tag $IMAGE --project=$PROJECT_ID ./backend

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Build complete!" -ForegroundColor Green
    Write-Host "`nNext step: Deploy to Cloud Run" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host "Check the error messages above." -ForegroundColor Yellow
}



