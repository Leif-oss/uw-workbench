# Deploy to Google Cloud - Step by Step

Run these commands **in your PowerShell terminal** (not through the assistant).

## Step 1: Enable Required APIs

```powershell
gcloud services enable cloudbuild.googleapis.com run.googleapis.com sql-component.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com containerregistry.googleapis.com
```

## Step 2: Store Secrets in Secret Manager

You need to store these secrets. Run these commands one by one, replacing the values with your actual credentials:

### Required: OpenAI API Key
```powershell
echo -n "sk-your-actual-openai-key" | gcloud secrets create ai-api-key --data-file=-
```

### Optional: SMTP Settings (for email functionality)
```powershell
# SMTP Host
echo -n "smtp.gmail.com" | gcloud secrets create smtp-host --data-file=-

# SMTP Port
echo -n "587" | gcloud secrets create smtp-port --data-file=-

# SMTP User/Email
echo -n "your-email@gmail.com" | gcloud secrets create smtp-user --data-file=-

# SMTP Password (use app password for Gmail)
echo -n "your-app-password" | gcloud secrets create smtp-password --data-file=-

# From Email
echo -n "your-email@gmail.com" | gcloud secrets create smtp-from-email --data-file=-

# From Name
echo -n "UW Workbench" | gcloud secrets create smtp-from-name --data-file=-
```

**Note:** If a secret already exists, you'll get an error. That's okay - it means it's already stored.

## Step 3: Grant Service Account Access

```powershell
$PROJECT_ID = "ultra-ace-481723-e6"
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

# Grant access to secrets
gcloud secrets add-iam-policy-binding ai-api-key --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"

# If you created SMTP secrets, grant access to those too:
gcloud secrets add-iam-policy-binding smtp-host --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding smtp-port --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding smtp-user --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding smtp-password --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding smtp-from-email --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding smtp-from-name --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
```

## Step 4: Build Docker Image

This will take 5-10 minutes:

```powershell
$PROJECT_ID = "ultra-ace-481723-e6"
$IMAGE = "gcr.io/$PROJECT_ID/uw-workbench-backend"

gcloud builds submit --tag $IMAGE ./backend
```

## Step 5: Deploy to Cloud Run

### Option A: Without SMTP (Simpler - email won't work but everything else will)

```powershell
$PROJECT_ID = "ultra-ace-481723-e6"
$REGION = "us-central1"
$SERVICE_NAME = "uw-workbench-backend"
$IMAGE = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

gcloud run deploy $SERVICE_NAME `
  --image $IMAGE `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --memory 512Mi `
  --cpu 1 `
  --timeout 300 `
  --max-instances 10 `
  --set-env-vars "ENVIRONMENT=production" `
  --set-secrets "AI_API_KEY=ai-api-key:latest"
```

### Option B: With SMTP (Full functionality)

```powershell
$PROJECT_ID = "ultra-ace-481723-e6"
$REGION = "us-central1"
$SERVICE_NAME = "uw-workbench-backend"
$IMAGE = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

gcloud run deploy $SERVICE_NAME `
  --image $IMAGE `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --memory 512Mi `
  --cpu 1 `
  --timeout 300 `
  --max-instances 10 `
  --set-env-vars "ENVIRONMENT=production" `
  --set-secrets "AI_API_KEY=ai-api-key:latest,SMTP_HOST=smtp-host:latest,SMTP_PORT=smtp-port:latest,SMTP_USER=smtp-user:latest,SMTP_PASSWORD=smtp-password:latest,SMTP_FROM_EMAIL=smtp-from-email:latest,SMTP_FROM_NAME=smtp-from-name:latest"
```

## Step 6: Get Your Service URL

```powershell
$REGION = "us-central1"
$SERVICE_NAME = "uw-workbench-backend"

gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)"
```

## Step 7: Test Your Deployment

Open the URL from Step 6 in your browser and add `/health` to test:
```
https://YOUR-SERVICE-URL/health
```

You should see: `{"status":"ok","db":"reachable"}`

## Troubleshooting

### View Logs
```powershell
gcloud run services logs read uw-workbench-backend --region us-central1 --tail
```

### Update CORS (after deploying frontend)
```powershell
gcloud run services update uw-workbench-backend `
  --update-env-vars "CORS_ORIGINS=https://your-frontend-url.com" `
  --region us-central1
```

### Redeploy After Code Changes
```powershell
$PROJECT_ID = "ultra-ace-481723-e6"
$IMAGE = "gcr.io/$PROJECT_ID/uw-workbench-backend"

# Rebuild
gcloud builds submit --tag $IMAGE ./backend

# Redeploy
gcloud run deploy uw-workbench-backend --image $IMAGE --region us-central1
```



