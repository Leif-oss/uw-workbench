#!/bin/bash
# Deploy frontend to Cloud Run
# Project ID: ultra-ace-481723-e6

set -e

PROJECT_ID="ultra-ace-481723-e6"
REGION="us-central1"
SERVICE_NAME="uw-workbench-frontend"
IMAGE="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Deploying frontend to Cloud Run..."
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo ""

# Get backend URL
BACKEND_SERVICE="uw-workbench-backend"
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region $REGION --format='value(status.url)' 2>/dev/null || echo "")

if [ -z "$BACKEND_URL" ]; then
  echo "⚠️  Warning: Backend service not found. Deploy backend first, then update .env.production"
  echo "   Set VITE_API_URL in frontend/.env.production before deploying"
else
  echo "📡 Backend URL detected: $BACKEND_URL"
  echo "   Make sure frontend/.env.production has: VITE_API_URL=$BACKEND_URL"
fi

echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  exit 1
fi

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --port 80

echo ""
echo "✅ Frontend deployed!"
FRONTEND_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)')
echo "🔗 URL: $FRONTEND_URL"
echo ""
echo "📝 Next steps:"
echo "1. Update backend CORS_ORIGINS to include: $FRONTEND_URL"
echo "2. Visit $FRONTEND_URL to test the application"





