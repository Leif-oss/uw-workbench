# Deploy to DEV Cloud Run services
# This script deploys ONLY to *-dev services, never touches production

param(
    [switch]$SkipBuild = $false,
    [switch]$SkipBackend = $false,
    [switch]$SkipFrontend = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying to DEV Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$PROJECT_ID = "ultra-ace-481723-e6"
$REGION = "us-central1"
$BACKEND_SERVICE = "uw-workbench-backend-dev"
$FRONTEND_SERVICE = "uw-workbench-frontend-dev"
$CLOUD_SQL_INSTANCE = "ultra-ace-481723-e6:us-central1:uw-workbench-db-dev"

Write-Host "Project: $PROJECT_ID" -ForegroundColor Gray
Write-Host "Region: $REGION" -ForegroundColor Gray
Write-Host "Backend Service: $BACKEND_SERVICE" -ForegroundColor Gray
Write-Host "Frontend Service: $FRONTEND_SERVICE" -ForegroundColor Gray
Write-Host ""

# Verify we're using the correct project
$currentProject = gcloud config get-value project 2>$null
if ($currentProject -ne $PROJECT_ID) {
    Write-Host "Warning: Current project is $currentProject, expected $PROJECT_ID" -ForegroundColor Yellow
    Write-Host "Setting project to $PROJECT_ID..." -ForegroundColor Yellow
    gcloud config set project $PROJECT_ID
}

# Deploy Backend
if (-not $SkipBackend) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Building and Deploying Backend (DEV)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    if (-not $SkipBuild) {
        Write-Host "Building backend Docker image..." -ForegroundColor Yellow
        $backendImage = "gcr.io/$PROJECT_ID/uw-workbench-backend-dev:latest"
        
        Set-Location "$PSScriptRoot\..\backend"
        docker build -t $backendImage .
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: Backend Docker build failed" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "Pushing backend image to Container Registry..." -ForegroundColor Yellow
        docker push $backendImage
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: Backend Docker push failed" -ForegroundColor Red
            exit 1
        }
        Set-Location $PSScriptRoot\..
    } else {
        $backendImage = "gcr.io/$PROJECT_ID/uw-workbench-backend-dev:latest"
    }
    
    Write-Host "Deploying backend to Cloud Run..." -ForegroundColor Yellow
    gcloud run deploy $BACKEND_SERVICE `
        --image=$backendImage `
        --platform=managed `
        --region=$REGION `
        --allow-unauthenticated `
        --memory=512Mi `
        --cpu=1 `
        --timeout=300 `
        --max-instances=10 `
        --add-cloudsql-instances=$CLOUD_SQL_INSTANCE `
        --set-secrets="AI_API_KEY=ai-api-key-dev:latest,DB_PASSWORD=db-password-dev:latest,SMTP_HOST=smtp-host-dev:latest,SMTP_PORT=smtp-port-dev:latest,SMTP_USER=smtp-user-dev:latest,SMTP_PASSWORD=smtp-password-dev:latest,SMTP_FROM_EMAIL=smtp-from-email-dev:latest,SMTP_FROM_NAME=smtp-from-name-dev:latest" `
        --set-env-vars="ENVIRONMENT=development,TEMP_SETUP_MODE=true,DB_USER=postgres,DB_NAME=uw_workbench,CLOUD_SQL_CONNECTION_NAME=$CLOUD_SQL_INSTANCE"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Backend deployment failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "Backend deployed successfully!" -ForegroundColor Green
    Write-Host ""
}

# Get backend URL
Write-Host "Getting backend URL..." -ForegroundColor Yellow
$backendUrl = gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(status.url)"
Write-Host "Backend URL: $backendUrl" -ForegroundColor Gray
Write-Host ""

# Deploy Frontend
if (-not $SkipFrontend) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Building and Deploying Frontend (DEV)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    if (-not $SkipBuild) {
        Write-Host "Building frontend Docker image..." -ForegroundColor Yellow
        Write-Host "  Backend URL: $backendUrl" -ForegroundColor Gray
        $frontendImage = "gcr.io/$PROJECT_ID/uw-workbench-frontend-dev:latest"
        
        Set-Location "$PSScriptRoot\..\frontend"
        docker build --build-arg VITE_API_URL=$backendUrl -t $frontendImage .
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: Frontend Docker build failed" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "Pushing frontend image to Container Registry..." -ForegroundColor Yellow
        docker push $frontendImage
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: Frontend Docker push failed" -ForegroundColor Red
            exit 1
        }
        Set-Location $PSScriptRoot\..
    } else {
        $frontendImage = "gcr.io/$PROJECT_ID/uw-workbench-frontend-dev:latest"
    }
    
    Write-Host "Deploying frontend to Cloud Run..." -ForegroundColor Yellow
    gcloud run deploy $FRONTEND_SERVICE `
        --image=$frontendImage `
        --platform=managed `
        --region=$REGION `
        --allow-unauthenticated `
        --memory=256Mi
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Frontend deployment failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "Frontend deployed successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Get frontend URL and update backend CORS
    $frontendUrl = gcloud run services describe $FRONTEND_SERVICE --region=$REGION --format="value(status.url)"
    Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Updating backend CORS with frontend URL..." -ForegroundColor Yellow
    gcloud run services update $BACKEND_SERVICE `
        --region=$REGION `
        --update-env-vars="CORS_ORIGINS=$frontendUrl,FRONTEND_URL=$frontendUrl"
    
    Write-Host ""
}

# Summary
Write-Host "========================================" -ForegroundColor Green
Write-Host "DEV Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend URL: $backendUrl" -ForegroundColor Cyan
if (-not $SkipFrontend) {
    Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Verify deployment:" -ForegroundColor Yellow
Write-Host "  curl $backendUrl/health" -ForegroundColor Gray
if (-not $SkipFrontend) {
    Write-Host "  Open: $frontendUrl" -ForegroundColor Gray
}
Write-Host ""
