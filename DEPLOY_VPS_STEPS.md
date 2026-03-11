# Deploy to VPS - Step by Step

## Step 1: SSH into Your VPS

**On your local Windows machine (PowerShell), run:**

```powershell
ssh root@157.245.172.164
```

You'll be prompted for your password. After connecting, you'll be on the VPS (Linux server).

## Step 2: Once Connected to VPS, Run These Commands

**After you're connected via SSH, you'll be in a Linux terminal. Then run:**

```bash
cd /root/uw-workbench
git fetch origin
git checkout production
git pull origin production
cd backend
python -m alembic upgrade head
cd ..
./scripts/vps-update.sh
```

## Alternative: One-Liner After SSH

**After SSH'ing in, you can run this single command:**

```bash
cd /root/uw-workbench && git fetch origin && git checkout production && git pull origin production && cd backend && python -m alembic upgrade head && cd .. && ./scripts/vps-update.sh
```

## What You'll See

1. **SSH Connection**: You'll see a Linux prompt like `root@your-vps:~#`
2. **Git Pull**: Downloads latest code from GitHub
3. **Migration**: Adds new database columns
4. **Update Script**: Rebuilds Docker images and restarts services
5. **Status**: Shows which services are running

## If You Don't Have SSH Access

If you need to set up SSH access, you'll need:
- The VPS IP: `157.245.172.164`
- Root password or SSH key
- SSH client (Windows has built-in SSH in PowerShell)

## Quick Reference

**Local Machine (Windows PowerShell):**
```powershell
ssh root@157.245.172.164
```

**VPS (Linux, after SSH):**
```bash
cd /root/uw-workbench && git pull origin production && cd backend && python -m alembic upgrade head && cd .. && ./scripts/vps-update.sh
```
