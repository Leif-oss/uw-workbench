# Cloud Deployment Stability Plan

## Current Issues Identified

### 1. Hardcoded Localhost URLs
- **Issue**: Production import uses `http://127.0.0.1:8000` instead of cloud backend
- **Impact**: Features fail in cloud
- **Status**: ✅ FIXED - Now uses `API_BASE_URL` from environment

### 2. Email Sending (SMTP DNS Error)
- **Issue**: Cloud Run cannot resolve `smtp.gmail.com` (DNS error)
- **Impact**: Welcome emails and password resets don't send
- **Solution Options**:
  - Option A: Switch to SendGrid API (recommended)
  - Option B: Configure VPC connector for SMTP access
  - Option C: Use Google Cloud's email service

### 3. Authentication & CORS
- **Issue**: Some endpoints may have CORS or auth issues
- **Status**: Mostly fixed, but needs verification

### 4. Database State
- **Issue**: Cloud database may not match local
- **Status**: ✅ FIXED - Cleanup endpoint created

## Stability Improvements Made

### ✅ Fixed Issues
1. Production import now uses correct backend URL
2. All API calls use centralized API client
3. Authentication headers added to all requests
4. Leif employee/user auto-created on startup
5. Database cleanup endpoint for maintenance

### 🔄 In Progress
1. Email service (needs SendGrid or network fix)
2. Comprehensive testing of all features

## Recommendations for Production Stability

### 1. Environment Configuration
- ✅ Backend URL passed to frontend during build
- ✅ CORS configured dynamically
- ✅ Secrets managed via Google Secret Manager

### 2. Error Handling
- ✅ Improved error logging
- ✅ Better error messages for users
- ⚠️ Need: Centralized error monitoring

### 3. Monitoring & Logging
- ✅ Cloud Run logs available
- ⚠️ Need: Set up Cloud Monitoring alerts
- ⚠️ Need: Error tracking (Sentry, etc.)

### 4. Database
- ✅ Auto-creates default users/employees
- ✅ Cleanup endpoint for maintenance
- ⚠️ Need: Regular backups
- ⚠️ Need: Migration strategy

### 5. Email Service
- ⚠️ **CRITICAL**: Fix email sending
  - Best: Switch to SendGrid API
  - Alternative: Fix SMTP network access

## Next Steps

1. **Immediate**: Deploy fixes for hardcoded URLs
2. **High Priority**: Fix email sending (SendGrid)
3. **Medium Priority**: Set up monitoring and alerts
4. **Ongoing**: Test all features in cloud environment



