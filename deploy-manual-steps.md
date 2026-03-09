# Manual Deployment Steps

Since authentication is local to your machine, run these commands **one at a time** in your PowerShell terminal and let me know the result of each step.

## Step 1: Verify Authentication

```powershell
gcloud auth list
gcloud config get-value project
```

**Expected:** You should see your account and project ID.

## Step 2: Enable APIs

Run these one at a time:

```powershell
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

**Tell me when this is done** and I'll give you the next step.

## Step 3: Store OpenAI API Key

```powershell
# Replace sk-your-key with your actual key
echo -n "sk-your-actual-openai-key" | gcloud secrets create ai-api-key --data-file=-
```

If you get an error that the secret already exists, that's okay - it means it's already stored.

**Tell me when this is done.**

## Step 4: Grant Permissions

```powershell
$PROJECT_ID = "ultra-ace-481723-e6"
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding ai-api-key --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
```

**Tell me when this is done.**

## Step 5: Build Docker Image

```powershell
$PROJECT_ID = "ultra-ace-481723-e6"
$IMAGE = "gcr.io/$PROJECT_ID/uw-workbench-backend"

gcloud builds submit --tag $IMAGE ./backend
```

This takes 5-10 minutes. **Tell me when it's done.**

## Step 6: Deploy to Cloud Run

```powershell
$PROJECT_ID = "ultra-ace-481723-e6"
$REGION = "us-central1"
$SERVICE_NAME = "uw-workbench-backend"
$IMAGE = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

gcloud run deploy $SERVICE_NAME --image $IMAGE --platform managed --region $REGION --allow-unauthenticated --memory 512Mi --cpu 1 --timeout 300 --max-instances 10 --set-env-vars "ENVIRONMENT=production" --set-secrets "AI_API_KEY=ai-api-key:latest"
```

**Tell me when this is done and I'll help you get the URL!**



