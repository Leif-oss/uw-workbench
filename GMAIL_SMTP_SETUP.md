# Gmail SMTP Setup Guide

## Step 1: Check Your Gmail Account Settings

### Option A: If You Have 2FA Enabled (Recommended)

1. **Go to Google Account Settings:**
   - Visit: https://myaccount.google.com/
   - Sign in with the Gmail account you're using for SMTP

2. **Check 2FA Status:**
   - Click "Security" in the left menu
   - Look for "2-Step Verification" - if it says "On", you need an App Password

3. **Create an App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Or: Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Enter name: "UW Workbench Cloud"
   - Click "Generate"
   - **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)
   - **This is what you need to use in Secret Manager, NOT your regular password**

### Option B: If You DON'T Have 2FA Enabled

1. **Enable "Less Secure App Access" (Not Recommended, but works):**
   - Go to: https://myaccount.google.com/lesssecureapps
   - Turn ON "Allow less secure apps"
   - **Note:** Google is phasing this out, so App Passwords are better

## Step 2: Check SMTP Credentials in Google Secret Manager

### Check Current Secrets

```powershell
# Set your project ID
$PROJECT_ID = "ultra-ace-481723-e6"

# Check if SMTP secrets exist
Write-Host "Checking SMTP secrets..." -ForegroundColor Cyan

# Check SMTP_USER
gcloud secrets versions access latest --secret="SMTP_USER" --project=$PROJECT_ID 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "SMTP_USER exists" -ForegroundColor Green
} else {
    Write-Host "SMTP_USER does NOT exist" -ForegroundColor Red
}

# Check SMTP_PASSWORD
gcloud secrets versions access latest --secret="SMTP_PASSWORD" --project=$PROJECT_ID 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "SMTP_PASSWORD exists" -ForegroundColor Green
} else {
    Write-Host "SMTP_PASSWORD does NOT exist" -ForegroundColor Red
}
```

### Update SMTP Credentials

If you need to update the credentials:

```powershell
# Update SMTP_USER (your Gmail address)
$SMTP_USER = "your-email@gmail.com"  # Replace with your actual Gmail
echo $SMTP_USER | gcloud secrets create SMTP_USER --data-file=- --project=$PROJECT_ID 2>&1
# If secret already exists, use:
echo $SMTP_USER | gcloud secrets versions add SMTP_USER --data-file=- --project=$PROJECT_ID

# Update SMTP_PASSWORD (your App Password or regular password)
$SMTP_PASSWORD = "your-app-password"  # Replace with App Password (16 chars) or regular password
echo $SMTP_PASSWORD | gcloud secrets create SMTP_PASSWORD --data-file=- --project=$PROJECT_ID 2>&1
# If secret already exists, use:
echo $SMTP_PASSWORD | gcloud secrets versions add SMTP_PASSWORD --data-file=- --project=$PROJECT_ID
```

### Grant Cloud Run Access to Secrets

```powershell
# Get the service account email
$SERVICE_ACCOUNT = "uw-workbench-backend@$PROJECT_ID.iam.gserviceaccount.com"

# Grant access to SMTP_USER secret
gcloud secrets add-iam-policy-binding SMTP_USER `
    --member="serviceAccount:$SERVICE_ACCOUNT" `
    --role="roles/secretmanager.secretAccessor" `
    --project=$PROJECT_ID

# Grant access to SMTP_PASSWORD secret
gcloud secrets add-iam-policy-binding SMTP_PASSWORD `
    --member="serviceAccount:$SERVICE_ACCOUNT" `
    --role="roles/secretmanager.secretAccessor" `
    --project=$PROJECT_ID
```

## Step 3: Verify Cloud Run Environment Variables

Check if the secrets are mounted in Cloud Run:

```powershell
gcloud run services describe uw-workbench-backend `
    --region=us-central1 `
    --project=$PROJECT_ID `
    --format="yaml(spec.template.spec.containers[0].env)"
```

Look for:
- `SMTP_USER` should reference the secret
- `SMTP_PASSWORD` should reference the secret

## Step 4: Test Email Sending

After updating credentials:

1. **Restart the Cloud Run service** (or wait for next deployment)
2. **Create a new user** in the admin panel
3. **Check Cloud Run logs** for email sending:
```powershell
gcloud run services logs read uw-workbench-backend `
    --region=us-central1 `
    --project=$PROJECT_ID `
    --limit=50 | Select-String -Pattern "email|SMTP|smtp"
```

## Common Issues

### Issue: "Invalid credentials"
- **Solution:** Make sure you're using an App Password if 2FA is enabled
- App Passwords are 16 characters, no spaces

### Issue: "Username and Password not accepted"
- **Solution:** 
  - If 2FA is ON: Use App Password
  - If 2FA is OFF: Enable "Less secure app access"

### Issue: "Connection refused"
- **Solution:** This is a network issue (but we verified networking works)
- Check if Gmail is blocking the IP (unlikely with Cloud Run)

### Issue: "Email sent but not received"
- **Solution:** Check spam folder
- Verify the "From" email address is correct

## Quick Checklist

- [ ] Gmail account has 2FA enabled? → Use App Password
- [ ] Gmail account has 2FA disabled? → Enable "Less secure app access"
- [ ] SMTP_USER secret exists and is correct?
- [ ] SMTP_PASSWORD secret exists and is correct (App Password if 2FA)?
- [ ] Cloud Run service has access to secrets?
- [ ] Environment variables are set in Cloud Run?



