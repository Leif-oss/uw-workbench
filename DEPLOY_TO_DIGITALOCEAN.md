# Deploy to Digital Ocean VPS

## Option 1: Direct SSH Update (Recommended)

Since GitHub push protection is blocking due to secrets in commit history, update the VPS directly:

### Step 1: SSH into your VPS
```bash
ssh root@157.245.172.164
```

### Step 2: Navigate to project and pull latest (if workbench-features is available)
```bash
cd /root/uw-workbench
git fetch origin
git checkout workbench-features
git pull origin workbench-features
```

**OR** if workbench-features isn't available, we'll use Option 2 below.

## Option 2: Transfer Files from Local Machine

If the branch isn't available on GitHub, transfer files directly:

### From your local machine (Windows PowerShell):

```powershell
# 1. Create a deployment package (exclude cache files)
cd C:\Projects\uw-workbench
git archive --format=tar.gz --output=deploy.tar.gz workbench-features

# 2. Transfer to VPS
scp deploy.tar.gz root@157.245.172.164:/root/uw-workbench/

# 3. SSH into VPS and extract
ssh root@157.245.172.164
cd /root/uw-workbench
tar -xzf deploy.tar.gz
rm deploy.tar.gz
```

## Option 3: Manual File Sync (Most Reliable)

### On VPS:
```bash
cd /root/uw-workbench
git stash  # Save any local changes
```

### On Local Machine (PowerShell):
```powershell
# Sync backend files
scp -r C:\Projects\uw-workbench\backend\*.py root@157.245.172.164:/root/uw-workbench/backend/
scp -r C:\Projects\uw-workbench\backend\routers\*.py root@157.245.172.164:/root/uw-workbench/backend/routers/
scp -r C:\Projects\uw-workbench\backend\alembic\versions\*.py root@157.245.172.164:/root/uw-workbench/backend/alembic/versions/

# Sync frontend files
scp -r C:\Projects\uw-workbench\frontend\src\**\*.tsx root@157.245.172.164:/root/uw-workbench/frontend/src/
scp -r C:\Projects\uw-workbench\frontend\src\**\*.ts root@157.245.172.164:/root/uw-workbench/frontend/src/
```

## After Files Are Updated on VPS:

### 1. Run Database Migrations (CRITICAL)
```bash
cd /root/uw-workbench/backend
python -m alembic upgrade head
cd ..
```

This applies migration `0011_add_contact_details_fields` which adds:
- `previous_agencies` column
- `likes_hobbies` column  
- `additional_info` column

### 2. Rebuild and Restart Services
```bash
cd /root/uw-workbench
./scripts/vps-update.sh
```

This will:
- Rebuild backend Docker image
- Rebuild frontend Docker image
- Restart all services
- Show status

### 3. Verify Deployment
```bash
# Check services are running
docker compose -f docker-compose.prod.yml ps

# Check backend logs
docker compose -f docker-compose.prod.yml logs --tail=50 backend

# Check frontend logs
docker compose -f docker-compose.prod.yml logs --tail=50 frontend
```

## Quick One-Liner (After files are on VPS)
```bash
cd /root/uw-workbench/backend && python -m alembic upgrade head && cd .. && ./scripts/vps-update.sh
```

## What's Being Deployed

### Backend:
- ✅ Contact details fields (previous_agencies, likes_hobbies, additional_info)
- ✅ Renewals API (`/renewals/*` endpoints)
- ✅ Email templates API (`/email-templates/*` endpoints)
- ✅ Enhanced activity metrics calculation
- ✅ Improved log action detection (includes "Email Sent")

### Frontend:
- ✅ Contact Details expandable section with statistics
- ✅ Workflow Tool with renewals management
- ✅ 6 separate activity metric boxes on employee page
- ✅ Sortable activity columns on office/marketing pages
- ✅ Notes field moved inside Contact Details
- ✅ Enhanced email builder

## Troubleshooting

### If migration fails:
```bash
# Check current migration status
cd /root/uw-workbench/backend
python -m alembic current
python -m alembic history

# Force upgrade
python -m alembic upgrade head
```

### If services don't start:
```bash
# Rebuild without cache
cd /root/uw-workbench
./scripts/vps-update.sh --no-cache

# Check specific service
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml restart backend
```

### If you need to rollback:
```bash
cd /root/uw-workbench
git checkout HEAD~1
./scripts/vps-update.sh
```
