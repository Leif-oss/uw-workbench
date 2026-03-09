# Fix Gmail SMTP Authentication - URGENT

## Problem
Email sending is failing with error: **"Username and Password not accepted"**

This means Gmail is rejecting your SMTP credentials. The most common cause is using a **regular Gmail password** instead of an **App Password**.

## Quick Fix

### Step 1: Generate Gmail App Password

1. **Go to Google App Passwords:**
   https://myaccount.google.com/apppasswords

2. **Sign in** with: `workbenchworkbenchdh@gmail.com`

3. **If 2FA is enabled:**
   - Select "Mail" and "Other (Custom name)"
   - Enter name: "UW Workbench Cloud"
   - Click "Generate"
   - **Copy the 16-character password** (remove spaces: `xxxx xxxx xxxx xxxx` becomes `xxxxxxxxxxxxxxxx`)

4. **If 2FA is NOT enabled:**
   - Enable 2FA first: https://myaccount.google.com/security
   - Then follow step 3 above

### Step 2: Update Secret

Run this command (replace `YOUR_16_CHAR_PASSWORD` with your actual App Password):

```powershell
# Remove all spaces from the App Password first!
echo -n "YOUR_16_CHAR_PASSWORD" | gcloud secrets versions add smtp-password --data-file=-
```

**Example:**
If Google gives you: `abcd efgh ijkl mnop`
Use: `abcdefghijklmnop` (16 characters, no spaces)

### Step 3: Verify

```powershell
# Check the secret length (should be 16)
$pass = (gcloud secrets versions access latest --secret=smtp-password).Trim()
Write-Host "Password length: $($pass.Length) (should be 16)"
```

### Step 4: Test

1. Wait 1 minute for secret propagation
2. Try creating a new user or password reset
3. Check logs:
   ```powershell
   gcloud run services logs read uw-workbench-backend --region us-central1 --limit 20 | Select-String -Pattern "email|SMTP"
   ```

## Important Notes

- **App Passwords are 16 characters** (alphanumeric only, no spaces)
- **Regular passwords won't work** if 2FA is enabled
- **Remove ALL spaces** from the App Password when copying
- The password in Secret Manager must be **exactly 16 characters**

## Current Configuration

- SMTP_USER: `workbenchworkbenchdh@gmail.com`
- SMTP_HOST: `smtp.gmail.com`
- SMTP_PORT: `587`
- SMTP_PASSWORD: **NEEDS UPDATE** (currently 18 chars, should be 16)

---

**After updating, emails should work immediately!**



