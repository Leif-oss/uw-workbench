# Update SMTP Password with Gmail App Password

## Step 1: Get Your App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in with: `workbenchworkbenchdh@gmail.com`
3. Create App Password for "UW Workbench Cloud"
4. **Copy the 16-character password** (remove spaces)
   - Example: `abcd efgh ijkl mnop` → use `abcdefghijklmnop`

## Step 2: Update the Secret

Run these commands in PowerShell (replace `YOUR_APP_PASSWORD` with your actual 16-character password):

```powershell
$PROJECT_ID = "ultra-ace-481723-e6"
$APP_PASSWORD = "YOUR_APP_PASSWORD"  # Replace with your 16-character App Password

# Create temporary file without BOM (important!)
$tempFile = [System.IO.Path]::GetTempFileName()
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($tempFile, $APP_PASSWORD, $utf8NoBom)

# Update the secret
gcloud secrets versions add smtp-password --data-file=$tempFile --project=$PROJECT_ID

# Clean up
Remove-Item $tempFile

# Restart Cloud Run service to pick up new password
gcloud run services update uw-workbench-backend --region=us-central1 --project=$PROJECT_ID --no-traffic
Start-Sleep -Seconds 5
gcloud run services update-traffic uw-workbench-backend --region=us-central1 --project=$PROJECT_ID --to-latest
```

## Step 3: Verify

After updating, wait about 30 seconds, then test:

1. Go to the admin panel
2. Create a new user
3. Check if the welcome email is sent

Or check logs:
```powershell
gcloud run services logs read uw-workbench-backend --region=us-central1 --project=ultra-ace-481723-e6 --limit=50 | Select-String -Pattern "email|SMTP|smtp"
```

## Important Notes

- **Remove spaces** from the App Password (it shows as `abcd efgh ijkl mnop` but use `abcdefghijklmnop`)
- The password should be exactly **16 characters** (no spaces)
- Make sure to use UTF-8 encoding without BOM (the command above handles this)



