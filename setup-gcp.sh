#!/bin/bash
# Initial Google Cloud setup for UW-WORKBENCH
# Project ID: ultra-ace-481723-e6

set -e

PROJECT_ID="ultra-ace-481723-e6"
PROJECT_NUMBER="944484068966"
REGION="us-central1"

echo "🔧 Setting up Google Cloud for UW-WORKBENCH"
echo "Project ID: $PROJECT_ID"
echo "Project Number: $PROJECT_NUMBER"
echo ""

# Set the active project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "📡 Enabling required APIs..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com \
  artifactregistry.googleapis.com

echo ""
echo "✅ APIs enabled!"

# Create secrets (will prompt for values)
echo ""
echo "🔐 Setting up secrets..."
echo "You'll need to provide values for:"
echo "  1. OpenAI API Key (ai-api-key)"
echo "  2. Admin Password (admin-password)"
echo "  3. Database Password (db-password) - if using Cloud SQL"
echo ""

# Create secrets (user will need to add versions)
gcloud secrets create ai-api-key --replication-policy="automatic" 2>/dev/null || echo "Secret ai-api-key already exists"
gcloud secrets create admin-password --replication-policy="automatic" 2>/dev/null || echo "Secret admin-password already exists"
gcloud secrets create db-password --replication-policy="automatic" 2>/dev/null || echo "Secret db-password already exists"

echo ""
echo "📝 To add secret values, run:"
echo "   echo -n 'YOUR_OPENAI_KEY' | gcloud secrets versions add ai-api-key --data-file=-"
echo "   echo -n 'YOUR_ADMIN_PASSWORD' | gcloud secrets versions add admin-password --data-file=-"
echo "   echo -n 'YOUR_DB_PASSWORD' | gcloud secrets versions add db-password --data-file=-"
echo ""

# Grant Cloud Run service account access to secrets
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "🔑 Granting service account access to secrets..."
gcloud secrets add-iam-policy-binding ai-api-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  2>/dev/null || echo "Policy already set for ai-api-key"

gcloud secrets add-iam-policy-binding admin-password \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  2>/dev/null || echo "Policy already set for admin-password"

gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  2>/dev/null || echo "Policy already set for db-password"

echo ""
echo "✅ Initial setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add secret values (see commands above)"
echo "2. (Optional) Create Cloud SQL instance: ./setup-database.sh"
echo "3. Build and deploy: ./deploy.sh"





