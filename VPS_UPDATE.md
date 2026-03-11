# Quick VPS Update Guide

## VPS Connection Details
- **IP Address:** `157.245.172.164`
- **User:** `root`
- **Project Path:** `/root/uw-workbench`

## ⚠️ IMPORTANT: Always Backup Before Updating!

**Before any update, you MUST create a backup of the database.**

## Quick Update Steps (One Command at a Time)

### Step 1: Connect to VPS
```bash
ssh root@157.245.172.164
```

### Step 2: Navigate to project
```bash
cd /root/uw-workbench
```

### Step 3: **BACKUP THE DATABASE** (REQUIRED)
```bash
chmod +x scripts/vps-backup-before-update.sh
./scripts/vps-backup-before-update.sh
```

This creates a timestamped backup in `./backups/` directory.

### Step 4: Pull latest changes from production
```bash
git fetch origin && git checkout production && git pull origin production
```

### Step 5: Rebuild and restart services
```bash
docker compose -f docker-compose.prod.yml build --no-cache && docker compose -f docker-compose.prod.yml up -d
```

### Step 6: Check status
```bash
docker compose -f docker-compose.prod.yml ps
```

### Step 7: Verify application is working
- Check the website in your browser
- Verify data is intact
- Check logs if needed: `docker compose -f docker-compose.prod.yml logs --tail=50 backend`

## Alternative: Use Update Script (if available)
```bash
cd /root/uw-workbench
./scripts/vps-update.sh
```

## Troubleshooting

### Check logs if something fails:
```bash
docker compose -f docker-compose.prod.yml logs --tail=50 backend
docker compose -f docker-compose.prod.yml logs --tail=50 frontend
```

### Restart a specific service:
```bash
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml restart frontend
```
