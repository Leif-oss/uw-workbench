# Cloud Email Issue - DNS Resolution Error

## Problem
When adding a new user in the cloud version, emails are not being sent. Backend logs show:
```
Failed to send email to [email]: [Errno -2] Name or service not known
```

## Root Cause
Cloud Run cannot resolve the SMTP hostname (`smtp.gmail.com`). This is likely due to:
- Network restrictions on Cloud Run
- DNS resolution issues
- Firewall blocking outbound SMTP connections

## Current Status
- SMTP secrets are correctly configured in Google Secret Manager
- All SMTP credentials are set (host, port, user, password, etc.)
- The error occurs when trying to connect to SMTP server

## Solutions

### Option 1: Use SendGrid API (Recommended)
SendGrid has better Cloud Run compatibility than SMTP.

1. Sign up for SendGrid account
2. Get API key
3. Update email service to use SendGrid API instead of SMTP
4. Store API key in Google Secret Manager

### Option 2: Configure VPC Connector
Allow Cloud Run to access external SMTP servers via VPC.

1. Create VPC connector
2. Configure Cloud Run to use VPC connector
3. Allow outbound SMTP traffic (port 587)

### Option 3: Use Google Cloud's Email Service
Use Google's native email sending capabilities.

### Option 4: Check Cloud Run Network Settings
Verify Cloud Run has internet access and can resolve DNS.

## Temporary Workaround
The set-password link is still generated and logged in backend logs. You can:
1. Check backend logs for the set-password link
2. Manually send the link to the user
3. Or use the admin panel to reset passwords

## Next Steps
1. Check Cloud Run logs for detailed error messages
2. Verify network connectivity from Cloud Run
3. Consider switching to SendGrid or another email API service



