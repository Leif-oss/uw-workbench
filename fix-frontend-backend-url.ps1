# Fix Frontend Backend URL
# Rebuilds and redeploys the frontend with the correct backend URL

$ErrorActionPreference = "Stop"

Write-Host "Fixing Frontend Backend URL..." -ForegroundColor Cyan
Write-Host ""

# Get project ID
$PROJECT_ID = (gcloud config get-value project 2>&1 | Out-String).Trim()
if (-not $PROJECT_ID -or $PROJECT_ID -eq "" -or $PROJECT_ID -match "ERROR") {
    Write-Host "ERROR: No GCP project set" -ForegroundColor Red
    exit 1
}

$REGION = "us-central1"

# Get backend URL
Write-Host "Getting backend URL..." -ForegroundColor Yellow
$backendUrl = (gcloud run services describe uw-workbench-backend --region=$REGION --format="value(status.url)" --project=$PROJECT_ID 2>&1 | Out-String).Trim()

if (-not $backendUrl -or -not $backendUrl.StartsWith("http")) {
    Write-Host "ERROR: Could not get backend URL" -ForegroundColor Red
    exit 1
}

Write-Host "Backend URL: $backendUrl" -ForegroundColor Green
Write-Host ""

# Create a temporary cloudbuild.yaml for frontend only
$tempCloudbuild = @"
steps:
  # Build frontend image with backend URL
  - name: 'gcr.io/cloud-builders/docker'
    entrypoint: bash
    args:
      - '-c'
      - |
        echo "Building frontend with backend URL: $backendUrl"
        docker build \
          --build-arg VITE_API_URL=$backendUrl \
          -t gcr.io/$PROJECT_ID/uw-workbench-frontend:latest \
          -t gcr.io/$PROJECT_ID/uw-workbench-frontend:`$BUILD_ID \
          ./frontend

  # Push frontend image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - '--all-tags'
      - 'gcr.io/$PROJECT_ID/uw-workbench-frontend'
    waitFor: ['-']

  # Deploy frontend to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'uw-workbench-frontend'
      - '--image'
      - 'gcr.io/$PROJECT_ID/uw-workbench-frontend:`$BUILD_ID'
      - '--region'
      - '$REGION'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--memory=256Mi'
      - '--set-env-vars=ENVIRONMENT=production'
    waitFor: ['-']

images:
  - 'gcr.io/$PROJECT_ID/uw-workbench-frontend:`$BUILD_ID'
  - 'gcr.io/$PROJECT_ID/uw-workbench-frontend:latest'

options:
  machineType: 'E2_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY

timeout: '1200s'
"@

$tempFile = "cloudbuild-frontend-fix.yaml"
$tempCloudbuild | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "Submitting build to Cloud Build..." -ForegroundColor Yellow
Write-Host "This will rebuild the frontend with the correct backend URL." -ForegroundColor Gray
Write-Host ""

# Submit build
gcloud builds submit --config $tempFile --project=$PROJECT_ID

# Clean up
Remove-Item $tempFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Green
Write-Host "Frontend rebuild complete!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green
Write-Host ""
Write-Host "The frontend should now be able to connect to the backend." -ForegroundColor Yellow
Write-Host "Try accessing the frontend URL again." -ForegroundColor Yellow



