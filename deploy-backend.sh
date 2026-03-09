#!/bin/bash
# Deploy backend to Cloud Run
# Project ID: ultra-ace-481723-e6

set -e

PROJECT_ID="ultra-ace-481723-e6"
REGION="us-central1"
SERVICE_NAME="uw-workbench-backend"
IMAGE="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Deploying backend to Cloud Run..."
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo ""

# Get the connection name for Cloud SQL (update if you've created the instance)
# Uncomment and update after creating Cloud SQL instance:
# DB_INSTANCE="uw-workbench-db"
# CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE --format="value(connectionName)")

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars "ENVIRONMENT=production" \
  --set-secrets "AI_API_KEY=ai-api-key:latest,ADMIN_PASSWORD=admin-password:latest" \
  # Uncomment after setting up Cloud SQL:
  # --add-cloudsql-instances $CONNECTION_NAME \
  # --set-env-vars "DATABASE_URL=postgresql://workbench_user:\$(gcloud secrets versions access latest --secret=db-password)@/workbench?host=/cloudsql/$CONNECTION_NAME"

echo ""
echo "✅ Backend deployed!"
echo "🔗 URL: $(gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)')"
echo ""
echo "⚠️  Remember to:"
echo "1. Update CORS_ORIGINS with frontend URL after deploying frontend"
echo "2. Set up Cloud SQL connection if using managed database"
echo "3. Verify secrets are accessible"





