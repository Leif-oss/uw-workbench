# Google Cloud Deployment Guide

This guide walks you through deploying the Underwriter Workbench to Google Cloud Platform.

## Architecture Overview

- **Backend (FastAPI)**: Deployed to Cloud Run
- **Frontend (React)**: Deployed to Cloud Run (served via nginx)
- **Database**: Cloud SQL (PostgreSQL recommended)
- **Secrets**: Secret Manager

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Google Cloud SDK (gcloud)** installed: https://cloud.google.com/sdk/docs/install
3. **Docker** installed (for local testing)
4. **Project initialized** in Google Cloud

## Step 1: Initial Setup

### 1.1 Create a Google Cloud Project

```bash
# Create new project (or use existing)
gcloud projects create uw-workbench --name="Underwriter Workbench"

# Set as active project
gcloud config set project uw-workbench

# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com
```

### 1.2 Enable Billing

Make sure billing is enabled for your project:
- Go to https://console.cloud.google.com/billing
- Link a billing account to your project

## Step 2: Database Setup (Cloud SQL)

### 2.1 Create PostgreSQL Instance

```bash
# Create Cloud SQL PostgreSQL instance
gcloud sql instances create uw-workbench-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_SECURE_PASSWORD

# Create database
gcloud sql databases create workbench --instance=uw-workbench-db

# Create database user
gcloud sql users create workbench_user \
  --instance=uw-workbench-db \
  --password=YOUR_DB_USER_PASSWORD
```

### 2.2 Get Connection Name

```bash
# Get connection name for Cloud SQL
gcloud sql instances describe uw-workbench-db --format="value(connectionName)"
```

Save this connection name - you'll need it later (format: `PROJECT_ID:REGION:INSTANCE_NAME`)

### 2.3 Connection String Format

Your `DATABASE_URL` will be:
```
postgresql://workbench_user:YOUR_DB_USER_PASSWORD@/workbench?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
```

## Step 3: Secrets Management

### 3.1 Store Secrets in Secret Manager

```bash
# Store OpenAI API key
echo -n "sk-your-openai-api-key" | gcloud secrets create ai-api-key --data-file=-

# Store admin password
echo -n "your-secure-admin-password" | gcloud secrets create admin-password --data-file=-

# Store database password
echo -n "YOUR_DB_USER_PASSWORD" | gcloud secrets create db-password --data-file=-
```

### 3.2 Grant Cloud Run Access to Secrets

```bash
# Get your Cloud Run service account email
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant access to secrets
gcloud secrets add-iam-policy-binding ai-api-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding admin-password \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 4: Build and Deploy

### Option A: Using Cloud Build (Recommended)

This automatically builds and deploys when you push to a repository.

#### 4.1 Connect Repository (if using Git)

```bash
# Connect your GitHub repository to Cloud Build
# Or use: gcloud source repos create uw-workbench
```

#### 4.2 Create Cloud Build Trigger

1. Go to Cloud Build > Triggers in Google Cloud Console
2. Create trigger from your repository
3. Use `cloudbuild.yaml` as the configuration file
4. Set up to trigger on pushes to `main` branch

#### 4.3 Manual Build and Deploy

```bash
# Submit build
gcloud builds submit --config cloudbuild.yaml
```

### Option B: Manual Deployment

#### 4.1 Build Backend Image

```bash
cd backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/uw-workbench-backend
```

#### 4.2 Deploy Backend to Cloud Run

```bash
gcloud run deploy uw-workbench-backend \
  --image gcr.io/$PROJECT_ID/uw-workbench-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances PROJECT_ID:REGION:INSTANCE_NAME \
  --set-env-vars "DATABASE_URL=postgresql://workbench_user:$(gcloud secrets versions access latest --secret=db-password)@/workbench?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME" \
  --set-secrets "AI_API_KEY=ai-api-key:latest,ADMIN_PASSWORD=admin-password:latest" \
  --set-env-vars "CORS_ORIGINS=https://uw-workbench-frontend-XXXXX-uc.a.run.app"
```

Note: Update CORS_ORIGINS with your frontend URL after deploying frontend.

#### 4.3 Build Frontend Image

```bash
cd frontend
# Update .env.production or build with API URL
VITE_API_URL=https://uw-workbench-backend-XXXXX-uc.a.run.app npm run build

# Create Docker image
docker build -t gcr.io/$PROJECT_ID/uw-workbench-frontend .

# Push to Container Registry
docker push gcr.io/$PROJECT_ID/uw-workbench-frontend
```

#### 4.4 Deploy Frontend to Cloud Run

```bash
gcloud run deploy uw-workbench-frontend \
  --image gcr.io/$PROJECT_ID/uw-workbench-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Step 5: Environment Variables

### Backend Environment Variables

Set these when deploying:

```bash
gcloud run services update uw-workbench-backend \
  --region us-central1 \
  --update-env-vars "CORS_ORIGINS=https://your-frontend-url" \
  --update-env-vars "ENVIRONMENT=production"
```

Or use a `.env.yaml` file:

```yaml
CORS_ORIGINS: https://your-frontend-url
ENVIRONMENT: production
DATABASE_URL: postgresql://workbench_user:PASSWORD@/workbench?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
```

Then:
```bash
gcloud run services update uw-workbench-backend \
  --region us-central1 \
  --env-vars-file .env.yaml
```

## Step 6: Update Frontend API URL

Before building the frontend, create `frontend/.env.production`:

```env
VITE_API_URL=https://uw-workbench-backend-XXXXX-uc.a.run.app
```

Then rebuild and redeploy the frontend.

## Step 7: Database Migrations

If you're using Alembic for migrations:

```bash
# Connect to Cloud SQL and run migrations
gcloud sql connect uw-workbench-db --user=workbench_user --database=workbench
```

Or run migrations from Cloud Run:

```bash
# Create a migration job
gcloud run jobs create run-migrations \
  --image gcr.io/$PROJECT_ID/uw-workbench-backend \
  --region us-central1 \
  --add-cloudsql-instances PROJECT_ID:REGION:INSTANCE_NAME \
  --set-env-vars "DATABASE_URL=postgresql://..." \
  --command="alembic upgrade head"

# Execute the job
gcloud run jobs execute run-migrations --region us-central1
```

## Step 8: Custom Domain (Optional)

### 8.1 Map Custom Domain

```bash
# Map custom domain to Cloud Run service
gcloud run domain-mappings create \
  --service uw-workbench-frontend \
  --domain yourdomain.com \
  --region us-central1
```

### 8.2 Update DNS

Follow the instructions provided by Google Cloud to update your DNS records.

## Step 9: Monitoring and Logging

### View Logs

```bash
# Backend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=uw-workbench-backend" --limit 50

# Frontend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=uw-workbench-frontend" --limit 50
```

### Set up Alerts

1. Go to Cloud Monitoring in Google Cloud Console
2. Create alerting policies for:
   - High error rates
   - High latency
   - Low availability

## Troubleshooting

### Backend won't start

1. Check logs: `gcloud run services logs read uw-workbench-backend --region us-central1`
2. Verify secrets are accessible
3. Check database connection string
4. Verify Cloud SQL instance is running

### Frontend can't connect to backend

1. Verify `VITE_API_URL` is set correctly
2. Check CORS_ORIGINS includes frontend URL
3. Verify backend is accessible
4. Check browser console for CORS errors

### Database connection issues

1. Verify Cloud SQL instance is running
2. Check connection name format
3. Verify service account has Cloud SQL Client role
4. Test connection from Cloud Shell

### Secret access errors

```bash
# Verify service account has access
gcloud secrets get-iam-policy ai-api-key

# Re-grant access if needed
gcloud secrets add-iam-policy-binding ai-api-key \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

## Cost Optimization

- **Cloud Run**: Pay per request, scales to zero
- **Cloud SQL**: Consider using `db-f1-micro` for dev, upgrade for production
- **Container Registry**: Free for first 5GB storage per month
- **Cloud Build**: Free tier includes 120 build-minutes per day

## Security Checklist

- [ ] All secrets stored in Secret Manager
- [ ] Database password is strong and unique
- [ ] CORS origins configured for production domains only
- [ ] HTTPS enabled (automatic with Cloud Run)
- [ ] Database accessible only from Cloud Run
- [ ] Regular security updates and monitoring
- [ ] API keys rotated regularly

## Quick Commands Reference

```bash
# List services
gcloud run services list

# View service details
gcloud run services describe uw-workbench-backend --region us-central1

# Update service
gcloud run services update uw-workbench-backend --region us-central1

# View logs
gcloud run services logs read uw-workbench-backend --region us-central1 --tail

# Delete service
gcloud run services delete uw-workbench-backend --region us-central1
```

## Next Steps

1. Set up automated backups for Cloud SQL
2. Configure monitoring alerts
3. Set up CI/CD pipeline
4. Configure custom domain
5. Set up staging environment

## Support

For issues or questions:
- Check Cloud Run logs
- Review Cloud SQL logs
- Check Secret Manager permissions
- Verify environment variables are set correctly





