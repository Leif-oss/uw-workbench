# Cold Start Performance Fix

## Problem

Cloud Run services scale to zero when idle, causing cold start delays:
- First request after inactivity: 5-30 second delay
- Poor user experience on login
- Slow response times

## Solution Implemented

### Frontend ✅
**Set minimum instances to 1:**
```bash
gcloud run services update uw-workbench-frontend \
  --region=us-central1 \
  --min-instances=1
```

**Result:** Frontend always warm, instant response.

### Backend ⚠️
**Issue:** Cannot set min-instances due to startup timeout.

**Workaround:** Cloud Scheduler pings the service every 5 minutes to keep it warm.

**Create scheduler job:**
```bash
# Get backend URL
BACKEND_URL=$(gcloud run services describe uw-workbench-backend \
  --region=us-central1 \
  --format="value(status.url)")

# Create scheduler job (pings every 5 minutes)
gcloud scheduler jobs create http keep-backend-warm \
  --location=us-central1 \
  --schedule="*/5 * * * *" \
  --uri="${BACKEND_URL}/offices" \
  --http-method=GET \
  --time-zone="America/New_York"
```

**Result:** Backend stays warm via periodic requests.

## Why Backend Update Failed

The backend service times out when creating new revisions because:
1. Database migrations run on startup
2. Database connection may be slow
3. Startup process takes longer than Cloud Run's timeout

**Current status:** Service works fine, but new revisions fail to start.

## Alternative Solutions

### Option 1: Optimize Migrations (Recommended)
- Run migrations asynchronously
- Skip migrations if already up-to-date (already implemented)
- Cache database connections

### Option 2: Increase Startup Timeout
- Requires Cloud Run configuration change
- May not solve root cause

### Option 3: Use Cloud Scheduler (Current)
- Keeps service warm without configuration changes
- No code changes needed
- Works immediately

## Cost Impact

**Frontend:**
- min-instances=1: ~$5-10/month
- Always warm, instant response

**Backend:**
- Cloud Scheduler: Free (within free tier)
- Keeps instance warm via pings
- No additional cost

**Total:** ~$5-10/month for instant response times

## Monitoring

Check if scheduler is working:
```bash
gcloud scheduler jobs describe keep-backend-warm \
  --location=us-central1
```

View scheduler execution history:
```bash
gcloud scheduler jobs list-executions keep-backend-warm \
  --location=us-central1
```

## Future Improvements

1. **Optimize startup time:**
   - Lazy load heavy imports
   - Cache database connections
   - Skip unnecessary initialization

2. **Fix migration performance:**
   - Check if migrations are needed before running
   - Run migrations in background
   - Use connection pooling

3. **Set min-instances once startup is optimized:**
   - More reliable than scheduler pings
   - Better for production

## Current Status

✅ **Frontend:** Always warm (min-instances=1)  
✅ **Backend:** Kept warm via Cloud Scheduler  
✅ **Result:** Significantly reduced cold start delays
