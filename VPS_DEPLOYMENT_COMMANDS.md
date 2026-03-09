# VPS Deployment - Copy/Paste Commands

**Your Droplet IP:** `157.245.172.164`

## Quick Start - Copy and Paste These Commands

### Step 1: Connect to Your VPS

```bash
ssh root@157.245.172.164
```

Enter your password when prompted.

---

### Step 2: Update System and Install Docker

Copy and paste this entire block:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
apt install -y docker-compose-plugin

# Install prerequisites
apt install -y git inotify-tools curl wget

# Configure firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Verify installations
docker --version
docker compose version
git --version
```

**Wait for all commands to complete** (may take 5-10 minutes)

---

### Step 3: Get Your Code to the Server

**Option A: If your code is on GitHub/GitLab (Public)**

```bash
cd /root
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git uw-workbench
cd uw-workbench
```

**Option B: If you need to upload from your local machine**

On your **Windows machine** (PowerShell), run:

```powershell
# From your project directory
scp -r . root@157.245.172.164:/root/uw-workbench
```

Then on the VPS:

```bash
cd /root/uw-workbench
```

**Option C: Manual upload via SFTP**
- Use FileZilla, WinSCP, or similar
- Connect to: `157.245.172.164`
- Upload project files to `/root/uw-workbench/`

---

### Step 4: Configure Environment

```bash
cd /root/uw-workbench

# Create .env file
cp env.example .env

# Edit .env file
nano .env
```

**In nano editor:**
- Use arrow keys to navigate
- Edit these values:
  - `POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD`
  - `FRONTEND_URL=http://157.245.172.164`
  - `CORS_ORIGINS=http://157.245.172.164`
  - `VITE_API_URL=http://157.245.172.164/api`
- Save: `Ctrl+X`, then `Y`, then `Enter`

---

### Step 5: Configure Caddyfile (For IP Access)

```bash
nano Caddyfile
```

**Replace the domain block with this:**

```caddy
:80 {
    log {
        output file /var/log/caddy/access.log
        format console
    }

    handle /api/* {
        reverse_proxy backend:8000 {
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    handle {
        reverse_proxy frontend:3000 {
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }
}
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

---

### Step 6: Make Scripts Executable

```bash
chmod +x scripts/*.sh
```

---

### Step 7: Deploy Application

```bash
# Build and start services
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# Watch logs (optional, press Ctrl+C to exit)
docker compose -f docker-compose.prod.yml logs -f
```

**Wait 2-5 minutes for services to start**

---

### Step 8: Verify Deployment

```bash
# Check backend health
curl http://localhost/api/health

# Should return: {"status":"ok","db":"reachable"}
```

---

### Step 9: Access Your Application

Open in browser:
```
http://157.245.172.164
```

---

## Troubleshooting

### Check Service Status
```bash
docker compose -f docker-compose.prod.yml ps
```

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
```

### Restart Services
```bash
docker compose -f docker-compose.prod.yml restart
```

### If Something Fails
```bash
# View detailed logs
docker compose -f docker-compose.prod.yml logs

# Check disk space
df -h

# Check Docker
docker ps -a
```

---

## Next: Create Admin User

After deployment works:

```bash
docker exec -it uw-workbench-backend bash
python -m backend.scripts.seed_data
exit
```

---

**All commands ready to copy/paste!** 🚀
