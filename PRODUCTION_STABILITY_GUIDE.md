# Production Stability Guide

## Issues Fixed

### ✅ 1. Hardcoded Localhost URLs
**Problem**: Production import and other features used `http://127.0.0.1:8000`  
**Fixed**: All API calls now use `API_BASE_URL` from environment variables  
**Files Fixed**:
- `frontend/src/pages/AdminPage.tsx` - Production import
- `frontend/src/hooks/useAiAssistant.ts` - AI Assistant

### ✅ 2. Authentication Headers
**Problem**: Some requests missing auth headers  
**Fixed**: All API calls now include authentication headers

### ✅ 3. Database State
**Problem**: Cloud database had orphaned data  
**Fixed**: Cleanup endpoint and auto-creation of Leif employee/user

## Remaining Critical Issue

### ⚠️ Email Sending (SMTP DNS Error)
**Problem**: Cloud Run cannot resolve `smtp.gmail.com`  
**Error**: `[Errno -2] Name or service not known`  
**Impact**: Welcome emails and password resets don't send

**Solutions** (choose one):

#### Option 1: SendGrid API (Recommended - Most Reliable)
1. Sign up for SendGrid (free tier: 100 emails/day)
2. Get API key
3. Update `backend/services/email.py` to use SendGrid API
4. Store API key in Google Secret Manager as `SENDGRID_API_KEY`
5. Benefits: No SMTP connection needed, more reliable, better deliverability

#### Option 2: Fix SMTP Network Access
1. Configure VPC connector for Cloud Run
2. Allow outbound SMTP traffic (port 587)
3. Configure DNS resolution
4. More complex setup, but keeps existing SMTP code

#### Option 3: Use Google Cloud Email Service
1. Use Google's native email sending
2. Requires additional setup and may have costs

## Making It Stable for Company Use

### 1. Environment Configuration ✅
- Backend URL automatically passed to frontend during build
- CORS configured dynamically based on frontend URL
- All secrets in Google Secret Manager

### 2. Database Management ✅
- Auto-creates default users/employees on startup
- Cleanup endpoint for maintenance
- **TODO**: Set up regular backups
- **TODO**: Migration strategy for schema changes

### 3. Error Handling ✅
- Improved error logging
- Better error messages
- **TODO**: Set up error monitoring (Sentry, Cloud Error Reporting)

### 4. Monitoring & Alerts ⚠️
- Cloud Run logs available
- **TODO**: Set up Cloud Monitoring alerts for:
  - High error rates
  - Slow response times
  - Failed health checks
  - Database connection issues

### 5. Performance & Scaling ✅
- Cloud Run auto-scales
- Timeout set to 300 seconds
- Memory: 512Mi (backend), 256Mi (frontend)
- **TODO**: Monitor and adjust based on usage

### 6. Security ✅
- Authentication required for all endpoints
- Secrets in Secret Manager (not in code)
- CORS properly configured
- **TODO**: Set up WAF (Web Application Firewall)
- **TODO**: Regular security audits

### 7. Testing Strategy ⚠️
- **TODO**: Create test suite for critical features
- **TODO**: Integration tests for cloud environment
- **TODO**: Load testing

## Quick Fixes Applied

1. ✅ Production import uses correct backend URL
2. ✅ All API calls use centralized client with auth
3. ✅ Leif employee/user auto-created on startup
4. ✅ Database cleanup endpoint for maintenance
5. ✅ Improved error handling and logging

## Next Steps for Full Production Readiness

### Immediate (This Week)
1. ✅ Fix hardcoded URLs - DONE
2. ⚠️ Fix email sending (SendGrid or network fix)
3. ⚠️ Test all major features in cloud

### Short Term (This Month)
4. Set up Cloud Monitoring alerts
5. Configure database backups
6. Set up error tracking (Sentry)
7. Performance testing and optimization

### Long Term (Ongoing)
8. Regular security audits
9. Load testing and capacity planning
10. Documentation for team
11. CI/CD improvements
12. Staging environment

## Current Cloud URLs

- **Frontend**: https://uw-workbench-frontend-4szvavge6a-uc.a.run.app
- **Backend**: https://uw-workbench-backend-4szvavge6a-uc.a.run.app
- **Admin**: https://uw-workbench-frontend-4szvavge6a-uc.a.run.app/admin

## Testing Checklist

After deployment, test:
- [ ] Login/logout
- [ ] Create new employee
- [ ] Production import (single office)
- [ ] Production import (multi-office)
- [ ] Office management (add/delete)
- [ ] Agency management
- [ ] Document scrubber
- [ ] AI Assistant
- [ ] Password reset



