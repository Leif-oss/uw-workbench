# Run these commands in your PowerShell terminal
# Make sure you're authenticated: gcloud auth login

$PROJECT_ID = "ultra-ace-481723-e6"
$REGION = "us-central1"
$SERVICE_NAME = "uw-workbench-backend"

# Set project
gcloud config set project $PROJECT_ID

# Enable APIs
Write-Host "Enabling APIs..." -ForegroundColor Yellow
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable containerregistry.googleapis.com

Write-Host "`n✅ APIs enabled!" -ForegroundColor Green
Write-Host "`nNext: Store your secrets in Secret Manager" -ForegroundColor Yellow
Write-Host "You'll need:" -ForegroundColor Cyan
Write-Host "  - OpenAI API Key" -ForegroundColor White
Write-Host "  - SMTP credentials (host, port, user, password, from email, from name)" -ForegroundColor White
Write-Host "`nExample commands:" -ForegroundColor Yellow
Write-Host '  echo -n "sk-your-key" | gcloud secrets create ai-api-key --data-file=-' -ForegroundColor Gray
Write-Host '  echo -n "smtp.gmail.com" | gcloud secrets create smtp-host --data-file=-' -ForegroundColor Gray
Write-Host "`nAfter storing secrets, run the build and deploy commands below..." -ForegroundColor Yellow

# Build and deploy (uncomment after storing secrets)
# Write-Host "`nBuilding Docker image..." -ForegroundColor Yellow
# $IMAGE = "gcr.io/$PROJECT_ID/$SERVICE_NAME"
# gcloud builds submit --tag $IMAGE ./backend
# 
# Write-Host "`nDeploying to Cloud Run..." -ForegroundColor Yellow
# gcloud run deploy $SERVICE_NAME `
#   --image $IMAGE `
#   --platform managed `
#   --region $REGION `
#   --allow-unauthenticated `
#   --memory 512Mi `
#   --cpu 1 `
#   --timeout 300 `
#   --max-instances 10 `
#   --set-env-vars "ENVIRONMENT=production" `
#   --set-secrets "AI_API_KEY=ai-api-key:latest,SMTP_HOST=smtp-host:latest,SMTP_PORT=smtp-port:latest,SMTP_USER=smtp-user:latest,SMTP_PASSWORD=smtp-password:latest,SMTP_FROM_EMAIL=smtp-from-email:latest,SMTP_FROM_NAME=smtp-from-name:latest"
# 
# Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
# $SERVICE_URL = gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)"
# Write-Host "Backend URL: $SERVICE_URL" -ForegroundColor Green



