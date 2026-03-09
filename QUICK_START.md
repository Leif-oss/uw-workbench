# Quick Start Guide - Google Cloud Deployment

**Project ID:** `ultra-ace-481723-e6`  
**Project Number:** `944484068966`  
**Project Name:** UW-WORKBENCH

## Prerequisites

1. **Install Google Cloud SDK**
   - Download: https://cloud.google.com/sdk/docs/install
   - Authenticate: `gcloud auth login`

2. **Enable Billing**
   - Ensure billing is enabled in Google Cloud Console

## Quick Deployment (3 Steps)

### Step 1: Initial Setup

Run the setup script to enable APIs and configure secrets:

```bash
# Make scripts executable (Mac/Linux)
chmod +x *.sh

# Run setup
./setup-gcp.sh
```

Then add your secret values:

```bash
# Add OpenAI API key
echo -n 'sk-your-openai-api-key' | gcloud secrets versions add ai-api-key --data-file=-

# Add admin password
echo -n 'your-secure-admin-password' | gcloud secrets versions add admin-password --data-file=-
```

### Step 2: (Optional) Setup Database

If you want to use Cloud SQL PostgreSQL instead of SQLite:

```bash
./setup-database.sh
```

This will:
- Create a PostgreSQL instance
- Create database and user
- Store password in Secret Manager
- Provide connection details

### Step 3: Deploy Application

**Option A: Use Cloud Build (Recommended)**

```bash
# Submit build (builds both frontend and backend)
gcloud builds submit --config cloudbuild.yaml
```

**Option B: Manual Deployment**

```bash
# Build and deploy backend
./deploy-backend.sh

# Build and deploy frontend
./deploy-frontend.sh
```

## After Deployment

1. **Get your URLs:**
   ```bash
   gcloud run services list --region us-central1
   ```

2. **Update Backend CORS:**
   After deploying frontend, update backend CORS_ORIGINS:
   ```bash
   gcloud run services update uw-workbench-backend \
     --region us-central1 \
     --update-env-vars "CORS_ORIGINS=https://YOUR-FRONTEND-URL"
   ```

3. **Update Frontend API URL:**
   - Edit `frontend/.env.production`
   - Set `VITE_API_URL` to your backend URL
   - Rebuild and redeploy frontend

## Scripts Reference

- `setup-gcp.sh` - Initial Google Cloud setup (APIs, secrets)
- `setup-database.sh` - Create Cloud SQL database
- `deploy-backend.sh` - Deploy backend to Cloud Run
- `deploy-frontend.sh` - Deploy frontend to Cloud Run
- `cloudbuild.yaml` - Automated CI/CD configuration

## Important URLs

After deployment, your services will be available at:
- Backend: `https://uw-workbench-backend-XXXXX-uc.a.run.app`
- Frontend: `https://uw-workbench-frontend-XXXXX-uc.a.run.app`

## Troubleshooting

### Check Logs
```bash
# Backend logs
gcloud run services logs read uw-workbench-backend --region us-central1 --tail

# Frontend logs
gcloud run services logs read uw-workbench-frontend --region us-central1 --tail
```

### View Services
```bash
gcloud run services list --region us-central1
```

### Update Environment Variables
```bash
gcloud run services update uw-workbench-backend \
  --region us-central1 \
  --update-env-vars "KEY=VALUE"
```

## Cost Estimate

- **Cloud Run**: Free tier includes 2 million requests/month
- **Cloud SQL db-f1-micro**: ~$7-8/month
- **Container Registry**: Free for first 5GB storage
- **Cloud Build**: Free tier includes 120 build-minutes/day

**Estimated monthly cost:** ~$7-10 (excluding Cloud SQL if using SQLite)

## Security Checklist

- [ ] Secrets stored in Secret Manager
- [ ] Billing alerts configured
- [ ] Database backups enabled (if using Cloud SQL)
- [ ] CORS origins restricted to production domains
- [ ] HTTPS enabled (automatic with Cloud Run)

## Need Help?

See `DEPLOYMENT.md` for detailed instructions and troubleshooting.





