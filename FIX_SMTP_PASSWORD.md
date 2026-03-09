# Fix SMTP Password - Quick Guide

## Problem Found
Your `smtp-password` secret is only 2 characters long, which is incorrect.

## Solution: Update the Password

### Step 1: Get Your Gmail App Password

1. **Go to Google App Passwords:**
   - Visit: https://myaccount.google.com/apppasswords
   - Sign in with: `workbenchworkbenchdh@gmail.com`

2. **Create App Password:**
   - Select "Mail" 
   - Select "Other (Custom name)"
   - Enter: `UW Workbench Cloud`
   - Click "Generate"
   - **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)

### Step 2: Update the Secret in Google Cloud

Run this command (replace `YOUR_APP_PASSWORD` with the 16-character password from step 1):

```powershell
$PROJECT_ID = "ultra-ace-481723-e6"
$APP_PASSWORD = "YOUR_APP_PASSWORD"  # Replace with your 16-character App Password

# Update the secret
echo $APP_PASSWORD | gcloud secrets versions add smtp-password --data-file=- --project=$PROJECT_ID

# Verify it was updated
gcloud secrets versions access latest --secret="smtp-password" --project=$PROJECT_ID
```

**Important:** 
- Remove spaces from the App Password (it's shown as `abcd efgh ijkl mnop` but use `abcdefghijklmnop`)
- The password should be exactly 16 characters

### Step 3: Restart Cloud Run Service

After updating the secret, restart the service:

```powershell
gcloud run services update uw-workbench-backend `
    --region=us-central1 `
    --project=$PROJECT_ID `
    --no-traffic
```

Then restore traffic:

```powershell
gcloud run services update-traffic uw-workbench-backend `
    --region=us-central1 `
    --project=$PROJECT_ID `
    --to-latest
```

### Step 4: Test Email Sending

1. Create a new user in the admin panel
2. Check if the welcome email is sent
3. Check Cloud Run logs:

```powershell
gcloud run services logs read uw-workbench-backend `
    --region=us-central1 `
    --project=$PROJECT_ID `
    --limit=50 | Select-String -Pattern "email|SMTP|smtp"
```

## Alternative: If You Don't Have 2FA Enabled

If your Gmail account doesn't have 2FA enabled:

1. **Enable "Less Secure App Access":**
   - Go to: https://myaccount.google.com/lesssecureapps
   - Turn ON "Allow less secure apps"

2. **Update with your regular Gmail password:**
   ```powershell
   $PROJECT_ID = "ultra-ace-481723-e6"
   $GMAIL_PASSWORD = "your-regular-gmail-password"  # Your actual Gmail password
   
   echo $GMAIL_PASSWORD | gcloud secrets versions add smtp-password --data-file=- --project=$PROJECT_ID
   ```

**Note:** Google is phasing out "Less secure app access", so using App Passwords (with 2FA) is recommended.



