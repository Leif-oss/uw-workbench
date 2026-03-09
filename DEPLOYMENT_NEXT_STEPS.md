# Next Steps - Cloud Deployment Fixes

## ✅ Fixes Applied

1. **Database SQLite Fallback Issue** - Fixed in `backend/database.py`
   - No longer falls back to SQLite in production
   - Will fail to start if Cloud SQL connection fails (prevents data loss)

2. **Email Logging** - Enhanced in `backend/services/email.py`
   - Better error messages and configuration logging

3. **Cleanup Endpoint Safety** - Added in `backend/routers/admin.py`
   - Requires `ENABLE_CLEANUP_ENDPOINT=true` in production

4. **Cloud Build Configuration** - Updated `cloudbuild.yaml`
   - Added Cloud SQL connection configuration
   - Added DB_PASSWORD secret
   - Added database environment variables

## 📋 Pre-Deployment Checklist

### 1. Verify Cloud SQL Instance

```powershell
# List Cloud SQL instances
gcloud sql instances list

# Note the connection name (format: PROJECT:REGION:INSTANCE)
# Example: my-project:us-central1:uw-workbench-db
```

**Action Items:**
- [ ] Cloud SQL instance exists
- [ ] Instance is running
- [ ] Note the connection name for cloudbuild.yaml

### 2. Update cloudbuild.yaml

Update the Cloud SQL instance name in `cloudbuild.yaml`:

```yaml
- '--add-cloudsql-instances'
- 'YOUR_PROJECT_ID:us-central1:YOUR_INSTANCE_NAME'
```

Or use a substitution variable:
1. Set substitution variable in Cloud Build trigger
2. Use `$${_CLOUD_SQL_INSTANCE}` in cloudbuild.yaml

**Action Items:**
- [ ] Update Cloud SQL instance name in cloudbuild.yaml
- [ ] Verify the instance connection name format is correct

### 3. Verify Secrets in Secret Manager

```powershell
# Run the configuration checker
.\check-cloud-config.ps1

# Or manually check secrets
gcloud secrets list
```

**Required Secrets:**
- [ ] `ai-api-key` - OpenAI API key
- [ ] `smtp-host` - SMTP server hostname
- [ ] `smtp-port` - SMTP port (587 or 465)
- [ ] `smtp-user` - SMTP username
- [ ] `smtp-password` - SMTP password or app password
- [ ] `smtp-from-email` - From email address
- [ ] `smtp-from-name` - From name (e.g., "UW Workbench")
- [ ] `db-password` - Cloud SQL database password

### 4. Verify Database Secrets

```powershell
# Create db-password secret if it doesn't exist
# (if you haven't already)
echo "your-db-password" | gcloud secrets create db-password --data-file=-

# Grant Cloud Run service account access
$PROJECT_NUMBER = gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)"
$SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
gcloud secrets add-iam-policy-binding db-password --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
```

### 5. Test Configuration Locally

```powershell
# Run the diagnostic script
python backend/check_cloud_config.py
```

This checks:
- Environment variables
- Database connection
- Email configuration
- DNS resolution

## 🚀 Deployment Steps

### Step 1: Deploy Updated Code

```powershell
# Build and deploy using Cloud Build
gcloud builds submit --config cloudbuild.yaml

# Or if you have a trigger set up, just push to your repository
```

### Step 2: Verify Deployment

```powershell
# Run the test script
.\test-cloud-deployment.ps1

# Or manually check
gcloud run services describe uw-workbench-backend --region us-central1
```

### Step 3: Check Logs

```powershell
# Watch logs for errors
gcloud run services logs tail uw-workbench-backend --region us-central1

# Look for:
# ✓ "Successfully connected to Cloud SQL PostgreSQL"
# ✗ "Database connection failed in production"
# ✗ "Email not configured"
```

### Step 4: Test Critical Functions

1. **Test Database Persistence:**
   - [ ] Create a test user in admin panel
   - [ ] Wait a few hours OR restart Cloud Run service
   - [ ] Verify user still exists (should NOT be deleted)

2. **Test Email:**
   - [ ] Try password reset functionality
   - [ ] Check logs for email sending status
   - [ ] Verify email is received

3. **Monitor for 24 Hours:**
   - [ ] Watch logs for database connection errors
   - [ ] Verify users persist across container restarts
   - [ ] Check email functionality is working

## 🔍 Troubleshooting

### Database Connection Fails

**Error:** `"Database connection failed in production"`

**Check:**
1. Cloud SQL instance is running
2. Cloud Run service has Cloud SQL connection configured
3. `CLOUD_SQL_CONNECTION_NAME` environment variable is set correctly
4. Connection name format: `PROJECT:REGION:INSTANCE`

**Fix:**
```powershell
# Add Cloud SQL connection to existing service
gcloud run services update uw-workbench-backend `
  --region us-central1 `
  --add-cloudsql-instances PROJECT:REGION:INSTANCE

# Set database environment variables
gcloud run services update uw-workbench-backend `
  --region us-central1 `
  --set-env-vars="CLOUD_SQL_CONNECTION_NAME=PROJECT:REGION:INSTANCE,DB_USER=postgres,DB_NAME=uw_workbench" `
  --update-secrets="DB_PASSWORD=db-password:latest"
```

### Emails Not Sending

**Check:**
1. SMTP secrets are set in Secret Manager
2. Secrets are accessible to Cloud Run service account
3. SMTP server is accessible from Cloud Run
4. Using App Password for Gmail (not regular password)

**Fix:**
```powershell
# Update SMTP secrets
echo "smtp.gmail.com" | gcloud secrets create smtp-host --data-file=-
echo "587" | gcloud secrets create smtp-port --data-file=-
echo "your-email@gmail.com" | gcloud secrets create smtp-user --data-file=-
echo "your-app-password" | gcloud secrets create smtp-password --data-file=-

# Grant access
$PROJECT_NUMBER = gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)"
$SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
gcloud secrets add-iam-policy-binding smtp-host --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor"
# Repeat for other SMTP secrets
```

## 📝 Important Notes

1. **Cloud SQL Connection:**
   - The connection name must match exactly in cloudbuild.yaml
   - Cloud Run service must have Cloud SQL connection enabled
   - Use the format: `PROJECT:REGION:INSTANCE`

2. **Database Password:**
   - Must be stored in Secret Manager as `db-password`
   - Cloud Run service account needs access to this secret

3. **Environment Variables:**
   - `ENVIRONMENT=production` is critical - prevents SQLite fallback
   - Database connection will fail (and stop app) if Cloud SQL is not configured
   - This is intentional to prevent data loss

4. **Testing:**
   - After deployment, wait a few hours and verify users persist
   - Container restarts should NOT cause data loss anymore
   - Monitor logs closely for the first 24 hours

## ✅ Success Criteria

After deployment, you should see:
- [x] No "Database connection failed" errors in logs
- [x] "Successfully connected to Cloud SQL PostgreSQL" message
- [x] Users persist after container restarts
- [x] Emails are sent successfully
- [x] No data loss after several hours

---

**Last Updated:** December 2024
**Status:** Ready for Deployment



