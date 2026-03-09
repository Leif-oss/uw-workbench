#!/bin/bash
# Quick deployment script for UW-WORKBENCH
# Project ID: ultra-ace-481723-e6

set -e

PROJECT_ID="ultra-ace-481723-e6"
REGION="us-central1"
BACKEND_SERVICE="uw-workbench-backend"
FRONTEND_SERVICE="uw-workbench-frontend"

echo "🚀 Deploying UW-WORKBENCH to Google Cloud"
echo "Project ID: $PROJECT_ID"
echo ""

# Set the project
gcloud config set project $PROJECT_ID

echo "📦 Building and deploying backend..."
cd backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/$BACKEND_SERVICE
cd ..

echo ""
echo "🌐 Building and deploying frontend..."
cd frontend
# Note: Update .env.production with backend URL after first deploy
gcloud builds submit --tag gcr.io/$PROJECT_ID/$FRONTEND_SERVICE
cd ..

echo ""
echo "✅ Build complete! Next steps:"
echo "1. Deploy backend: ./deploy-backend.sh"
echo "2. Deploy frontend: ./deploy-frontend.sh"
echo "3. Update frontend API URL and redeploy"





