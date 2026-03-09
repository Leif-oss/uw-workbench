# How to Update SMTP Password - Step by Step

## Step 1: Get Your App Password from Google

1. Open your browser and go to:
   **https://myaccount.google.com/apppasswords**

2. Sign in with: `workbenchworkbenchdh@gmail.com`

3. If you see "2-Step Verification is off", you need to:
   - Go to: https://myaccount.google.com/security
   - Turn ON "2-Step Verification" first
   - Then come back to App Passwords

4. Create the App Password:
   - Select "Mail" from the dropdown
   - Select "Other (Custom name)"
   - Type: `UW Workbench Cloud`
   - Click "Generate"

5. **Copy the 16-character password** that appears
   - It will look like: `abcd efgh ijkl mnop`
   - **Remove the spaces** - you need: `abcdefghijklmnop`

## Step 2: Update the Secret in Google Cloud

Open PowerShell and run these commands:

```powershell
# Set your project ID
$PROJECT_ID = "ultra-ace-481723-e6"

# Replace 'abcdefghijklmnop' with your actual 16-character App Password
$APP_PASSWORD = "abcdefghijklmnop"

# Update the secret
echo $APP_PASSWORD | gcloud secrets versions add smtp-password --data-file=- --project=$PROJECT_ID
```

**Important:** 
- Replace `abcdefghijklmnop` with your actual App Password
- The password should be exactly 16 characters (no spaces)
- Make sure you're in the correct directory (doesn't matter which directory)

## Step 3: Verify It Was Updated

Check that the password was saved correctly:

```powershell
gcloud secrets versions access latest --secret="smtp-password" --project=$PROJECT_ID
```

This should show your 16-character password.

## Step 4: Restart Cloud Run Service

After updating the secret, restart the service so it picks up the new password:

```powershell
# Restart the service
gcloud run services update uw-workbench-backend --region=us-central1 --project=$PROJECT_ID --no-traffic

# Restore traffic
gcloud run services update-traffic uw-workbench-backend --region=us-central1 --project=$PROJECT_ID --to-latest
```

## Step 5: Test Email Sending

1. Go to your admin panel: https://uw-workbench-frontend-4szvavge6a-uc.a.run.app/admin
2. Create a new user/employee
3. Check if the welcome email is sent

## Troubleshooting

### If you get "Permission denied" error:
Make sure you're logged in to gcloud:
```powershell
gcloud auth login
```

### If you get "Secret not found" error:
The secret name might be different. Check:
```powershell
gcloud secrets list --project=$PROJECT_ID | Select-String -Pattern "smtp"
```

### If the password still doesn't work:
1. Double-check the password is exactly 16 characters (no spaces)
2. Make sure you created an App Password (not using your regular password)
3. Check Cloud Run logs for errors:
```powershell
gcloud run services logs read uw-workbench-backend --region=us-central1 --project=$PROJECT_ID --limit=50 | Select-String -Pattern "email|SMTP|smtp"
```



