# Development Workflow Guide

## Branch Strategy

### Current Setup
- **`workbench-features`** - Your development branch (where you make changes)
- **`production`** - Will match what's deployed on VPS (stable version)

### Recommended Workflow

#### 1. Development (Local)
```bash
# Make sure you're on development branch
git checkout workbench-features

# Make your changes
# ... edit files ...

# Commit changes
git add .
git commit -m "Description of changes"
git push origin workbench-features
```

#### 2. When Ready to Deploy
```bash
# Switch to production branch
git checkout production

# Merge your changes from workbench-features
git merge workbench-features

# Push to production branch
git push origin production
```

#### 3. Deploy to VPS
```bash
# SSH into VPS
ssh root@157.245.172.164

# On VPS
cd /root/uw-workbench
git fetch
git checkout production  # Or whatever branch matches deployed version
git pull
./scripts/vps-update.sh
```

## Two Versions Concept

### Option A: Two Branches (Recommended)
- **Local `workbench-features`** = Your working version
- **Local `production`** = Matches what's on VPS
- Deploy `production` branch to VPS

### Option B: Two Directories (Alternative)
- **`C:\Projects\uw-workbench`** = Working version
- **`C:\Projects\uw-workbench-production`** = Copy that matches VPS
- Less common, more maintenance

## Current Situation

Right now:
- **VPS has:** Whatever was uploaded initially (may not match any branch exactly)
- **Local has:** `workbench-features` branch with many uncommitted changes

## Next Steps

1. **Commit your current work** to `workbench-features`
2. **Create a `production` branch** that matches what's deployed
3. **Work on `workbench-features`** for new changes
4. **Deploy from `production`** when ready

Would you like me to help set this up?
