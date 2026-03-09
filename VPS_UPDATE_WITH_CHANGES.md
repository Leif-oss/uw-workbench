# How to Update VPS with All Recent Changes

## ⚠️ Important: Just Starting Won't Update Code

Running `docker compose up -d` only starts existing containers. It does **NOT**:
- Pull new code from git
- Rebuild images with new code
- Update application files

## ✅ Complete Update Process

### Step 1: Get Latest Code to VPS

**Option A: Using Git (Recommended if code is in a repository)**

```bash
# SSH to VPS
ssh root@157.245.172.164

# Navigate to project
cd /root/uw-workbench

# Pull latest changes
git pull origin production  # or your branch name
```

**Option B: Upload from Local Machine**

On your **Windows machine** (PowerShell):
```powershell
# From your project directory
scp -r . root@157.245.172.164:/root/uw-workbench
```

**Option C: Manual Upload via SFTP**
- Use FileZilla, WinSCP, or similar
- Connect to: `157.245.172.164`
- Upload project files to `/root/uw-workbench/`

### Step 2: Rebuild and Restart Services

**After getting latest code, rebuild:**

```bash
# On VPS
cd /root/uw-workbench

# Rebuild everything (includes all recent changes)
docker compose -f docker-compose.prod.yml build

# Restart services
docker compose -f docker-compose.prod.yml up -d
```

**Or use the update script:**
```bash
./scripts/vps-update.sh
```

### Step 3: Verify Update

```bash
# Check services are running
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f backend
```

## 🚀 Quick Update Workflow

### If Using Git:

```bash
ssh root@157.245.172.164
cd /root/uw-workbench
git pull
./scripts/vps-update.sh
```

### If Uploading Manually:

```bash
# On Windows (PowerShell)
scp -r . root@157.245.172.164:/root/uw-workbench

# Then on VPS
ssh root@157.245.172.164
cd /root/uw-workbench
./scripts/vps-update.sh
```

## 📋 What Gets Updated

When you rebuild, these changes will be included:
- ✅ All code changes (backend and frontend)
- ✅ New features (email tools, sidebar changes, etc.)
- ✅ Security updates (Docker image updates)
- ✅ Database migrations (run automatically)
- ✅ Configuration changes

## ⏱️ Time Estimates

- **Git pull + rebuild**: 3-5 minutes
- **Upload + rebuild**: 5-10 minutes (depending on file size)
- **Backend only**: 1-2 minutes
- **Frontend only**: 2-3 minutes

## 🔄 Recommended Workflow

### For Regular Updates:

1. **Make changes locally** (on `workbench-features` branch)
2. **Test locally**
3. **Commit and push to git**
4. **On VPS**: `git pull` then `./scripts/vps-update.sh`

### For Production Deployment:

1. **Merge to production branch** locally
2. **Push to repository**
3. **On VPS**: 
   ```bash
   git checkout production
   git pull
   ./scripts/vps-update.sh
   ```

## 🎯 What Happens During Update

1. **Code Update**: Latest files copied to VPS
2. **Image Rebuild**: Docker rebuilds images with new code
3. **Service Restart**: Containers restart with new images
4. **Migrations**: Database migrations run automatically
5. **Health Check**: Services verify they're running correctly

## ⚠️ Important Notes

- **Database stays safe**: Your data and users are preserved
- **Downtime**: ~30-60 seconds during restart
- **Cache**: Docker caches layers, so rebuilds are faster after first time
- **Environment**: `.env` file is NOT overwritten (your config stays)

## 🐛 Troubleshooting

### Changes Not Showing?

```bash
# 1. Verify code was updated
cd /root/uw-workbench
git log -1  # Check latest commit

# 2. Force rebuild without cache
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# 3. Clear browser cache (for frontend changes)
```

### Update Fails?

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check disk space
df -h

# Check Docker
docker system df
```

## 📝 Summary

**To update VPS with all recent changes:**

1. ✅ Get latest code (git pull or upload)
2. ✅ Rebuild images (`docker compose build`)
3. ✅ Restart services (`docker compose up -d`)

**Just starting services won't update code!**
