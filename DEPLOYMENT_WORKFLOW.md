# Simple Deployment Workflow

## Two Versions

1. **Local `workbench-features`** = Where you make changes
2. **Local `production`** = What's deployed on VPS (stable)

## Workflow

### Make Changes
```powershell
# You're already on workbench-features
# Just edit files and commit
git add .
git commit -m "Your changes"
```

### Deploy to Production
```powershell
# Run this script
.\scripts\prepare-production-deploy.ps1
```

### Update VPS
```powershell
# SSH to VPS
ssh root@157.245.172.164

# On VPS
cd /root/uw-workbench
./scripts/deploy-to-production.sh
```

That's it! Your database and users stay safe.
