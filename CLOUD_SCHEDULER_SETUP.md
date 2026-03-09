# Cloud Scheduler Setup - Keep Backend Warm

## What Was Set Up

**Cloud Scheduler Job:**
- **Name:** `keep-backend-warm`
- **Location:** `us-central1`
- **Schedule:** Every 5 minutes (`*/5 * * * *`)
- **Endpoint:** `https://uw-workbench-backend-4szvavge6a-uc.a.run.app/health`
- **Method:** GET
- **Time Zone:** America/New_York

## How It Works

1. Cloud Scheduler triggers every 5 minutes
2. Sends GET request to `/health` endpoint
3. Backend responds (keeps instance active)
4. Instance stays warm (prevents scale-to-zero)
5. No cold start delays for users

## Cost

- **Cloud Scheduler:** FREE (within free tier: 3 jobs free)
- **Requests:** ~8,640 pings/month (within free tier: 2M requests free)
- **Compute:** Only when serving pings (~$0-1/month)
- **Total: ~$0-1/month**

## Management Commands

### View Job Details
```bash
gcloud scheduler jobs describe keep-backend-warm \
  --location=us-central1
```

### Manually Run Job (Test)
```bash
gcloud scheduler jobs run keep-backend-warm \
  --location=us-central1
```

### View Execution History
```bash
gcloud scheduler jobs list-executions keep-backend-warm \
  --location=us-central1
```

### Pause Job (if needed)
```bash
gcloud scheduler jobs pause keep-backend-warm \
  --location=us-central1
```

### Resume Job
```bash
gcloud scheduler jobs resume keep-backend-warm \
  --location=us-central1
```

### Delete Job (if needed)
```bash
gcloud scheduler jobs delete keep-backend-warm \
  --location=us-central1
```

## Monitoring

### Check Job Status
```bash
gcloud scheduler jobs describe keep-backend-warm \
  --location=us-central1 \
  --format="value(state)"
```

### View Recent Executions
```bash
gcloud scheduler jobs list-executions keep-backend-warm \
  --location=us-central1 \
  --limit=10
```

### Check Backend Health
```bash
curl https://uw-workbench-backend-4szvavge6a-uc.a.run.app/health
```

## Troubleshooting

### Job Not Running
1. Check job state: `gcloud scheduler jobs describe keep-backend-warm --location=us-central1`
2. Verify schedule: Should be `*/5 * * * *` (every 5 minutes)
3. Check execution history: `gcloud scheduler jobs list-executions keep-backend-warm --location=us-central1`

### Backend Still Cold Starting
1. Verify job is running: Check execution history
2. Check schedule: Should be every 5 minutes (not longer)
3. Verify endpoint: `/health` should return 200 OK

### Cost Concerns
- Cloud Scheduler: Free (within free tier)
- Requests: First 2M free/month
- Compute: Only when serving requests (~$0-1/month)
- Total should be ~$0-1/month

## Expected Behavior

**Before Setup:**
- Backend scales to zero after 15+ minutes idle
- First request: 5-30 second cold start delay
- Poor user experience

**After Setup:**
- Backend stays warm (pings every 5 minutes)
- No cold start delays
- Instant response always
- Minimal cost (~$0-1/month)

## Success Indicators

✅ Job shows as "ENABLED" in Cloud Console  
✅ Execution history shows successful runs every 5 minutes  
✅ Backend responds instantly (no cold starts)  
✅ Cost remains minimal (~$0-1/month)

## Notes

- Job runs automatically every 5 minutes
- No manual intervention needed
- Backend stays warm 24/7
- Cost-effective solution for keeping instance warm
