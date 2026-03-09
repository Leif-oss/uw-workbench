# VPS Setup Checklist - Quick Reference

Use this checklist to set up your VPS quickly and efficiently.

## ✅ Pre-Setup

- [ ] VPS provisioned (Ubuntu 22.04)
- [ ] SSH access configured
- [ ] Domain DNS configured (optional, for HTTPS)
- [ ] Firewall allows ports 22, 80, 443

## ✅ Initial Setup (One Time)

### 1. Connect to VPS

```bash
ssh user@your-vps-ip
```

### 2. Install Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker (if not installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose (if not installed)
sudo apt install docker-compose-plugin -y

# Install inotify-tools (for watch mode)
sudo apt install inotify-tools -y

# Log out and back in (or run: newgrp docker)
```

### 3. Clone Repository

```bash
# Install Git if needed
sudo apt install git -y

# Clone your repository
git clone <your-repo-url> uw-workbench
cd uw-workbench
```

### 4. Configure Environment

```bash
# Copy environment template
cp env.example .env

# Edit with your values
nano .env
```

**Required changes:**
- [ ] `POSTGRES_PASSWORD` - Strong password
- [ ] `FRONTEND_URL` - Your domain or IP
- [ ] `CORS_ORIGINS` - Match your FRONTEND_URL
- [ ] `VITE_API_URL` - Set to `{FRONTEND_URL}/api`
- [ ] `AI_API_KEY` - If using AI features
- [ ] SMTP settings - If using email features

### 5. Configure Caddyfile

```bash
# Edit Caddyfile
nano Caddyfile
```

**Options:**
- [ ] **With domain:** Replace `workbench.example.com` with your domain
- [ ] **IP only:** Comment out domain block, uncomment `:80` block

### 6. Make Scripts Executable

```bash
chmod +x scripts/*.sh
```

### 7. Deploy Application

```bash
# Run automated deployment
./scripts/vps-quick-deploy.sh
```

**OR manually:**

```bash
# Build
docker compose -f docker-compose.prod.yml build

# Start
docker compose -f docker-compose.prod.yml up -d

# Verify
docker compose -f docker-compose.prod.yml ps
curl http://localhost/api/health
```

## ✅ Post-Deployment

### 1. Verify Services

```bash
# Check all services are running
docker compose -f docker-compose.prod.yml ps

# All should show "Up" status
```

### 2. Test Access

```bash
# With domain
curl https://your-domain.com/api/health

# With IP
curl http://your-vps-ip/api/health
```

### 3. Create Initial Admin User

```bash
# Access backend container
docker exec -it uw-workbench-backend bash

# Run seed script
python -m backend.scripts.seed_data

# Or use admin setup endpoint
curl -X POST http://localhost/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "setup_token": "YOUR_SETUP_TOKEN",
    "email": "admin@example.com",
    "password": "secure-password",
    "name": "Admin User"
  }'
```

### 4. Setup Automated Backups

```bash
# Test backup
./scripts/backup-database.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * cd /path/to/uw-workbench && ./scripts/backup-database.sh >> /var/log/uw-workbench-backup.log 2>&1
```

## ✅ Daily Development Workflow

### Option 1: Watch Mode (Recommended)

```bash
# Start watch mode
./scripts/vps-watch.sh

# Code normally - auto-deploys on save
# Stop with Ctrl+C
```

### Option 2: Manual Updates

```bash
# Update everything
./scripts/vps-update.sh

# Update backend only
./scripts/vps-update.sh backend

# Update frontend only
./scripts/vps-update.sh frontend
```

## ✅ Troubleshooting

### Services Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check status
docker compose -f docker-compose.prod.yml ps

# Restart
docker compose -f docker-compose.prod.yml restart
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose -f docker-compose.prod.yml ps postgres

# Check database logs
docker compose -f docker-compose.prod.yml logs postgres

# Verify DATABASE_URL in backend
docker exec uw-workbench-backend env | grep DATABASE_URL
```

### CORS Errors

```bash
# Verify CORS_ORIGINS in .env
cat .env | grep CORS_ORIGINS

# Restart backend
docker compose -f docker-compose.prod.yml restart backend
```

### SSL Certificate Issues

```bash
# Check Caddy logs
docker compose -f docker-compose.prod.yml logs caddy

# Verify DNS
nslookup your-domain.com

# Restart Caddy
docker compose -f docker-compose.prod.yml restart caddy
```

## ✅ Security Checklist

- [ ] Changed default `POSTGRES_PASSWORD`
- [ ] Set `CORS_ORIGINS` to actual domain(s)
- [ ] Firewall configured (only ports 22, 80, 443 open)
- [ ] Using HTTPS (automatic with Caddy + domain)
- [ ] `.env` file not committed to Git
- [ ] Regular backups configured
- [ ] Strong admin password set
- [ ] Updated all default credentials

## ✅ Performance Optimization

- [ ] Monitor disk space: `df -h`
- [ ] Clean Docker cache: `docker system prune`
- [ ] Monitor resource usage: `docker stats`
- [ ] Check backup disk usage: `du -sh backups/`

## 📚 Quick Reference

### Essential Commands

```bash
# Update app
./scripts/vps-update.sh

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check status
docker compose -f docker-compose.prod.yml ps

# Restart service
docker compose -f docker-compose.prod.yml restart <service>

# Backup database
./scripts/backup-database.sh

# Watch mode
./scripts/vps-watch.sh
```

### File Locations

- Environment: `.env`
- Caddy config: `Caddyfile`
- Backups: `backups/`
- Logs: `docker compose logs`
- Docker compose: `docker-compose.prod.yml`

---

**Ready?** Start with Step 1 and work through the checklist!
