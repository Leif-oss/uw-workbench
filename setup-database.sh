#!/bin/bash
# Setup Cloud SQL PostgreSQL database
# Project ID: ultra-ace-481723-e6

set -e

PROJECT_ID="ultra-ace-481723-e6"
REGION="us-central1"
DB_INSTANCE="uw-workbench-db"
DB_NAME="workbench"
DB_USER="workbench_user"

echo "🗄️  Setting up Cloud SQL database..."
echo "Project ID: $PROJECT_ID"
echo "Instance: $DB_INSTANCE"
echo ""

# Check if instance already exists
if gcloud sql instances describe $DB_INSTANCE &>/dev/null; then
  echo "⚠️  Database instance $DB_INSTANCE already exists"
  read -p "Continue with database setup? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  echo "📦 Creating Cloud SQL PostgreSQL instance..."
  echo "This may take a few minutes..."
  
  gcloud sql instances create $DB_INSTANCE \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=$REGION \
    --root-password=$(openssl rand -base64 32)
  
  echo "✅ Instance created!"
fi

# Create database
echo ""
echo "📁 Creating database: $DB_NAME"
gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE 2>/dev/null || echo "Database $DB_NAME already exists"

# Create user
echo ""
echo "👤 Creating database user: $DB_USER"
echo "Enter password for database user (or press Enter to generate one):"
read -s DB_USER_PASSWORD

if [ -z "$DB_USER_PASSWORD" ]; then
  DB_USER_PASSWORD=$(openssl rand -base64 32)
  echo "Generated password: $DB_USER_PASSWORD"
  echo "⚠️  Save this password securely!"
fi

gcloud sql users create $DB_USER \
  --instance=$DB_INSTANCE \
  --password=$DB_USER_PASSWORD 2>/dev/null || \
  gcloud sql users set-password $DB_USER \
    --instance=$DB_INSTANCE \
    --password=$DB_USER_PASSWORD

# Store password in Secret Manager
echo ""
echo "💾 Storing database password in Secret Manager..."
echo -n "$DB_USER_PASSWORD" | gcloud secrets versions add db-password --data-file=-

# Get connection name
CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE --format="value(connectionName)")

echo ""
echo "✅ Database setup complete!"
echo ""
echo "📋 Connection details:"
echo "   Connection Name: $CONNECTION_NAME"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Connection String: postgresql://$DB_USER:PASSWORD@/$DB_NAME?host=/cloudsql/$CONNECTION_NAME"
echo ""
echo "⚠️  Remember to:"
echo "   1. Update deploy-backend.sh with connection name: $CONNECTION_NAME"
echo "   2. Password has been stored in Secret Manager"
echo "   3. Database password: $DB_USER_PASSWORD (save this securely!)"





