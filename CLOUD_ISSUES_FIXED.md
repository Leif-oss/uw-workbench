# Cloud Deployment Issues - Fixed

## 🔴 Critical Issues Found and Fixed

### Issue 1: Users Being Deleted After a Couple Hours

**Root Cause:**
The database connection code in `backend/database.py` had a fallback mechanism that would fall back to SQLite if Cloud SQL connection failed. In Cloud Run, SQLite databases are stored in the container's ephemeral filesystem. When containers restart (which happens automatically every few hours), all SQLite data is lost.

**Fix Applied:**
- Modified `backend/database.py` to **NEVER** fall back to SQLite in production/cloud environments
- If Cloud SQL connection fails in production, the application will now **fail to start** instead of silently falling back to SQLite
- Added connection pooling with `pool_pre_ping=True` and `pool_recycle=3600` to handle connection issues better
- Added detailed error logging to help diagnose Cloud SQL connection problems

**What This Means:**
- Your Cloud SQL database connection MUST be properly configured
- If Cloud SQL connection fails, the app will log errors and refuse to start (preventing data loss)
- Check logs for connection issues if the app won't start

**Required Environment Variables for Cloud:**
- `CLOUD_SQL_CONNECTION_NAME` - Format: `PROJECT:REGION:INSTANCE`
- `DB_USER` - Database username (default: `postgres`)
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name (default: `uw_workbench`)
- `ENVIRONMENT=production` - Must be set to prevent SQLite fallback

**Cloud Run Configuration Required:**
- Cloud Run service must have Cloud SQL connection configured
- Check Cloud Run service settings → Connections → Cloud SQL instances

---

### Issue 2: Emails Not Going Out

**Root Cause:**
SMTP configuration may not be properly set in cloud environment, or connection to SMTP server is failing.

**Fixes Applied:**
- Enhanced email logging to show which SMTP settings are configured
- Added better error messages for DNS resolution failures
- Email service already has good error handling, but now logs configuration status

**What to Check:**

1. **Environment Variables (Must be set in Cloud Run secrets):**
   - `SMTP_HOST` - SMTP server hostname (default: `smtp.gmail.com`)
   - `SMTP_PORT` - SMTP port (587 for STARTTLS, 465 for SSL/TLS)
   - `SMTP_USER` - SMTP username/email
   - `SMTP_PASSWORD` - SMTP password or app-specific password
   - `SMTP_FROM_EMAIL` - From email address (optional, defaults to SMTP_USER)
   - `SMTP_FROM_NAME` - From name (optional, defaults to "UW Workbench")
   - `FRONTEND_URL` - Frontend URL for email links

2. **Gmail SMTP Issues:**
   - If using Gmail, you need an "App Password" (not regular password)
   - Enable 2-factor authentication on Gmail account
   - Generate App Password: https://myaccount.google.com/apppasswords
   - Port 25 is blocked on Google Cloud - use 587 or 465

3. **Network Connectivity:**
   - Check Cloud Run service logs for DNS resolution errors
   - Verify SMTP server is accessible from Cloud Run
   - May need to configure VPC connector if SMTP server is on private network

4. **Check Logs:**
   - Look for "Email not configured" warnings
   - Look for "DNS resolution failed" errors
   - Look for "SMTP error" messages

---

### Issue 3: Cleanup Endpoint Safety

**Fix Applied:**
- Added protection to `/admin/cleanup-database` endpoint
- In production, this endpoint now requires `ENABLE_CLEANUP_ENDPOINT=true` environment variable
- Added warning in endpoint documentation

**Note:**
This endpoint DELETES all users and employees except Leif. It should only be used during initial setup or maintenance.

---

## 🛠️ Next Steps

### 1. Verify Cloud SQL Configuration

Check that Cloud Run service has:
- Cloud SQL connection properly configured
- All required environment variables set:
  ```
  CLOUD_SQL_CONNECTION_NAME=PROJECT:REGION:INSTANCE
  DB_USER=postgres
  DB_PASSWORD=*** (from Secret Manager)
  DB_NAME=uw_workbench
  ENVIRONMENT=production
  ```

### 2. Verify SMTP Configuration

Ensure these secrets are set in Cloud Run:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL` (optional)
- `SMTP_FROM_NAME` (optional)
- `FRONTEND_URL`

### 3. Test After Deployment

1. **Database:**
   - Create a test user
   - Wait a few hours or restart Cloud Run service
   - Verify user still exists (should not be deleted)

2. **Email:**
   - Try password reset functionality
   - Check Cloud Run logs for email sending errors
   - Verify SMTP connection in logs

### 4. Monitor Logs

Watch for these log messages:
- `"Successfully connected to Cloud SQL PostgreSQL"` - Good!
- `"Database connection failed in production"` - Bad! Check Cloud SQL config
- `"Email not configured"` - Check SMTP secrets
- `"DNS resolution failed for SMTP_HOST"` - Network connectivity issue

---

## 📋 Deployment Checklist

Before deploying these fixes:

- [ ] Verify Cloud SQL instance is running
- [ ] Verify Cloud Run service has Cloud SQL connection configured
- [ ] Verify all database environment variables are set
- [ ] Verify all SMTP environment variables/secrets are set
- [ ] Set `ENVIRONMENT=production` in Cloud Run
- [ ] Test database connection after deployment
- [ ] Test email sending after deployment
- [ ] Monitor logs for the first few hours after deployment

---

## 🔍 Troubleshooting

### Database Connection Fails

**Error:** `"Database connection failed in production"`

**Solutions:**
1. Check `CLOUD_SQL_CONNECTION_NAME` format: `PROJECT:REGION:INSTANCE`
2. Verify Cloud Run service has Cloud SQL connection enabled
3. Check Cloud SQL instance is running
4. Verify database credentials are correct
5. Check network/firewall rules

### Emails Still Not Sending

**Check:**
1. Cloud Run logs for SMTP errors
2. Verify SMTP secrets are correctly set
3. Test SMTP connection from Cloud Run:
   ```python
   import socket
   socket.gethostbyname("smtp.gmail.com")  # Should resolve
   ```
4. If using Gmail, ensure App Password is used (not regular password)
5. Check firewall rules - port 587/465 must be accessible

---

**Last Updated:** December 2024
**Status:** ✅ Fixes Applied - Ready for Testing



