# Google Cloud Cost Estimate

## Current Configuration

### Services in Use

1. **Cloud Run** (Backend & Frontend)
   - Backend: 2 CPU, 2GB RAM, max 10 instances
   - Frontend: (estimated 1 CPU, 512MB RAM, max 5 instances)

2. **Cloud SQL PostgreSQL**
   - Instance tier: (check actual tier)
   - Storage: (check actual storage)

3. **Cloud Storage** (if used for file uploads)
   - Minimal usage expected

4. **Secret Manager**
   - Storing secrets (minimal cost)

5. **Artifact Registry**
   - Container images (minimal cost)

6. **Cloud Build**
   - Build minutes per deployment

## Usage Scenario

- **Users:** 50 active users
- **Transactions:** A couple transactions per day (~60-100 requests/day total)
- **Traffic:** Very light usage

## Monthly Cost Estimate

### 1. Cloud Run (Compute)

**Pricing (as of 2024):**
- $0.00002400 per vCPU-second
- $0.00000250 per GiB-second
- Free tier: 2 million requests/month, 360,000 GiB-seconds, 180,000 vCPU-seconds

**Backend:**
- Requests: ~100/day × 30 days = 3,000/month (well within free tier)
- CPU time: Very minimal (simple requests)
- Memory: 2GB × minimal time
- **Cost: ~$0/month (within free tier)**

**Frontend:**
- Requests: ~100/day × 30 days = 3,000/month
- Static serving: Very efficient
- **Cost: ~$0/month (within free tier)**

**Cloud Run Total: ~$0/month** (well within free tier limits)

### 2. Cloud SQL PostgreSQL

**Pricing depends on tier:**

**db-f1-micro (1 vCPU, 0.6GB RAM):**
- Instance: ~$7.67/month
- Storage (10GB): $1.70/month
- Backups: $0.08/GB/month (~$1-2/month)
- **Total: ~$10-12/month**

**db-g1-small (1 vCPU, 1.7GB RAM):**
- Instance: ~$25/month
- Storage: $1.70/month (10GB)
- Backups: ~$1-2/month
- **Total: ~$28-30/month**

**db-n1-standard-1 (1 vCPU, 3.75GB RAM):**
- Instance: ~$50/month
- Storage: $1.70/month (10GB)
- Backups: ~$1-2/month
- **Total: ~$53-55/month**

**For 50 users with light usage: db-f1-micro should be sufficient**
**Estimated Cloud SQL Cost: ~$10-15/month**

### 3. Cloud Storage (if used)

- Storage: $0.020 per GB/month (first 10GB/month free)
- Operations: Minimal (within free tier)
- **Cost: ~$0-1/month** (if storing files)

### 4. Secret Manager

- First 6 secrets: Free
- After that: $0.06 per secret/month
- **Cost: ~$0/month** (likely within free tier)

### 5. Artifact Registry

- Storage: $0.10 per GB/month (first 0.5GB free)
- Operations: Free
- **Cost: ~$0/month** (container images are small)

### 6. Cloud Build

- Free tier: 120 build-minutes/day
- Additional: $0.003 per build-minute
- **Cost: ~$0-1/month** (deployments are quick)

## Total Monthly Cost Estimate

### Conservative Estimate (db-f1-micro)
- Cloud Run: **$0** (free tier)
- Cloud SQL: **$10-15** (db-f1-micro)
- Other services: **$0-2**
- **Total: ~$10-17/month**

### Moderate Estimate (db-g1-small)
- Cloud Run: **$0** (free tier)
- Cloud SQL: **$28-30** (db-g1-small)
- Other services: **$0-2**
- **Total: ~$30-32/month**

### Higher Estimate (if scaling needed)
- Cloud Run: **$0-5** (if exceeding free tier)
- Cloud SQL: **$30-55** (depending on tier)
- Other services: **$2-5**
- **Total: ~$35-65/month**

## Recommendations

### For 50 Users with Light Usage:

**Optimal Configuration:**
- Cloud Run: Keep current config (free tier sufficient)
- Cloud SQL: **db-f1-micro** should be sufficient
- Storage: 10GB should be enough initially
- **Estimated Cost: $10-15/month**

### Cost Optimization Tips:

1. **Use db-f1-micro** for light usage (50 users)
2. **Enable automatic backups** but set retention to 7 days
3. **Monitor Cloud Run usage** - you're well within free tier
4. **Use Cloud Storage lifecycle policies** if storing files
5. **Set up billing alerts** at $20, $50, $100

### When to Scale:

- **50-100 users:** db-f1-micro still fine
- **100-500 users:** Consider db-g1-small
- **500+ users:** Consider db-n1-standard-1 or higher

## Current Actual Cost Check

To check your actual current costs:
```bash
# View current billing
gcloud billing accounts list
gcloud billing projects describe PROJECT_ID

# View current month costs (if billing export is set up)
# Or check in Cloud Console: Billing → Reports
```

## Summary

**For 50 users with light usage:**
- **Estimated Monthly Cost: $10-20/month**
- **Primary cost driver:** Cloud SQL instance (~$10-15/month)
- **Cloud Run:** Free (well within free tier)
- **Other services:** Minimal cost

This is very cost-effective for a production application!
