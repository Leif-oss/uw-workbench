# Next Steps - Google Cloud Deployment

## ✅ Completed
- [x] Google Cloud SDK installed
- [x] Project configured: `ultra-ace-481723-e6`
- [x] User authenticated: `Leif@deanshomer.com`

## ⏳ Required: Enable Billing

**Action Required:** Enable billing for your project before continuing.

1. **Go to Billing Console:**
   https://console.cloud.google.com/billing/linkedaccount?project=ultra-ace-481723-e6

2. **Link a billing account** (or create one if needed)

3. **Verify billing is enabled:**
   ```powershell
   gcloud billing projects describe ultra-ace-481723-e6
   ```

## 📋 After Billing is Enabled

Run these commands in order:

### Step 1: Enable APIs
```powershell
gcloud services enable cloudbuild.googleapis.com run.googleapis.com sql-component.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com containerregistry.googleapis.com artifactregistry.googleapis.com
```

### Step 2: Setup Secrets
```powershell
# Run the automated script (will read from private/.env)
.\setup-secrets.ps1

# Or manually add secrets:
# Add admin password
$adminPass = "your-secure-admin-password"
$adminPass | gcloud secrets versions add admin-password --data-file=-
```

### Step 3: Grant Service Account Access
```powershell
$PROJECT_NUMBER = "944484068966"
$SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding ai-api-key --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding admin-password --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
```

### Step 4: Deploy
```powershell
# Deploy everything with Cloud Build
gcloud builds submit --config cloudbuild.yaml
```

## 📝 Quick Reference

**Project Details:**
- Project ID: `ultra-ace-481723-e6`
- Project Number: `944484068966`
- Region: `us-central1` (default)

**After Deployment:**
- Backend URL: `https://uw-workbench-backend-XXXXX-uc.a.run.app`
- Frontend URL: `https://uw-workbench-frontend-XXXXX-uc.a.run.app`

## 💡 Need Help?

Once billing is enabled, I can run all the deployment steps for you automatically!





