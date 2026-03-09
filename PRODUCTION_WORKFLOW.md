# Production Deployment Workflow

## Branch Structure

- **`workbench-features`** - Your development branch (make changes here)
- **`production`** - Stable version deployed on VPS

## Daily Workflow

### 1. Make Changes Locally

```powershell
# Make sure you're on development branch
git checkout workbench-features

# Make your changes
# ... edit files in C:\Projects\uw-workbench ...

# Test locally if needed
.\start_backend.ps1
.\start_frontend.ps1
```

### 2. Commit Your Changes

```powershell
# Stage changes
git add .

# Commit
git commit -m "Description of what you changed"

# Push to remote (optional, for backup)
git push origin workbench-features
```

### 3. When Ready to Deploy to Production

**Option A: Use the script (Recommended)**

```powershell
.\scripts\prepare-production-deploy.ps1
```

This will:
- Check you're on workbench-features
- Commit any uncommitted changes (if you want)
- Merge workbench-features → production
- Push production branch

**Option B: Manual**

```powershell
# Commit your changes first
git add .
git commit -m "Your changes"

# Switch to production
git checkout production

# Merge your changes
git merge workbench-features

# Push
git push origin production
```

### 4. Deploy to VPS

**SSH into VPS:**
```powershell
ssh root@157.245.172.164
```

**On VPS, run:**
```bash
cd /root/uw-workbench

# Option A: Use deployment script
./scripts/deploy-to-production.sh

# Option B: Manual
git fetch
git checkout production
git pull origin production
./scripts/vps-update.sh
```

## Important Notes

✅ **Database stays safe** - Only code updates, no data loss  
✅ **Users remain** - All logins persist  
✅ **Migrations run automatically** - Database schema updates happen on startup  

## Quick Reference

| Task | Command |
|------|---------|
| Start working | `git checkout workbench-features` |
| Commit changes | `git add . && git commit -m "message"` |
| Deploy to production | `.\scripts\prepare-production-deploy.ps1` |
| Update VPS | `ssh root@157.245.172.164` then `./scripts/deploy-to-production.sh` |

## Current Status

- ✅ `production` branch created
- ✅ `workbench-features` = your development branch
- ⚠️  You have uncommitted changes on `workbench-features`

## Next Steps

1. **Continue working** on `workbench-features` (you're already there)
2. **Commit changes** when ready: `git add . && git commit -m "message"`
3. **Deploy** when ready: Run `.\scripts\prepare-production-deploy.ps1`

---

**You're all set!** Work on `workbench-features`, deploy from `production`.
