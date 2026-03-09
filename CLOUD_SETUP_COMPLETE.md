# Cloud Setup - Completion Summary

## What Was Completed

I've finished setting up the cloud deployment configuration for your UW Workbench application. Here's what was done:

### ✅ Files Updated

1. **`cloudbuild.yaml`** - Updated to include:
   - All SMTP secrets in backend deployment
   - Proper resource allocation (CPU, memory, timeout, max instances)
   - Sequential deployment (backend first, then frontend)

2. **`frontend/Dockerfile`** - Fixed to:
   - Use build arguments properly for API URL
   - Default to localhost for local development

### ✅ New Files Created

1. **`verify-cloud-deployment.ps1`** - Comprehensive verification script that checks:
   - Required APIs are enabled
   - All secrets exist and are accessible
   - Service account permissions
   - Backend and frontend services are deployed
   - Health endpoints are responding
   - CORS configuration

2. **`complete-cloud-setup.ps1`** - Interactive script to finish setup:
   - Checks current deployment status
   - Updates CORS configuration
   - Helps deploy frontend if missing
   - Verifies and sets up missing secrets
   - Updates backend with SMTP secrets
   - Performs final verification

3. **`CLOUD_SETUP_CHECKLIST.md`** - Complete step-by-step checklist for:
   - Initial setup
   - API enablement
   - Secret management
   - Service deployment
   - Configuration
   - Troubleshooting

## How to Use

### Quick Start - Complete Setup

Run the completion script to finish your cloud setup:

```powershell
.\complete-cloud-setup.ps1
```

This script will:
- Check what's already deployed
- Help you set up missing secrets
- Deploy frontend if needed
- Update CORS configuration
- Verify everything works

### Verify Deployment

After setup, verify everything is working:

```powershell
.\verify-cloud-deployment.ps1
```

### Manual Setup

If you prefer manual setup, follow the checklist:

```powershell
# Open and follow:
CLOUD_SETUP_CHECKLIST.md
```

## Key Configuration Details

### Secrets Required

**Required:**
- `ai-api-key` - OpenAI API key

**SMTP (Required for email):**
- `smtp-host` - SMTP server (e.g., smtp.gmail.com)
- `smtp-port` - SMTP port (e.g., 587)
- `smtp-user` - SMTP username/email
- `smtp-password` - SMTP password (Gmail App Password - 16 chars)
- `smtp-from-email` - From email address
- `smtp-from-name` - From name (e.g., "UW Workbench")

### Backend Configuration

The backend is configured with:
- Memory: 512Mi
- CPU: 1
- Timeout: 300 seconds
- Max instances: 10
- All SMTP secrets mapped from Secret Manager

### Frontend Configuration

The frontend:
- Memory: 256Mi
- Uses nginx to serve static files
- Requires backend URL at build time

## Deployment Workflow

### Option 1: Using Cloud Build (CI/CD)

1. Push to your repository
2. Cloud Build automatically:
   - Builds backend image
   - Deploys backend to Cloud Run
   - Builds frontend image (with backend URL)
   - Deploys frontend to Cloud Run

**Note:** For the first deployment, you may need to manually set the backend URL for the frontend build, or use substitution variables in Cloud Build.

### Option 2: Manual Deployment

1. **Deploy Backend:**
   ```powershell
   .\deploy-to-gcp.ps1
   ```

2. **Deploy Frontend:**
   ```powershell
   # Get backend URL first
   $BACKEND_URL = gcloud run services describe uw-workbench-backend --region=us-central1 --format="value(status.url)"
   
   # Build and deploy frontend
   cd frontend
   docker build --build-arg VITE_API_URL=$BACKEND_URL -t gcr.io/YOUR_PROJECT_ID/uw-workbench-frontend .
   docker push gcr.io/YOUR_PROJECT_ID/uw-workbench-frontend
   gcloud run deploy uw-workbench-frontend --image gcr.io/YOUR_PROJECT_ID/uw-workbench-frontend --region us-central1 --allow-unauthenticated
   ```

3. **Update CORS:**
   ```powershell
   $FRONTEND_URL = gcloud run services describe uw-workbench-frontend --region=us-central1 --format="value(status.url)"
   gcloud run services update uw-workbench-backend --region=us-central1 --update-env-vars="CORS_ORIGINS=$FRONTEND_URL"
   ```

## Common Tasks

### Update Secrets

```powershell
# Add new version to existing secret
echo -n "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-
```

### View Logs

```powershell
# Backend logs
gcloud run services logs read uw-workbench-backend --region us-central1 --tail

# Frontend logs
gcloud run services logs read uw-workbench-frontend --region us-central1 --tail
```

### Update Environment Variables

```powershell
gcloud run services update uw-workbench-backend `
  --region us-central1 `
  --update-env-vars "KEY=VALUE"
```

### Get Service URLs

```powershell
# Backend
gcloud run services describe uw-workbench-backend --region us-central1 --format="value(status.url)"

# Frontend
gcloud run services describe uw-workbench-frontend --region us-central1 --format="value(status.url)"
```

## Troubleshooting

### Backend won't start
- Check logs: `gcloud run services logs read uw-workbench-backend --region us-central1 --tail`
- Verify secrets exist and are accessible
- Check service account permissions

### Frontend can't connect
- Verify CORS_ORIGINS includes frontend URL
- Check backend URL in frontend build
- Verify backend is accessible

### Email not working
- Verify SMTP secrets are stored correctly
- Check Gmail App Password (must be 16 characters)
- Review backend logs for SMTP errors

### Secret access errors
- Verify service account has Secret Accessor role
- Check secret names match exactly (case-sensitive)
- Ensure secrets exist: `gcloud secrets list`

## Next Steps

1. ✅ Run `.\complete-cloud-setup.ps1` to finish setup
2. ✅ Run `.\verify-cloud-deployment.ps1` to verify everything
3. Test the application
4. Set up monitoring and alerts
5. Configure custom domain (optional)
6. Set up automated backups (if using Cloud SQL)

## Support

If you encounter issues:
1. Check the verification script output
2. Review Cloud Run logs
3. Verify secrets and permissions
4. Check the checklist: `CLOUD_SETUP_CHECKLIST.md`



