# Quick Deployment Guide - Google Cloud

## Prerequisites Checklist

- [ ] Google Cloud account with billing enabled
- [ ] Google Cloud SDK installed (`gcloud --version`)
- [ ] Authenticated with GCP (`gcloud auth login`)
- [ ] Project created in GCP Console

## Option 1: Automated Deployment (Recommended)

Run the PowerShell script:

```powershell
.\deploy-to-gcp.ps1
```

The script will guide you through:
1. Project setup
2. API enablement
3. Database creation (optional)
4. Secret storage
5. Service account permissions
6. Build and deployment

## Option 2: Manual Step-by-Step

### 1. Set Project

```bash
gcloud config set project YOUR_PROJECT_ID
```

### 2. Enable APIs

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com
```

### 3. Create Cloud SQL (Optional - can use SQLite for testing)

```bash
# Create instance (takes 5-10 minutes)
gcloud sql instances create uw-workbench-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_SECURE_PASSWORD

# Create database
gcloud sql databases create workbench --instance=uw-workbench-db

# Create user
gcloud sql users create workbench_user \
  --instance=uw-workbench-db \
  --password=USER_PASSWORD

# Get connection name
gcloud sql instances describe uw-workbench-db --format="value(connectionName)"
```

### 4. Store Secrets

```bash
# OpenAI API Key
echo -n "sk-your-key" | gcloud secrets create ai-api-key --data-file=-

# SMTP Settings
echo -n "smtp.gmail.com" | gcloud secrets create smtp-host --data-file=-
echo -n "587" | gcloud secrets create smtp-port --data-file=-
echo -n "your-email@gmail.com" | gcloud secrets create smtp-user --data-file=-
echo -n "your-app-password" | gcloud secrets create smtp-password --data-file=-
echo -n "your-email@gmail.com" | gcloud secrets create smtp-from-email --data-file=-
echo -n "UW Workbench" | gcloud secrets create smtp-from-name --data-file=-

# Database password (if using Cloud SQL)
echo -n "USER_PASSWORD" | gcloud secrets create db-password --data-file=-
```

### 5. Grant Permissions

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant secret access
gcloud secrets add-iam-policy-binding ai-api-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

# Repeat for all secrets...

# Grant Cloud SQL access (if using)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudsql.client"
```

### 6. Build and Deploy

```bash
PROJECT_ID="your-project-id"
REGION="us-central1"
SERVICE_NAME="uw-workbench-backend"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Build
gcloud builds submit --tag $IMAGE ./backend

# Deploy (without Cloud SQL - uses SQLite)
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --set-env-vars "ENVIRONMENT=production" \
  --set-secrets "AI_API_KEY=ai-api-key:latest,SMTP_HOST=smtp-host:latest,SMTP_PORT=smtp-port:latest,SMTP_USER=smtp-user:latest,SMTP_PASSWORD=smtp-password:latest,SMTP_FROM_EMAIL=smtp-from-email:latest,SMTP_FROM_NAME=smtp-from-name:latest"

# Deploy (with Cloud SQL)
CONNECTION_NAME="PROJECT_ID:REGION:INSTANCE_NAME"
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --add-cloudsql-instances $CONNECTION_NAME \
  --set-env-vars "ENVIRONMENT=production,CLOUD_SQL_CONNECTION_NAME=$CONNECTION_NAME,DB_USER=workbench_user,DB_NAME=workbench" \
  --set-secrets "AI_API_KEY=ai-api-key:latest,DB_PASSWORD=db-password:latest,SMTP_HOST=smtp-host:latest,SMTP_PORT=smtp-port:latest,SMTP_USER=smtp-user:latest,SMTP_PASSWORD=smtp-password:latest,SMTP_FROM_EMAIL=smtp-from-email:latest,SMTP_FROM_NAME=smtp-from-name:latest"
```

### 7. Get Service URL

```bash
gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)"
```

## Testing Deployment

1. **Health Check:**
   ```bash
   curl https://YOUR-SERVICE-URL/health
   ```

2. **View Logs:**
   ```bash
   gcloud run services logs read $SERVICE_NAME --region=$REGION --tail
   ```

3. **Update Environment Variables:**
   ```bash
   gcloud run services update $SERVICE_NAME \
     --update-env-vars "CORS_ORIGINS=https://your-frontend-url.com" \
     --region $REGION
   ```

## Updating After Changes

### Quick Update (Code Changes)

```bash
# Rebuild and redeploy
gcloud builds submit --tag gcr.io/$PROJECT_ID/uw-workbench-backend ./backend
gcloud run deploy uw-workbench-backend --image gcr.io/$PROJECT_ID/uw-workbench-backend --region us-central1
```

### Using Cloud Build (CI/CD)

Push to your repository and Cloud Build will automatically build and deploy if configured.

## Troubleshooting

### Service won't start
- Check logs: `gcloud run services logs read uw-workbench-backend --region us-central1`
- Verify secrets are accessible
- Check database connection

### Database connection issues
- Verify Cloud SQL instance is running
- Check connection name format
- Verify service account has Cloud SQL Client role

### Secret access errors
- Verify service account has Secret Manager Secret Accessor role
- Check secret names match exactly

## Cost Estimate

- **Cloud Run**: ~$0.40 per million requests (free tier: 2 million/month)
- **Cloud SQL (db-f1-micro)**: ~$7-10/month
- **Secret Manager**: Free (within limits)
- **Cloud Build**: 120 free build-minutes/day

**Total**: ~$10-20/month for staging/testing



