# Local Development Setup

This guide helps you set up and run the application locally for development and testing.

## Prerequisites

- Python 3.11+
- Node.js 18+ (for frontend)
- (Optional) PostgreSQL if you want to use it instead of SQLite

## Backend Setup

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env` file in the `backend` directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your local settings. For local development, you can leave most values as defaults - it will use SQLite automatically.

### 3. Initialize Database

The database will be automatically created when you start the backend. Tables are created automatically on first run.

### 4. Run Backend

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or use the run script:
```bash
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at: `http://localhost:8000`

**Default users created automatically:**
- `partner1` / `partner1234` (admin)
- `leif` / `1qazxsw2` (admin)
- `leif_uw` / `1qazxsw2` (underwriter)

### 5. Run Database Migrations (Optional)

If you make schema changes:

```bash
cd backend
alembic upgrade head
```

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure API URL

The frontend should already be configured to use `http://localhost:8000` when running locally.

Check `frontend/src/api/client.ts` - it should use `API_BASE_URL` from environment or default to localhost.

### 3. Run Frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at: `http://localhost:5173` (or similar, check the console output)

## Testing the Full Stack Locally

1. **Start Backend:**
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access Application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

4. **Login:**
   - Username: `leif`
   - Password: `1qazxsw2`

## Database Location

### SQLite (Default for Local)
Database file: `private/databases/workbench.db`

This is created automatically in the project root.

### PostgreSQL (Optional)
If you want to use PostgreSQL locally:

1. Install and start PostgreSQL
2. Create database: `createdb uw_workbench`
3. Set in `.env`:
   ```
   DATABASE_URL=postgresql://postgres:password@localhost:5432/uw_workbench
   ```

## Making Changes

### Schema Changes
1. Modify models in `backend/models.py`
2. Create migration: `alembic revision --autogenerate -m "description"`
3. Review migration in `backend/alembic/versions/`
4. Apply: `alembic upgrade head`

### Code Changes
- Backend: Auto-reloads when using `--reload` flag
- Frontend: Auto-reloads via Vite HMR

## Testing Production Features Locally

Most features work the same locally:
- ✅ User authentication and sessions
- ✅ CRUD operations
- ✅ Audit logging
- ✅ All API endpoints

Things that differ:
- ⚠️ SQLite instead of PostgreSQL (but functionally the same)
- ⚠️ No Cloud SQL connection (uses local database)
- ⚠️ Secrets are from `.env` file instead of Secret Manager

## Deployment Workflow

**Recommended workflow:**

1. **Develop locally** - Make changes, test with SQLite
2. **Test locally** - Verify all features work
3. **Test with PostgreSQL** (optional) - Use local PostgreSQL to match production
4. **Deploy to Cloud** - When ready, deploy to Google Cloud Run

```bash
# Deploy backend
cd backend
gcloud builds submit --tag gcr.io/ultra-ace-481723-e6/uw-workbench-backend
gcloud run deploy uw-workbench-backend --image gcr.io/ultra-ace-481723-e6/uw-workbench-backend:latest ...

# Deploy frontend
cd frontend
gcloud builds submit --tag gcr.io/ultra-ace-481723-e6/uw-workbench-frontend
gcloud run deploy uw-workbench-frontend --image gcr.io/ultra-ace-481723-e6/uw-workbench-frontend:latest ...
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8000 (backend)
lsof -ti:8000 | xargs kill -9

# Or change port in uvicorn command
uvicorn main:app --reload --port 8001
```

### Database Locked (SQLite)
- Close any database connections
- Restart the backend server

### CORS Errors
- Ensure `CORS_ORIGINS` in `.env` includes your frontend URL
- Check backend logs for CORS errors

### Users Not Created
- Check backend logs on startup
- Users are created automatically - check database: `sqlite3 private/databases/workbench.db "SELECT * FROM users;"`

## Useful Commands

```bash
# View SQLite database
sqlite3 private/databases/workbench.db

# Check tables
sqlite3 private/databases/workbench.db ".tables"

# Query users
sqlite3 private/databases/workbench.db "SELECT username, is_admin FROM users;"

# Reset database (CAUTION: deletes all data)
rm private/databases/workbench.db
# Restart backend to recreate
```



