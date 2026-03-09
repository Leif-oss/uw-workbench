# DigitalOcean VPS Setup Guide

Complete guide for setting up your VPS on DigitalOcean and deploying UW Workbench.

## Step 1: Create DigitalOcean Account

1. **Sign up at:** https://www.digitalocean.com/
2. **Verify email** and complete account setup
3. **Add payment method** (required for VPS creation)

## Step 2: Create Droplet (VPS)

### 2.1 Choose Image

1. Go to **Create → Droplets**
2. **Choose an image:**
   - **Ubuntu 22.04 (LTS)** - Recommended
   - Or Ubuntu 24.04 (LTS) - Also works

### 2.2 Choose Plan

**Recommended for first phase:**
- **Basic Plan**
- **Regular Intel with SSD**
- **$12/month** - 2GB RAM, 1 vCPU, 50GB SSD
- **OR $18/month** - 4GB RAM, 2 vCPU, 80GB SSD (better for multiple users)

**Minimum:**
- $6/month - 1GB RAM (may be slow with multiple users)

### 2.3 Choose Datacenter Region

- Choose closest to your users
- **Examples:** New York, San Francisco, London, etc.

### 2.4 Authentication

**Option A: SSH Keys (Recommended)**
- Add your SSH public key
- More secure, no password needed

**Option B: Password**
- Set root password
- Less secure but easier for first setup

### 2.5 Finalize

- **Hostname:** `uw-workbench` (or your choice)
- **Enable backups:** Optional (adds cost)
- **Click "Create Droplet"**

## Step 3: Initial Server Setup

### 3.1 Connect to Your Droplet

**Option A: Using SSH Key**
```bash
ssh root@YOUR_DROPLET_IP
```

**Option B: Using Password**
```bash
ssh root@YOUR_DROPLET_IP
# Enter password when prompted
```

**Option C: DigitalOcean Console**
- Click "Access" → "Launch Droplet Console" in DigitalOcean dashboard
- Opens browser-based terminal

### 3.2 Create Non-Root User (Recommended)

```bash
# Create new user
adduser workbench
usermod -aG sudo workbench

# Switch to new user
su - workbench

# From now on, use 'workbench' user (or your chosen name)
```

### 3.3 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

## Step 4: Install Prerequisites

### 4.1 Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (replace 'workbench' with your username)
sudo usermod -aG docker workbench

# Log out and back in for group changes
exit
# Then SSH back in
```

### 4.2 Install Docker Compose

```bash
sudo apt install docker-compose-plugin -y
```

### 4.3 Install Additional Tools

```bash
# Git (for cloning repo)
sudo apt install git -y

# inotify-tools (for watch mode)
sudo apt install inotify-tools -y

# Verify installations
docker --version
docker compose version
git --version
```

### 4.4 Configure Firewall

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Step 5: Clone Repository

### 5.1 Get Your Repository URL

You'll need your Git repository URL. Options:

**Option A: GitHub/GitLab**
```bash
# If public repo
git clone https://github.com/yourusername/uw-workbench.git

# If private repo (requires SSH key setup)
git clone git@github.com:yourusername/uw-workbench.git
```

**Option B: Upload via SCP**
```bash
# From your local machine
scp -r /path/to/uw-workbench root@YOUR_DROPLET_IP:/home/workbench/
```

**Option C: Manual File Transfer**
- Use SFTP client (FileZilla, WinSCP)
- Upload project files to `/home/workbench/uw-workbench/`

### 5.2 Navigate to Project

```bash
cd uw-workbench
```

## Step 6: Configure Application

### 6.1 Create Environment File

```bash
cp env.example .env
nano .env
```

**Required changes:**
```env
# Database - CHANGE THIS PASSWORD!
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD_HERE

# Your domain or IP
FRONTEND_URL=http://YOUR_DROPLET_IP
# OR with domain:
# FRONTEND_URL=https://workbench.yourdomain.com

# CORS - Match your FRONTEND_URL
CORS_ORIGINS=http://YOUR_DROPLET_IP
# OR with domain:
# CORS_ORIGINS=https://workbench.yourdomain.com

# API URL - Match your FRONTEND_URL
VITE_API_URL=http://YOUR_DROPLET_IP/api
# OR with domain:
# VITE_API_URL=https://workbench.yourdomain.com/api

# Optional: AI API Key
AI_API_KEY=sk-your-key-here

# Optional: SMTP settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

### 6.2 Configure Caddyfile

```bash
nano Caddyfile
```

**Option A: IP Only (No Domain)**
- Comment out the domain block (add `#` at start of each line)
- Uncomment the `:80` block (remove `#`)

**Option B: With Domain**
- Replace `workbench.example.com` with your actual domain
- Ensure DNS is configured (see Step 7)

**Save:** `Ctrl+X`, then `Y`, then `Enter`

## Step 7: Domain Setup (Optional but Recommended)

### 7.1 Configure DNS

If using a domain:

1. **Add A Record** in your DNS provider:
   - **Type:** A
   - **Name:** `workbench` (or `@` for root domain)
   - **Value:** Your Droplet IP address
   - **TTL:** 3600 (or default)

2. **Wait for DNS propagation** (5-60 minutes)

3. **Verify DNS:**
   ```bash
   nslookup workbench.yourdomain.com
   # Should return your Droplet IP
   ```

### 7.2 Update Caddyfile

```bash
nano Caddyfile
# Replace 'workbench.example.com' with your domain
```

### 7.3 Update .env

```bash
nano .env
# Update FRONTEND_URL, CORS_ORIGINS, VITE_API_URL to use your domain
```

## Step 8: Deploy Application

### 8.1 Make Scripts Executable

```bash
chmod +x scripts/*.sh
```

### 8.2 Run Deployment

**Option A: Automated (Recommended)**
```bash
./scripts/vps-quick-deploy.sh
```

**Option B: Manual**
```bash
# Build
docker compose -f docker-compose.prod.yml build

# Start
docker compose -f docker-compose.prod.yml up -d

# Verify
docker compose -f docker-compose.prod.yml ps
```

### 8.3 Wait for Services

```bash
# Watch logs
docker compose -f docker-compose.prod.yml logs -f

# Or check status
docker compose -f docker-compose.prod.yml ps
```

**Wait until all services show "Up" status (may take 2-5 minutes)**

## Step 9: Verify Deployment

### 9.1 Check Services

```bash
docker compose -f docker-compose.prod.yml ps
```

All should show "Up (healthy)" or "Up"

### 9.2 Test Backend

```bash
curl http://localhost/api/health
```

Should return: `{"status":"ok","db":"reachable"}`

### 9.3 Test Frontend

**With IP:**
```bash
curl http://YOUR_DROPLET_IP
```

**With Domain:**
```bash
curl https://workbench.yourdomain.com
```

### 9.4 Access in Browser

- **IP:** `http://YOUR_DROPLET_IP`
- **Domain:** `https://workbench.yourdomain.com`

## Step 10: Create Initial Admin User

### Option A: Using Seed Script

```bash
docker exec -it uw-workbench-backend bash
python -m backend.scripts.seed_data
exit
```

### Option B: Using API Endpoint

```bash
curl -X POST http://localhost/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "setup_token": "YOUR_SETUP_TOKEN",
    "email": "admin@example.com",
    "password": "secure-password",
    "name": "Admin User"
  }'
```

## Step 11: Setup Backups (Recommended)

### 11.1 Test Backup

```bash
./scripts/backup-database.sh
```

### 11.2 Setup Automated Backups

```bash
crontab -e
```

Add this line (runs daily at 2 AM):
```
0 2 * * * cd /home/workbench/uw-workbench && ./scripts/backup-database.sh >> /var/log/uw-workbench-backup.log 2>&1
```

Save: `Ctrl+X`, then `Y`, then `Enter`

## ✅ You're Done!

Your application should now be accessible at:
- **IP:** `http://YOUR_DROPLET_IP`
- **Domain:** `https://workbench.yourdomain.com` (if configured)

## 🚀 Next: Fast Updates

For daily development, use:

```bash
# Watch mode (auto-deploy on changes)
./scripts/vps-watch.sh

# Or manual updates
./scripts/vps-update.sh backend
./scripts/vps-update.sh frontend
```

## 📊 DigitalOcean Costs

**Monthly:**
- **Basic Droplet:** $12-18/month (2-4GB RAM)
- **Backups:** +20% (optional)
- **Total:** ~$12-22/month

**Hourly (if you test and destroy):**
- Pay only for hours used
- Good for testing

## 🔒 Security Checklist

- [ ] Changed default passwords
- [ ] Firewall configured (ports 22, 80, 443 only)
- [ ] Non-root user created
- [ ] SSH keys configured (if using)
- [ ] HTTPS enabled (if using domain)
- [ ] Regular backups configured

## 🐛 Troubleshooting

### Can't Connect via SSH
- Check DigitalOcean firewall settings
- Verify SSH key is added
- Try password authentication

### Services Won't Start
```bash
docker compose -f docker-compose.prod.yml logs
```

### DNS Not Working
- Wait 5-60 minutes for propagation
- Verify A record points to correct IP
- Check: `nslookup your-domain.com`

### SSL Certificate Issues
- Verify DNS is correct
- Check Caddy logs: `docker compose -f docker-compose.prod.yml logs caddy`
- Restart Caddy: `docker compose -f docker-compose.prod.yml restart caddy`

---

**Ready to start?** Create your DigitalOcean account and follow these steps!
