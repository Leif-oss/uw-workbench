# Quick VPS Update Guide

## VPS Connection Details
- **IP Address:** `157.245.172.164`
- **User:** `root`
- **Project Path:** `/root/uw-workbench`

## Quick Update Steps (One Command at a Time)

### Step 1: Connect to VPS
```bash
ssh root@157.245.172.164
```

### Step 2: Navigate to project
```bash
cd /root/uw-workbench
```

### Step 3: Pull latest changes from production
```bash
git fetch origin && git checkout production && git pull origin production
```

### Step 4: Rebuild and restart services
```bash
docker compose -f docker-compose.prod.yml build --no-cache && docker compose -f docker-compose.prod.yml up -d
```

### Step 5: Check status
```bash
docker compose -f docker-compose.prod.yml ps
```

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
