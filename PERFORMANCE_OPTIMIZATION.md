# Performance Optimization - Cold Start Fix

## Problem

Cloud Run instances scale to zero when there's no traffic, causing cold start delays:
- First request after inactivity: 5-30 seconds delay
- Database migrations run on every startup
- Application needs to initialize

## Solution Implemented

### 1. Minimum Instances = 1

**Backend:**
```bash
gcloud run services update uw-workbench-backend \
  --region=us-central1 \
  --min-instances=1
```

**Frontend:**
```bash
gcloud run services update uw-workbench-frontend \
  --region=us-central1 \
  --min-instances=1
```

**Result:** At least one instance stays warm, eliminating cold starts.

### 2. Optimized Startup Script

- Added timeout to migrations (30 seconds max)
- Server starts even if migrations take longer (they'll complete in background)
- Reduced startup time

### 3. Cost Impact

**Before:**
- Scales to zero: $0 when idle
- Cold start: 5-30 second delay on first request

**After:**
- Minimum 1 instance always running
- No cold start delay
- Additional cost: ~$5-10/month per service (very minimal)

**Total additional cost: ~$10-20/month** for instant response times.

## Trade-offs

**Pros:**
- ✅ Instant response (no cold start)
- ✅ Better user experience
- ✅ Predictable performance

**Cons:**
- ⚠️ Slightly higher cost (~$10-20/month)
- ⚠️ Instance always running (minimal resource usage when idle)

## Alternative: Keep Scaling to Zero

If you want to save costs and accept cold starts:
```bash
# Remove minimum instances
gcloud run services update uw-workbench-backend \
  --region=us-central1 \
  --min-instances=0
```

## Monitoring

Check instance status:
```bash
gcloud run services describe uw-workbench-backend \
  --region=us-central1 \
  --format="value(status.conditions)"
```

## Recommendation

For 50 users with light usage:
- **Keep min-instances=1** for better UX
- Cost is minimal (~$10-20/month total)
- Users get instant response times
- Worth it for production use
