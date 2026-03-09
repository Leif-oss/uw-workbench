# Quick Start - Get PostgreSQL Running NOW

## Fastest Option: Docker Desktop

### Step 1: Install Docker Desktop
1. **Download:** https://www.docker.com/products/docker-desktop/
2. **Install:** Run the installer (follow default options)
3. **Restart:** Your computer (required)
4. **Start:** Docker Desktop application

### Step 2: Start PostgreSQL
Once Docker Desktop is running, open PowerShell in this folder and run:
```powershell
docker-compose up -d
```

### Step 3: Verify It's Running
```powershell
docker ps
```
You should see a container named `uw-workbench-postgres` running.

### Step 4: Continue with Setup
Once PostgreSQL is running, we'll:
- Update your `.env` file
- Run migrations
- Start the backend
- Start testing!

---

## Alternative: Install PostgreSQL Locally

If you prefer not to use Docker:

1. **Download PostgreSQL:** https://www.postgresql.org/download/windows/
   - Choose PostgreSQL 15 or newer
   - During installation:
     - Port: 5432 (default)
     - Password: `dev_password_change_me` (remember this!)
     - Everything else: defaults are fine

2. **Create Database:**
   ```powershell
   # Find PostgreSQL bin folder (usually in Program Files)
   cd "C:\Program Files\PostgreSQL\15\bin"
   .\psql.exe -U postgres
   ```
   
   Then in the psql prompt:
   ```sql
   CREATE DATABASE uw_workbench;
   CREATE USER uw_workbench WITH PASSWORD 'dev_password_change_me';
   GRANT ALL PRIVILEGES ON DATABASE uw_workbench TO uw_workbench;
   \q
   ```

3. **Update `.env` file** (we'll do this after installation)

---

## Which Should You Choose?

**Docker Desktop (Recommended):**
- ✅ Faster setup (~10 minutes)
- ✅ One command to start: `docker-compose up -d`
- ✅ Matches production environment
- ✅ Easy to reset/clean: `docker-compose down -v`

**Local PostgreSQL:**
- ✅ No Docker needed
- ✅ Traditional Windows service
- ⚠️ More configuration steps
- ⚠️ Harder to reset

**My Recommendation: Docker Desktop** - It's faster and we already have everything configured for it.

---

## After Installation

Once PostgreSQL is running (either way), let me know and I'll:
1. ✅ Update your `.env` file
2. ✅ Run database migrations
3. ✅ Seed initial data
4. ✅ Start the backend server
5. ✅ Get you testing!

**Ready?** Choose Docker Desktop or Local PostgreSQL, install it, then let me know when it's done!


