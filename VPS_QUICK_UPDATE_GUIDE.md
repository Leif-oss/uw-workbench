# VPS Quick Update Guide - Fast Development Workflow

This guide is optimized for the **first phase** where you need to update frequently and quickly.

## 🚀 Quick Start

### Initial Setup (One Time)

```bash
# 1. Make scripts executable
chmod +x scripts/*.sh

# 2. Run initial deployment
./scripts/vps-quick-deploy.sh
```

This will:
- Check prerequisites (Docker, etc.)
- Configure environment
- Build and start all services
- Verify deployment

## ⚡ Fast Update Workflows

### Option 1: Update Everything (Recommended for First Phase)

```bash
./scripts/vps-update.sh
```

**Time:** ~2-5 minutes (depending on changes)

**What it does:**
- Rebuilds backend and frontend
- Restarts services
- Shows status and logs

### Option 2: Update Backend Only

```bash
./scripts/vps-update.sh backend
```

**Time:** ~1-2 minutes

**Use when:**
- Only backend code changed
- API endpoints modified
- Database migrations added

### Option 3: Update Frontend Only

```bash
./scripts/vps-update.sh frontend
```

**Time:** ~2-3 minutes

**Use when:**
- Only frontend code changed
- UI/UX updates
- No backend changes

### Option 4: Force Clean Rebuild

```bash
./scripts/vps-update.sh all --no-cache
```

**Time:** ~5-10 minutes (slower, but clean)

**Use when:**
- Dependencies changed
- Build issues
- Need fresh build

## 🔄 Watch Mode (Auto-Deploy)

For active development, use watch mode to auto-deploy on file changes:

```bash
# Install watch tool (one time)
sudo apt-get install inotify-tools

# Start watch mode
./scripts/vps-watch.sh
```

**What it does:**
- Watches `backend/` and `frontend/src/` for changes
- Automatically rebuilds and deploys when files change
- Shows deployment status

**Stop:** Press `Ctrl+C`

## 📋 Common Update Scenarios

### Scenario 1: Backend API Change

```bash
# 1. Make your changes to backend code
nano backend/routers/employees.py

# 2. Update backend only (fast!)
./scripts/vps-update.sh backend

# 3. Test
curl http://localhost/api/employees
```

**Time:** ~1-2 minutes

### Scenario 2: Frontend UI Change

```bash
# 1. Make your changes
nano frontend/src/pages/EmployeesPage.tsx

# 2. Update frontend only
./scripts/vps-update.sh frontend

# 3. Refresh browser
```

**Time:** ~2-3 minutes

### Scenario 3: Database Migration

```bash
# 1. Create migration locally
cd backend
alembic revision --autogenerate -m "add new field"
alembic upgrade head

# 2. Commit migration file to git
git add alembic/versions/XXXX_add_new_field.py
git commit -m "Add migration"

# 3. On VPS: Pull and update
git pull
./scripts/vps-update.sh backend

# Migrations run automatically on backend startup!
```

**Time:** ~2-3 minutes

### Scenario 4: Environment Variable Change

```bash
# 1. Edit .env
nano .env

# 2. Restart affected service (no rebuild needed!)
docker compose -f docker-compose.prod.yml restart backend

# Or restart all
docker compose -f docker-compose.prod.yml restart
```

**Time:** ~10-30 seconds

### Scenario 5: Multiple Changes

```bash
# 1. Make changes to both backend and frontend
# ... edit files ...

# 2. Update everything
./scripts/vps-update.sh

# 3. Verify
docker compose -f docker-compose.prod.yml ps
```

**Time:** ~3-5 minutes

## 🎯 Optimization Tips for Fast Updates

### 1. Use Layer Caching

Docker automatically caches layers. To maximize cache hits:

- **Don't change** `requirements.txt` or `package.json` unless needed
- **Change code files** at the end of Dockerfile (they're copied last)
- **Use** `--no-cache` only when necessary

### 2. Update Only What Changed

```bash
# Backend change? Only update backend
./scripts/vps-update.sh backend

# Frontend change? Only update frontend  
./scripts/vps-update.sh frontend
```

### 3. Skip Database Restart

Database doesn't need restart for code changes:

```bash
# This is fast - only updates app code
./scripts/vps-update.sh backend
```

### 4. Use Watch Mode for Active Development

```bash
# Start watch mode, then code normally
./scripts/vps-watch.sh

# Every save = automatic deploy!
```

## 📊 Update Time Estimates

| Scenario | Time | Command |
|----------|------|---------|
| Backend code change | 1-2 min | `./scripts/vps-update.sh backend` |
| Frontend code change | 2-3 min | `./scripts/vps-update.sh frontend` |
| Both changed | 3-5 min | `./scripts/vps-update.sh` |
| Env variable change | 10-30 sec | `docker compose restart backend` |
| Clean rebuild | 5-10 min | `./scripts/vps-update.sh --no-cache` |
| Watch mode (auto) | ~2-3 min | `./scripts/vps-watch.sh` |

## 🔍 Monitoring Updates

### Check Status

```bash
# Service status
docker compose -f docker-compose.prod.yml ps

# Health check
curl http://localhost/api/health
```

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Check for Errors

```bash
# Recent errors
docker compose -f docker-compose.prod.yml logs --tail=50 | grep -i error

# Backend errors
docker compose -f docker-compose.prod.yml logs backend | grep -i error
```

## 🐛 Troubleshooting Fast Updates

### Update Fails

```bash
# 1. Check logs
docker compose -f docker-compose.prod.yml logs backend

# 2. Force clean rebuild
./scripts/vps-update.sh all --no-cache

# 3. Check disk space
df -h
```

### Service Won't Start

```bash
# 1. Check service status
docker compose -f docker-compose.prod.yml ps

# 2. View detailed logs
docker compose -f docker-compose.prod.yml logs <service>

# 3. Restart service
docker compose -f docker-compose.prod.yml restart <service>
```

### Changes Not Reflecting

```bash
# 1. Verify code was saved
git status

# 2. Force rebuild without cache
./scripts/vps-update.sh all --no-cache

# 3. Clear browser cache (for frontend)
```

## 📝 Best Practices for First Phase

1. **Use Watch Mode** for active development
   ```bash
   ./scripts/vps-watch.sh
   ```

2. **Update Incrementally** - only what changed
   ```bash
   ./scripts/vps-update.sh backend  # or frontend
   ```

3. **Monitor Logs** during updates
   ```bash
   docker compose -f docker-compose.prod.yml logs -f
   ```

4. **Test After Each Update**
   ```bash
   curl http://localhost/api/health
   ```

5. **Commit Frequently** - easier to rollback if needed
   ```bash
   git add .
   git commit -m "Quick fix"
   ```

## 🎯 Typical First Phase Workflow

```bash
# Morning: Start watch mode
./scripts/vps-watch.sh

# During day: Code normally, auto-deploys on save
# ... make changes ...
# ... save file ...
# ... watch mode auto-deploys ...

# End of day: Stop watch mode (Ctrl+C)
# Commit changes
git add .
git commit -m "Day's work"
git push
```

## 🚨 Emergency Rollback

If an update breaks something:

```bash
# 1. Stop services
docker compose -f docker-compose.prod.yml down

# 2. Checkout previous version
git log  # Find good commit
git checkout <previous-commit-hash>

# 3. Rebuild and start
./scripts/vps-update.sh all --no-cache
```

## 💡 Pro Tips

1. **SSH into VPS** and run updates there (faster than local → git → VPS)
2. **Use screen/tmux** to keep watch mode running
3. **Set up aliases** for common commands:
   ```bash
   alias vps-update='./scripts/vps-update.sh'
   alias vps-logs='docker compose -f docker-compose.prod.yml logs -f'
   alias vps-status='docker compose -f docker-compose.prod.yml ps'
   ```
4. **Monitor disk space** - Docker images can grow
   ```bash
   docker system df
   docker system prune  # Clean up when needed
   ```

---

**Ready to start?** Run `./scripts/vps-quick-deploy.sh` for initial setup!
