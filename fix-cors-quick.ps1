# Quick CORS Fix
# Updates CORS on the backend to allow the frontend

$ErrorActionPreference = "Stop"

$PROJECT_ID = "ultra-ace-481723-e6"
$REGION = "us-central1"

Write-Host "Fixing CORS Configuration..." -ForegroundColor Cyan
Write-Host ""

# Get both frontend URLs (there might be two)
$frontendUrl1 = "https://uw-workbench-frontend-4szvavge6a-uc.a.run.app"
$frontendUrl2 = "https://uw-workbench-frontend-944484068966.us-central1.run.app"

# Combine both URLs for CORS (escape the comma properly)
$corsOrigins = "$frontendUrl1,$frontendUrl2"

Write-Host "Setting CORS_ORIGINS to: $corsOrigins" -ForegroundColor Yellow
Write-Host ""

# Update the backend service (use single quotes to avoid PowerShell parsing issues)
Write-Host "Updating backend CORS..." -ForegroundColor Cyan
$corsValue = "CORS_ORIGINS=$corsOrigins"
gcloud run services update uw-workbench-backend `
    --region=$REGION `
    --update-env-vars=$corsValue `
    --project=$PROJECT_ID

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Green
Write-Host "CORS updated!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green
Write-Host ""
Write-Host "The backend should now accept requests from both frontend URLs." -ForegroundColor Yellow
Write-Host "Try logging in again." -ForegroundColor Yellow

