# Backend Warm Instance Cost Analysis

## Current Configuration

**Backend:**
- CPU: 2 vCPU
- Memory: 2 GiB
- Current: Scales to zero (min-instances=0)

## Cost Comparison

### Option 1: Scale to Zero (Current)
**Cost when idle:** $0
**Cost with traffic:** Pay per use
- CPU: $0.00002400 per vCPU-second
- Memory: $0.00000250 per GiB-second
- Requests: First 2M free/month

**Example monthly cost (50 users, light usage):**
- Requests: ~3,000/month (free tier)
- Compute: ~$0-2/month (only when serving requests)
- **Total: ~$0-2/month**

**Downside:**
- Cold start delay: 5-30 seconds after 15+ min idle
- Poor user experience on first request

### Option 2: Keep Warm (min-instances=1)
**Cost when idle:** Continuous compute charges
**Cost with traffic:** Same as Option 1

**Monthly cost calculation:**
- Seconds per month: 2,592,000 (30 days)
- CPU cost: 2 vCPU × 2,592,000 sec × $0.00002400 = **$124.42/month**
- Memory cost: 2 GiB × 2,592,000 sec × $0.00000250 = **$12.96/month**
- **Total: ~$137/month** (just for keeping it warm)

**Plus traffic costs:**
- Same as Option 1 when serving requests
- **Total: ~$137-140/month**

**Upside:**
- ✅ No cold start delays
- ✅ Instant response always
- ✅ Better user experience

## Cost Breakdown

### Scale to Zero (Current)
```
Idle time: $0
Active time: ~$0-2/month (light usage)
Total: ~$0-2/month
```

### Keep Warm (min-instances=1)
```
Idle time: ~$137/month (always running)
Active time: ~$0-2/month (light usage)
Total: ~$137-140/month
```

## Alternative: Cloud Scheduler (Best of Both Worlds)

**Cost:**
- Cloud Scheduler: **FREE** (within free tier: 3 jobs free)
- Pings every 5 minutes: ~8,640 requests/month
- Request cost: First 2M free → **$0**
- Compute cost: Only when serving pings (~$0-1/month)
- **Total: ~$0-1/month**

**How it works:**
- Scheduler pings `/health` endpoint every 5 minutes
- Keeps instance warm (prevents scale-to-zero)
- No continuous compute charges
- **Result: Warm instance at minimal cost**

## Recommendation

### For 50 Users with Light Usage:

**Best Option: Cloud Scheduler**
- ✅ Keeps backend warm
- ✅ No cold starts
- ✅ Cost: ~$0-1/month (vs $137/month for min-instances)
- ✅ 99% cost savings vs min-instances

**Setup:**
1. Enable Cloud Scheduler API
2. Create job to ping `/health` every 5 minutes
3. Instance stays warm, minimal cost

### When to Use min-instances=1:

**Use if:**
- High traffic (1000+ requests/day)
- Critical application (can't accept any cold start)
- Budget allows ($137/month)

**Don't use if:**
- Low/medium traffic (<1000 requests/day)
- Cost-sensitive
- Can accept occasional cold start

## Cost Summary

| Option | Monthly Cost | Cold Starts | Best For |
|-------|-------------|-------------|----------|
| Scale to Zero | $0-2 | Yes (after 15+ min idle) | Cost-sensitive, low traffic |
| min-instances=1 | $137-140 | No | High traffic, critical apps |
| Cloud Scheduler | $0-1 | No | **Best balance (recommended)** |

## Conclusion

**For your use case (50 users, light usage):**
- **Cloud Scheduler is the best option**
- Keeps backend warm at minimal cost
- No cold starts, instant response
- 99% cheaper than min-instances=1

**Cost: ~$0-1/month vs $137/month**
