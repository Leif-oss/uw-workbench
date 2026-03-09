# PostgreSQL Setup Options

Docker is not installed. You have two options to set up PostgreSQL:

## Option 1: Install Docker Desktop (Recommended - Easiest)

**Why Docker?**
- One-command setup
- No configuration needed
- Easy to start/stop
- Works exactly like production

**Steps:**
1. Download Docker Desktop for Windows: https://www.docker.com/products/docker-desktop/
2. Install and restart your computer
3. Start Docker Desktop
4. Run: `docker-compose up -d`
5. Done!

**Time:** ~10-15 minutes (mostly download/install)

---

## Option 2: Install PostgreSQL Locally (Alternative)

**Why Local PostgreSQL?**
- No Docker needed
- Runs as Windows service
- More traditional setup

**Steps:**
1. Download PostgreSQL 15+ from: https://www.postgresql.org/download/windows/
2. Run installer:
   - Choose port: **5432** (default)
   - Set password: **dev_password_change_me** (or remember what you choose)
   - Installation directory: default is fine
3. Create database:
   ```powershell
   # Open Command Prompt or PowerShell
   psql -U postgres
   # Then in psql:
   CREATE DATABASE uw_workbench;
   CREATE USER uw_workbench WITH PASSWORD 'dev_password_change_me';
   GRANT ALL PRIVILEGES ON DATABASE uw_workbench TO uw_workbench;
   \q
   ```
4. Update `backend/.env`:
   ```env
   DATABASE_URL=postgresql://uw_workbench:dev_password_change_me@localhost:5432/uw_workbench
   ```

**Time:** ~15-20 minutes

---

## Quick Start (If PostgreSQL Already Installed)

If you already have PostgreSQL installed, we just need to:
1. Create the database
2. Update the `.env` file
3. Run migrations

Let me check if PostgreSQL is already running...


