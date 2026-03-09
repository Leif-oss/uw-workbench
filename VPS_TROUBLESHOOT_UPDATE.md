# Troubleshooting: VPS Not Showing Local Changes

## Quick Diagnostic Steps

### Step 1: Verify Code is on VPS

```bash
ssh root@157.245.172.164
cd /root/uw-workbench

# Check if recent files exist
ls -la frontend/src/pages/EmailToolsPage.tsx
ls -la frontend/src/layout/Sidebar.tsx

# Check git status (if using git)
git status
git log -1

# Check file modification dates
stat frontend/src/layout/Sidebar.tsx
```

### Step 2: Verify Images Were Rebuilt

```bash
# Check when images were built
docker images | grep uw-workbench

# Check container creation time
docker ps --format "table {{.Names}}\t{{.CreatedAt}}\t{{.Image}}"

# Check if containers are using old images
docker inspect uw-workbench-backend | grep Image
docker inspect uw-workbench-frontend | grep Image
```

### Step 3: Force Complete Rebuild

```bash
cd /root/uw-workbench

# Stop everything
docker compose -f docker-compose.prod.yml down

# Remove old images (optional, frees space)
docker rmi uw-workbench-backend uw-workbench-frontend

# Rebuild WITHOUT cache
docker compose -f docker-compose.prod.yml build --no-cache

# Start services
docker compose -f docker-compose.prod.yml up -d

# Watch logs
docker compose -f docker-compose.prod.yml logs -f
```

### Step 4: Verify Changes in Running Container

```bash
# Check backend code in container
docker exec uw-workbench-backend cat /app/backend/routers/email_templates.py | head -20

# Check frontend code in container
docker exec uw-workbench-frontend ls -la /usr/share/nginx/html

# Check if new routes exist
docker exec uw-workbench-frontend find /usr/share/nginx/html -name "*.js" | xargs grep -l "EmailToolsPage"
```

## Common Issues & Fixes

### Issue 1: Code Not Actually on VPS

**Symptom**: Files don't exist or are old versions

**Fix**:
```bash
# If using git, make sure you're on right branch
git branch
git pull origin production

# If uploading manually, verify files
scp -r frontend/src root@157.245.172.164:/root/uw-workbench/frontend/
scp -r backend root@157.245.172.164:/root/uw-workbench/
```

### Issue 2: Docker Using Cached Layers

**Symptom**: Build completes quickly but changes not included

**Fix**:
```bash
# Force rebuild without cache
docker compose -f docker-compose.prod.yml build --no-cache backend
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d
```

### Issue 3: Frontend Browser Cache

**Symptom**: Frontend changes not visible in browser

**Fix**:
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Clear browser cache
- Try incognito/private window
- Check browser DevTools → Network → Disable cache

### Issue 4: Wrong Files Copied

**Symptom**: Some changes work, others don't

**Fix**:
```bash
# Verify specific files
docker exec uw-workbench-frontend cat /usr/share/nginx/html/index.html
docker exec uw-workbench-backend ls -la /app/backend/routers/
```

### Issue 5: Environment Variables Not Updated

**Symptom**: Config changes not taking effect

**Fix**:
```bash
# Check .env file
cat .env

# Restart services to pick up env changes
docker compose -f docker-compose.prod.yml restart backend frontend
```

## Complete Reset Procedure

If nothing else works:

```bash
cd /root/uw-workbench

# 1. Stop everything
docker compose -f docker-compose.prod.yml down

# 2. Remove all containers and images
docker compose -f docker-compose.prod.yml rm -f
docker rmi uw-workbench-backend uw-workbench-frontend 2>/dev/null

# 3. Get fresh code (choose one):
# Option A: Git
git fetch origin
git reset --hard origin/production

# Option B: Re-upload from local
# (run scp from your local machine)

# 4. Rebuild everything
docker compose -f docker-compose.prod.yml build --no-cache

# 5. Start services
docker compose -f docker-compose.prod.yml up -d

# 6. Verify
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

## Verify Specific Changes

### Check Email Tools Feature

```bash
# Check if route exists in frontend
docker exec uw-workbench-frontend grep -r "email-tools" /usr/share/nginx/html/

# Check if API endpoint exists
curl http://localhost/api/email-templates
```

### Check Sidebar Changes

```bash
# Check if Sidebar.tsx has admin check
docker exec uw-workbench-frontend grep -r "isUserAdmin" /usr/share/nginx/html/
```

### Check Backend Routes

```bash
# Check if email templates router is included
docker exec uw-workbench-backend grep -r "email_templates" /app/backend/main.py
```

## Quick Test Script

Run this to check everything:

```bash
#!/bin/bash
echo "=== Checking VPS Update Status ==="
echo ""

echo "1. Code files:"
ls -lh frontend/src/pages/EmailToolsPage.tsx 2>/dev/null && echo "✅ EmailToolsPage exists" || echo "❌ EmailToolsPage missing"
ls -lh frontend/src/layout/Sidebar.tsx 2>/dev/null && echo "✅ Sidebar.tsx exists" || echo "❌ Sidebar.tsx missing"

echo ""
echo "2. Docker images:"
docker images | grep uw-workbench

echo ""
echo "3. Running containers:"
docker ps | grep uw-workbench

echo ""
echo "4. Backend health:"
curl -s http://localhost/api/health | head -1

echo ""
echo "5. Check if email templates endpoint exists:"
curl -s http://localhost/api/email-templates 2>&1 | head -1
```

## Still Not Working?

1. **Compare file timestamps**:
   ```bash
   # On VPS
   stat frontend/src/layout/Sidebar.tsx
   
   # Compare with local file modification time
   ```

2. **Check build logs**:
   ```bash
   docker compose -f docker-compose.prod.yml logs backend | tail -50
   docker compose -f docker-compose.prod.yml logs frontend | tail -50
   ```

3. **Verify Dockerfile copies files correctly**:
   ```bash
   # Check what's in the image
   docker run --rm uw-workbench-frontend ls -la /usr/share/nginx/html/
   ```

4. **Check for build errors**:
   ```bash
   docker compose -f docker-compose.prod.yml build 2>&1 | grep -i error
   ```
