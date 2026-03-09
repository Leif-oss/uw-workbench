# How to Get Your Code to VPS

## Problem: Files Don't Exist on VPS

The code files aren't on your VPS yet. You need to upload them first.

## Step 1: Navigate to Project Directory

```bash
# You're probably in /root, need to go to project
cd /root/uw-workbench

# Check if directory exists
ls -la
```

If the directory doesn't exist, you need to create it and upload code.

## Step 2: Get Code to VPS

### Option A: Using Git (If Code is in Repository)

```bash
cd /root

# If repo doesn't exist, clone it
git clone <your-repo-url> uw-workbench
cd uw-workbench

# Or if it exists, pull latest
cd uw-workbench
git pull origin production  # or your branch name
```

### Option B: Upload from Local Machine (Recommended)

**On your Windows machine (PowerShell):**

```powershell
# Navigate to your project directory
cd C:\Projects\uw-workbench

# Upload entire project
scp -r . root@157.245.172.164:/root/uw-workbench
```

**Then on VPS:**
```bash
cd /root/uw-workbench
ls -la frontend/src/pages/EmailToolsPage.tsx  # Should exist now
```

### Option C: Upload Specific Directories (Faster)

If you only changed certain parts:

```powershell
# From your Windows machine
cd C:\Projects\uw-workbench

# Upload frontend
scp -r frontend root@157.245.172.164:/root/uw-workbench/

# Upload backend
scp -r backend root@157.245.172.164:/root/uw-workbench/

# Upload docker files
scp docker-compose.prod.yml root@157.245.172.164:/root/uw-workbench/
scp Caddyfile root@157.245.172.164:/root/uw-workbench/
```

## Step 3: Verify Files Are There

```bash
# On VPS
cd /root/uw-workbench

# Check key files exist
ls -la frontend/src/pages/EmailToolsPage.tsx
ls -la frontend/src/layout/Sidebar.tsx
ls -la backend/routers/email_templates.py
ls -la docker-compose.prod.yml
```

## Step 4: Rebuild Docker Images

```bash
cd /root/uw-workbench

# Rebuild with new code
docker compose -f docker-compose.prod.yml build --no-cache

# Start services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps
```

## Complete Workflow

### From Your Local Machine:

```powershell
# 1. Make sure you're in project directory
cd C:\Projects\uw-workbench

# 2. Upload everything to VPS
scp -r . root@157.245.172.164:/root/uw-workbench
```

### Then on VPS:

```bash
# 3. Navigate to project
cd /root/uw-workbench

# 4. Verify files
ls -la frontend/src/pages/EmailToolsPage.tsx

# 5. Rebuild and start
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# 6. Check logs
docker compose -f docker-compose.prod.yml logs -f
```

## Troubleshooting Upload

### If SCP is slow:
- Upload only changed directories
- Use SFTP client (FileZilla, WinSCP)
- Compress first: `tar -czf project.tar.gz .` then upload

### If files still missing:
```bash
# Check what's actually there
cd /root/uw-workbench
find . -name "EmailToolsPage.tsx"
find . -name "Sidebar.tsx"
```

### If directory structure wrong:
```bash
# Check structure
cd /root/uw-workbench
ls -la
tree -L 2  # if tree is installed
```
