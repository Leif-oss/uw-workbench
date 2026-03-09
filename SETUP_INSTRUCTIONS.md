# Setup Instructions for UW Workbench

This guide will help you set up and run the UW Workbench application from scratch in Cursor or any development environment.

## Prerequisites

Before starting, ensure you have the following installed:

1. **Python 3.10 or higher**
   - Download from: https://www.python.org/downloads/
   - During installation, check "Add Python to PATH"
   - Verify installation: `python --version`

2. **Node.js 18 or higher and npm**
   - Download from: https://nodejs.org/
   - This includes npm automatically
   - Verify installation: 
     - `node --version`
     - `npm --version`

3. **Git** (if cloning from repository)
   - Download from: https://git-scm.com/downloads
   - Verify installation: `git --version`

4. **SQLite** (usually included with Python)
   - Database file will be created automatically

## Step 1: Extract/Clone the Project

If you have a zip file:
1. Extract the zip file to your desired location (e.g., `C:\Projects\uw-workbench`)

If cloning from a repository:
```bash
git clone <repository-url>
cd uw-workbench
```

## Step 2: Database Setup (PostgreSQL Required)

### 2.1 Start PostgreSQL Database

**Using Docker Compose (Recommended):**

From the project root:
```bash
docker-compose up -d
```

This will start a PostgreSQL 15 database on port 5432.

**Manual PostgreSQL Setup (Alternative):**

If you prefer to install PostgreSQL locally:
1. Install PostgreSQL 15+ from https://www.postgresql.org/download/
2. Create a database: `createdb uw_workbench`
3. Note your connection string for later

**Important:** SQLite is NOT supported. PostgreSQL is required for both development and production.

### 2.2 Verify Database is Running

```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# Or test connection
psql -h localhost -U uw_workbench -d uw_workbench
# Password: dev_password_change_me
```

## Step 3: Backend Setup

### 3.1 Navigate to Backend Directory

```bash
cd backend
```

### 3.2 Create Virtual Environment

**Windows (PowerShell):**
```powershell
python -m venv ..\.venv
..\.venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**
```cmd
python -m venv ..\.venv
..\.venv\Scripts\activate.bat
```

**macOS/Linux:**
```bash
python3 -m venv ../.venv
source ../.venv/bin/activate
```

You should see `(.venv)` in your terminal prompt when activated.

### 3.3 Install Python Dependencies

```bash
pip install -r requirements.txt
```

This will install all required packages including:
- FastAPI
- SQLAlchemy
- Pydantic
- Uvicorn
- Alembic
- psycopg2-binary (PostgreSQL driver)
- And other dependencies

### 3.4 Create Environment File

Create a `.env` file in the `backend` directory:

**Windows (PowerShell):**
```powershell
cd backend
New-Item -Path .env -ItemType File
```

**macOS/Linux:**
```bash
cd backend
touch .env
```

Edit the `.env` file and add the following (adjust values as needed):

```env
# Database (PostgreSQL - REQUIRED)
# For local development with Docker Compose:
DATABASE_URL=postgresql://uw_workbench:dev_password_change_me@localhost:5432/uw_workbench

# For Cloud SQL (production):
# CLOUD_SQL_CONNECTION_NAME=project:region:instance
# DB_USER=postgres
# DB_PASSWORD=your-secure-password
# DB_NAME=uw_workbench

# CORS Origins (comma-separated list)
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Environment
ENVIRONMENT=development

# OpenAI API Key (required for AI features and document extraction)
AI_API_KEY=sk-your-openai-api-key-here
AI_MODEL=gpt-4o

# Email Configuration (optional - for password reset emails)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
# SMTP_FROM=your-email@gmail.com
```

**Important Notes:**
- **PostgreSQL is REQUIRED** - SQLite is not supported
- Use the DATABASE_URL shown above for local development with Docker Compose
- Replace `sk-your-openai-api-key-here` with your actual OpenAI API key
- Get your API key from: https://platform.openai.com/account/api-keys

### 3.5 Run Database Migrations

**Important:** Run migrations to create all database tables:

```bash
cd backend
alembic upgrade head
```

This will create all necessary database tables in PostgreSQL.

### 3.6 Seed Initial Data (Optional but Recommended)

After migrations, seed initial data (like default office):

```bash
python -m backend.scripts.seed_data
```

This creates a default office if none exists. All other data (users, employees, agencies) must be added manually.

### 3.7 Create Initial Admin User (Optional)

If you need to create an admin user, use one of these methods:

**Option A: Using the setup-admin endpoint** (if no admin exists yet):
- Visit the setup page and follow the prompts

**Option B: Using the script:**
```bash
python -m backend.create_admin_user
```

**Note:** Make sure you've run seed_data.py first if no offices exist.

## Step 3: Frontend Setup

### 3.1 Navigate to Frontend Directory

From the project root:
```bash
cd frontend
```

### 3.2 Install Node Dependencies

```bash
npm install
```

This will install all required packages including:
- React
- TypeScript
- Vite
- React Router
- And other dependencies

**Note:** This may take a few minutes.

## Step 4: Running the Application

You need to run both the backend and frontend servers.

### 4.1 Start Backend Server

**Option A: Using the startup script (Windows)**

From project root, in PowerShell:
```powershell
.\start_backend.ps1
```

**Option B: Manual start**

From project root:
```bash
# Activate virtual environment first
.venv\Scripts\Activate.ps1  # Windows PowerShell
# OR
.venv\Scripts\activate.bat  # Windows CMD
# OR
source .venv/bin/activate   # macOS/Linux

# Set PYTHONPATH
$env:PYTHONPATH = $PWD  # Windows PowerShell
# OR
export PYTHONPATH=$(pwd)  # macOS/Linux

# Start server
python -m uvicorn backend.main:app --reload --port 8000 --host 127.0.0.1
```

The backend should start on: **http://127.0.0.1:8000**

You can verify it's running by visiting: **http://127.0.0.1:8000/docs** (FastAPI Swagger documentation)

### 4.2 Start Frontend Server

Open a **new terminal window** and:

```bash
cd frontend
npm run dev
```

The frontend should start on: **http://localhost:5173**

**Note:** Keep both terminals open - you need both servers running simultaneously.

## Step 5: Access the Application

1. Open your browser and navigate to: **http://localhost:5173**

2. If this is the first time setup, you may need to:
   - Create an admin user (if you didn't use the script)
   - Log in with your credentials

3. The application should now be running!

## Troubleshooting

### Backend Issues

**Port 8000 already in use:**
- Kill the process using port 8000:
  ```powershell
  # Windows
  netstat -ano | findstr :8000
  taskkill /PID <PID> /F
  ```

**Database errors:**
- Ensure the `private/databases/` directory exists
- Check that the `DATABASE_URL` in `.env` is correct
- Run migrations again: `alembic upgrade head`

**Import errors:**
- Ensure virtual environment is activated
- Verify `PYTHONPATH` is set to project root
- Reinstall dependencies: `pip install -r requirements.txt`

### Frontend Issues

**Port 5173 already in use:**
- The dev server will automatically try the next available port
- Check the terminal output for the actual port

**Module not found errors:**
- Delete `node_modules` folder and `package-lock.json`
- Run `npm install` again

**Cannot connect to backend:**
- Verify backend is running on port 8000
- Check `CORS_ORIGINS` in backend `.env` includes `http://localhost:5173`
- Check browser console for errors

### Common Configuration Issues

**AI features not working:**
- Verify `AI_API_KEY` is set in `backend/.env`
- Ensure API key starts with `sk-` and is valid
- Check backend console for API key errors

**Email features not working:**
- Email is optional for basic functionality
- If needed, configure SMTP settings in `backend/.env`
- For Gmail, you may need an "App Password" instead of regular password

## Project Structure

```
uw-workbench/
├── backend/                 # Python FastAPI backend
│   ├── alembic/            # Database migrations
│   ├── routers/            # API route handlers
│   ├── models.py           # Database models
│   ├── schemas.py          # Pydantic schemas
│   ├── crud.py             # Database operations
│   ├── main.py             # FastAPI app entry point
│   └── requirements.txt    # Python dependencies
├── frontend/               # React TypeScript frontend
│   ├── src/
│   │   ├── pages/         # React pages
│   │   ├── components/    # React components
│   │   └── api/           # API client
│   └── package.json       # Node dependencies
├── private/                # Private files (not in git)
│   ├── databases/         # SQLite database files
│   └── logs/              # Application logs
└── .venv/                  # Python virtual environment
```

## Next Steps

1. **Review the codebase:**
   - Read `DEVELOPER_OVERVIEW.md` for detailed architecture information
   - Check `README.md` for project-specific notes

2. **Set up your development workflow:**
   - Configure your IDE/editor (Cursor, VS Code, etc.)
   - Set up Git (if using version control)
   - Configure linting and formatting

3. **Explore the application:**
   - Visit the API docs: http://127.0.0.1:8000/docs
   - Explore different pages in the frontend
   - Test features like document upload, AI assistant, etc.

## Getting Help

If you encounter issues:

1. Check the console logs (both backend and frontend terminals)
2. Review error messages carefully
3. Verify all prerequisites are installed correctly
4. Ensure environment variables are set correctly
5. Check that all dependencies are installed

For more detailed information, see `DEVELOPER_OVERVIEW.md`.

## Quick Reference Commands

**Backend:**
```bash
# Activate venv
.venv\Scripts\Activate.ps1  # Windows
source .venv/bin/activate   # macOS/Linux

# Run migrations
cd backend
alembic upgrade head

# Start server
python -m uvicorn backend.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install          # First time only
npm run dev          # Start dev server
npm run build        # Build for production
```

---

**Congratulations!** You should now have the UW Workbench application running locally. 🎉

