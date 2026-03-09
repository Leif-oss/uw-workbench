# Cloud Deployment Setup Checklist

Use this checklist to ensure your cloud deployment is complete and properly configured.

## Prerequisites

- [ ] Google Cloud account with billing enabled
- [ ] Google Cloud SDK (gcloud) installed and authenticated
- [ ] Project created in Google Cloud Console
- [ ] Project ID noted: `_________________`

## Step 1: Initial Setup

- [ ] Set GCP project: `gcloud config set project YOUR_PROJECT_ID`
- [ ] Verify project: `gcloud config get-value project`

## Step 2: Enable Required APIs

Run this command or use the script:
```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com \
  --project=YOUR_PROJECT_ID
```

- [ ] All APIs enabled (verify with `gcloud services list --enabled`)

## Step 3: Store Secrets in Secret Manager

### Required Secrets

- [ ] **AI_API_KEY**: OpenAI API key
  ```bash
  echo -n "sk-your-key" | gcloud secrets create ai-api-key --data-file=-
  ```

### SMTP Secrets (Required for email functionality)

- [ ] **smtp-host**: SMTP server (e.g., `smtp.gmail.com`)
  ```bash
  echo -n "smtp.gmail.com" | gcloud secrets create smtp-host --data-file=-
  ```

- [ ] **smtp-port**: SMTP port (e.g., `587`)
  ```bash
  echo -n "587" | gcloud secrets create smtp-port --data-file=-
  ```

- [ ] **smtp-user**: SMTP username/email
  ```bash
  echo -n "your-email@gmail.com" | gcloud secrets create smtp-user --data-file=-
  ```

- [ ] **smtp-password**: SMTP password (Gmail App Password - 16 characters)
  ```bash
  echo -n "your-16-char-password" | gcloud secrets create smtp-password --data-file=-
  ```

- [ ] **smtp-from-email**: From email address
  ```bash
  echo -n "your-email@gmail.com" | gcloud secrets create smtp-from-email --data-file=-
  ```

- [ ] **smtp-from-name**: From name (e.g., `UW Workbench`)
  ```bash
  echo -n "UW Workbench" | gcloud secrets create smtp-from-name --data-file=-
  ```

### Optional: Database Secrets (if using Cloud SQL)

- [ ] **db-password**: Database user password
  ```bash
  echo -n "your-db-password" | gcloud secrets create db-password --data-file=-
  ```

## Step 4: Grant Service Account Permissions

Get your service account:
```bash
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
```

Grant access to each secret:
```bash
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=YOUR_PROJECT_ID
```

- [ ] AI_API_KEY access granted
- [ ] smtp-host access granted
- [ ] smtp-port access granted
- [ ] smtp-user access granted
- [ ] smtp-password access granted
- [ ] smtp-from-email access granted
- [ ] smtp-from-name access granted
- [ ] db-password access granted (if using Cloud SQL)

If using Cloud SQL:
- [ ] Cloud SQL Client role granted:
  ```bash
  gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/cloudsql.client"
  ```

## Step 5: Deploy Backend

### Option A: Using Deployment Script (Recommended)

- [ ] Run: `.\deploy-to-gcp.ps1`
- [ ] Follow prompts to complete deployment

### Option B: Manual Deployment

- [ ] Build image:
  ```bash
  gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/uw-workbench-backend ./backend
  ```

- [ ] Deploy to Cloud Run:
  ```bash
  gcloud run deploy uw-workbench-backend \
    --image gcr.io/YOUR_PROJECT_ID/uw-workbench-backend \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --timeout 300 \
    --max-instances 10 \
    --set-secrets "AI_API_KEY=ai-api-key:latest,SMTP_HOST=smtp-host:latest,SMTP_PORT=smtp-port:latest,SMTP_USER=smtp-user:latest,SMTP_PASSWORD=smtp-password:latest,SMTP_FROM_EMAIL=smtp-from-email:latest,SMTP_FROM_NAME=smtp-from-name:latest" \
    --set-env-vars "ENVIRONMENT=production"
  ```

- [ ] Note backend URL: `_________________`

## Step 6: Deploy Frontend

- [ ] Get backend URL:
  ```bash
  BACKEND_URL=$(gcloud run services describe uw-workbench-backend --region=us-central1 --format="value(status.url)")
  ```

- [ ] Build frontend with backend URL:
  ```bash
  cd frontend
  docker build --build-arg VITE_API_URL=$BACKEND_URL -t gcr.io/YOUR_PROJECT_ID/uw-workbench-frontend .
  ```

- [ ] Push image:
  ```bash
  docker push gcr.io/YOUR_PROJECT_ID/uw-workbench-frontend
  ```

- [ ] Deploy to Cloud Run:
  ```bash
  gcloud run deploy uw-workbench-frontend \
    --image gcr.io/YOUR_PROJECT_ID/uw-workbench-frontend \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --memory 256Mi
  ```

- [ ] Note frontend URL: `_________________`

## Step 7: Configure CORS

- [ ] Update backend CORS with frontend URL:
  ```bash
  gcloud run services update uw-workbench-backend \
    --region us-central1 \
    --update-env-vars "CORS_ORIGINS=FRONTEND_URL"
  ```

## Step 8: Verify Deployment

- [ ] Run verification script: `.\verify-cloud-deployment.ps1`
- [ ] Test backend health: `curl BACKEND_URL/health`
- [ ] Test frontend: Open `FRONTEND_URL` in browser
- [ ] Test login functionality
- [ ] Test email sending (create a new user)

## Step 9: Database Setup (Optional - if using Cloud SQL)

- [ ] Create Cloud SQL instance:
  ```bash
  gcloud sql instances create uw-workbench-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --root-password=YOUR_ROOT_PASSWORD
  ```

- [ ] Create database:
  ```bash
  gcloud sql databases create workbench --instance=uw-workbench-db
  ```

- [ ] Create database user:
  ```bash
  gcloud sql users create workbench_user \
    --instance=uw-workbench-db \
    --password=USER_PASSWORD
  ```

- [ ] Get connection name:
  ```bash
  gcloud sql instances describe uw-workbench-db --format="value(connectionName)"
  ```

- [ ] Update backend deployment with Cloud SQL:
  ```bash
  gcloud run services update uw-workbench-backend \
    --region us-central1 \
    --add-cloudsql-instances CONNECTION_NAME \
    --set-env-vars "CLOUD_SQL_CONNECTION_NAME=CONNECTION_NAME,DB_USER=workbench_user,DB_NAME=workbench" \
    --set-secrets "DB_PASSWORD=db-password:latest"
  ```

- [ ] Run database migrations (if using Alembic)

## Step 10: Final Checks

- [ ] Backend is accessible and responding
- [ ] Frontend can connect to backend (no CORS errors)
- [ ] Authentication works
- [ ] Email sending works (test with new user creation)
- [ ] Database connection works (if using Cloud SQL)
- [ ] Logs are accessible: `gcloud run services logs read uw-workbench-backend --region us-central1`

## Troubleshooting

### Backend won't start
- Check logs: `gcloud run services logs read uw-workbench-backend --region us-central1 --tail`
- Verify secrets are accessible
- Check database connection (if using Cloud SQL)

### Frontend can't connect to backend
- Verify CORS_ORIGINS includes frontend URL
- Check backend URL in frontend build
- Verify backend is accessible

### Email not working
- Verify SMTP secrets are stored correctly
- Check SMTP credentials (especially Gmail App Password)
- Review backend logs for SMTP errors

### Secret access errors
- Verify service account has Secret Accessor role
- Check secret names match exactly (case-sensitive)
- Ensure secrets exist: `gcloud secrets list`

## Quick Reference

### View Service URLs
```bash
# Backend
gcloud run services describe uw-workbench-backend --region us-central1 --format="value(status.url)"

# Frontend
gcloud run services describe uw-workbench-frontend --region us-central1 --format="value(status.url)"
```

### View Logs
```bash
# Backend logs
gcloud run services logs read uw-workbench-backend --region us-central1 --tail

# Frontend logs
gcloud run services logs read uw-workbench-frontend --region us-central1 --tail
```

### Update Environment Variables
```bash
gcloud run services update uw-workbench-backend \
  --region us-central1 \
  --update-env-vars "KEY=VALUE"
```

### Update Secrets
```bash
# Add new version to existing secret
echo -n "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-
```

## Next Steps After Deployment

1. Set up monitoring and alerts
2. Configure custom domain (optional)
3. Set up automated backups (if using Cloud SQL)
4. Configure CI/CD pipeline (Cloud Build)
5. Review security settings
6. Set up staging environment (optional)



