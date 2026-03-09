# VPS Deployment Guide

Complete guide for deploying UW Workbench to a single Ubuntu VPS using Docker Compose.

## Prerequisites

- Ubuntu 22.04 LTS VPS (or similar)
- Root or sudo access
- Domain name (optional, but recommended for HTTPS)
- At least 2GB RAM, 20GB disk space

## Step 1: Initial VPS Setup

### 1.1 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (optional, to run docker without sudo)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### 1.3 Configure Firewall

```bash
# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Step 2: Clone and Configure Application

### 2.1 Clone Repository

```bash
# Install Git if not already installed
sudo apt install git -y

# Clone repository (replace with your repo URL)
git clone <your-repo-url> uw-workbench
cd uw-workbench
```

### 2.2 Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit with your values
nano .env
```

**Required changes in `.env`:**

1. **Database Password**: Change `POSTGRES_PASSWORD` to a strong password
2. **Frontend URL**: Set to your domain or IP
   - With domain: `FRONTEND_URL=https://workbench.example.com`
   - With IP: `FRONTEND_URL=http://YOUR_VPS_IP`
3. **CORS Origins**: Set to match your `FRONTEND_URL`
4. **VITE_API_URL**: Set to `{FRONTEND_URL}/api`
5. **AI API Key** (optional): Add your OpenAI API key if using AI features
6. **SMTP Settings** (optional): Configure if using email features

### 2.3 Configure Caddy (Reverse Proxy)

Edit `Caddyfile`:

**Option A: With Domain (Recommended)**

```caddy
workbench.example.com {
    # ... rest of config
}
```

Replace `workbench.example.com` with your actual domain.

**Option B: IP Only (Testing)**

```caddy
:80 {
    # ... rest of config
}
```

**Important**: Update the `{DOMAIN}` placeholder in `Caddyfile` with your actual domain, or use `:80` for IP-only access.

## Step 3: Build and Start Services

### Option A: Quick Deploy Script (Recommended)

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run automated deployment
./scripts/vps-quick-deploy.sh
```

This script will:
- Check prerequisites
- Configure environment
- Build and start all services
- Verify deployment

### Option B: Manual Deployment

#### 3.1 Build Docker Images

```bash
# Build all services
docker compose -f docker-compose.prod.yml build
```

#### 3.2 Start Services

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

#### 3.3 Verify Services

```bash
# Check backend health
curl http://localhost/api/health

# Check if services are running
docker compose -f docker-compose.prod.yml ps
```

All services should show "Up" status.

## Step 4: Configure Domain (Optional but Recommended)

### 4.1 DNS Configuration

If using a domain, point it to your VPS IP:

```
A Record: workbench.example.com → YOUR_VPS_IP
```

### 4.2 Update Caddyfile

Ensure `Caddyfile` uses your domain (not `:80`).

### 4.3 Restart Caddy

```bash
docker compose -f docker-compose.prod.yml restart caddy
```

Caddy will automatically obtain SSL certificates from Let's Encrypt.

## Step 5: Create Initial Admin User

### 5.1 Access Backend Container

```bash
docker exec -it uw-workbench-backend bash
```

### 5.2 Create Admin User

```bash
# Inside container
python -m backend.scripts.seed_data
```

Or use the admin setup endpoint (if configured):

```bash
# From host
curl -X POST http://localhost/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "setup_token": "YOUR_SETUP_TOKEN",
    "email": "admin@example.com",
    "password": "secure-password",
    "name": "Admin User"
  }'
```

## Step 6: Access Application

### 6.1 With Domain

Open browser: `https://workbench.example.com`

### 6.2 With IP Only

Open browser: `http://YOUR_VPS_IP`

## Step 7: Setup Automated Backups

### 7.1 Make Backup Script Executable

```bash
chmod +x scripts/backup-database.sh
```

### 7.2 Test Backup

```bash
./scripts/backup-database.sh
```

### 7.3 Setup Cron Job (Daily Backups)

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * cd /path/to/uw-workbench && ./scripts/backup-database.sh >> /var/log/uw-workbench-backup.log 2>&1
```

## Fast Update Workflow (First Phase)

**📖 See [VPS_QUICK_UPDATE_GUIDE.md](VPS_QUICK_UPDATE_GUIDE.md) for detailed update workflows**

### Quick Update Commands

```bash
# Update everything (2-5 minutes)
./scripts/vps-update.sh

# Update backend only (1-2 minutes)
./scripts/vps-update.sh backend

# Update frontend only (2-3 minutes)
./scripts/vps-update.sh frontend

# Watch mode - auto-deploy on file changes
./scripts/vps-watch.sh
```

### Typical First Phase Workflow

```bash
# Morning: Start watch mode for auto-deployment
./scripts/vps-watch.sh

# During day: Code normally, changes auto-deploy
# ... make changes, save files ...
# ... watch mode automatically rebuilds and deploys ...

# End of day: Stop watch mode (Ctrl+C), commit changes
git add .
git commit -m "Day's updates"
git push
```

## Maintenance Commands

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f postgres
docker compose -f docker-compose.prod.yml logs -f caddy
```

### Restart Services

```bash
# All services
docker compose -f docker-compose.prod.yml restart

# Specific service
docker compose -f docker-compose.prod.yml restart backend
```

### Stop Services

```bash
docker compose -f docker-compose.prod.yml down
```

### Update Application

```bash
# Pull latest code
git pull

# Quick update (uses scripts - faster!)
./scripts/vps-update.sh

# Or manual rebuild
docker compose -f docker-compose.prod.yml up -d --build
```

### Database Migrations

Migrations run automatically on backend startup. To run manually:

```bash
docker exec -it uw-workbench-backend python -m backend.run_migrations
```

## Troubleshooting

### Services Won't Start

1. Check logs: `docker compose -f docker-compose.prod.yml logs`
2. Verify `.env` file is configured correctly
3. Check disk space: `df -h`
4. Check Docker: `docker ps -a`

### Database Connection Issues

1. Verify PostgreSQL is running: `docker compose -f docker-compose.prod.yml ps postgres`
2. Check database logs: `docker compose -f docker-compose.prod.yml logs postgres`
3. Verify `DATABASE_URL` in backend container environment

### CORS Errors

1. Verify `CORS_ORIGINS` in `.env` matches your actual domain
2. Check browser console for exact error
3. Verify `FRONTEND_URL` is set correctly

### SSL Certificate Issues

1. Check Caddy logs: `docker compose -f docker-compose.prod.yml logs caddy`
2. Verify DNS points to your VPS IP
3. Ensure ports 80 and 443 are open: `sudo ufw status`

### Backup Issues

1. Verify backup directory exists and is writable
2. Check PostgreSQL container is running
3. Verify `POSTGRES_PASSWORD` in `.env` is correct

## Security Checklist

- [ ] Changed default `POSTGRES_PASSWORD`
- [ ] Set `CORS_ORIGINS` to actual domain(s)
- [ ] Configured firewall (only ports 22, 80, 443 open)
- [ ] Using HTTPS (automatic with Caddy + domain)
- [ ] `.env` file is not committed to Git
- [ ] Regular backups configured
- [ ] Strong admin password set
- [ ] Updated all default credentials

## Architecture Overview

```
Internet
   ↓
Caddy (Port 80/443)
   ├─ /api/* → Backend (Port 8000)
   └─ /* → Frontend (Port 3000)
   ↓
PostgreSQL (Port 5432, internal only)
```

All services communicate via Docker internal network. Only Caddy is exposed externally.

## Support

For issues:
1. Check logs: `docker compose -f docker-compose.prod.yml logs`
2. Verify environment variables in `.env`
3. Check service health: `docker compose -f docker-compose.prod.yml ps`
4. Review this guide's troubleshooting section
