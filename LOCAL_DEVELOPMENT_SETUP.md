# Local Development Setup - Getting Everything Working

## Current Status Check

### Quick Status Check
```powershell
# Check what's running
netstat -ano | findstr ":8000 :5173"
docker ps
```

## Starting Local Development

### Prerequisites

1. **Docker Desktop** - Must be running for PostgreSQL
2. **Python 3.12+** - For backend
3. **Node.js 18+** - For frontend

### Step 1: Start Database

```powershell
# Make sure Docker Desktop is running
# Then start PostgreSQL
docker compose up -d postgres
```

### Step 2: Start Backend

```powershell
# Use the startup script
.\start_backend.ps1
```

Or manually:
```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Set PYTHONPATH
$env:PYTHONPATH = $PWD

# Start server
python -m uvicorn backend.main:app --reload --port 8000 --host 127.0.0.1
```

### Step 3: Start Frontend

```powershell
# Use the startup script
.\start_frontend.ps1
```

Or manually:
```powershell
cd frontend
npm run dev
```

## Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Database**: PostgreSQL on port 5432 (via Docker)

## Common Issues & Fixes

### Backend Won't Start

**Issue**: Port 8000 in use
```powershell
# Find and kill process
Get-Process | Where-Object {$_.ProcessName -like "*python*"} | Stop-Process -Force
```

**Issue**: Database connection failed
```powershell
# Check Docker is running
docker ps

# Restart database
docker compose restart postgres
```

**Issue**: Module not found
```powershell
# Reinstall dependencies
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

### Frontend Won't Start

**Issue**: Port 5173 in use
```powershell
# Find and kill process
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force
```

**Issue**: Dependencies missing
```powershell
cd frontend
npm install
```

### Database Issues

**Issue**: Docker not running
- Start Docker Desktop
- Wait for it to fully start (30-60 seconds)
- Then run: `docker compose up -d postgres`

**Issue**: Database connection error
```powershell
# Check .env file has correct DATABASE_URL
# Should be: postgresql://uw_workbench:dev_password_change_me@localhost:5432/uw_workbench
```

## Development Workflow

### Making Changes

1. **Backend Changes**: Auto-reloads with `--reload` flag
2. **Frontend Changes**: Auto-reloads via Vite HMR
3. **Database Changes**: Need to create migration
   ```powershell
   cd backend
   alembic revision --autogenerate -m "description"
   alembic upgrade head
   ```

### Testing Changes

1. **Backend**: Check http://localhost:8000/docs
2. **Frontend**: Refresh browser at http://localhost:5173
3. **Database**: Use database client or psql

## Quick Start Script

Create a `start-local.ps1` script:

```powershell
# Start everything for local development
Write-Host "Starting local development environment..." -ForegroundColor Green

# Check Docker
if (-not (docker ps 2>&1 | Select-String "CONTAINER")) {
    Write-Host "❌ Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop first" -ForegroundColor Yellow
    exit 1
}

# Start database
Write-Host "Starting PostgreSQL..." -ForegroundColor Cyan
docker compose up -d postgres
Start-Sleep -Seconds 3

# Start backend (in new window)
Write-Host "Starting backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\start_backend.ps1"

# Start frontend (in new window)
Write-Host "Starting frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\start_frontend.ps1"

Write-Host "`n✅ Services starting in separate windows" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:8000" -ForegroundColor Cyan
```

## Verification Checklist

- [ ] Docker Desktop is running
- [ ] PostgreSQL container is running (`docker ps`)
- [ ] Backend is running on port 8000
- [ ] Frontend is running on port 5173
- [ ] Can access http://localhost:5173
- [ ] Can access http://localhost:8000/docs
- [ ] Database connection works
- [ ] Can log in to application

## Next Steps

Once local is working perfectly:
1. Test all features locally
2. Make sure all changes work
3. Then we'll set up a consistent VPS update system
