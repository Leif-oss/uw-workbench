# Project Structure - Self-Contained Configuration

This document confirms that **everything in this application is contained within the working folder** (`C:\Projects\uw-workbench`).

## Project Root: `C:\Projects\uw-workbench`

### Key Directories

1. **`.venv/`** - Python virtual environment (all dependencies installed here)
   - Location: `C:\Projects\uw-workbench\.venv\`
   - All Python packages are installed in this project-specific virtual environment
   - **Never uses external virtual environments**

2. **`private/`** - Private data (not tracked by Git)
   - `private/databases/workbench.db` - SQLite database (absolute path: `C:\Projects\uw-workbench\private\databases\workbench.db`)
   - `private/uploads/` - File uploads
   - `private/logs/` - Application logs

3. **`backend/`** - FastAPI backend
   - All Python code
   - `database.py` - Uses absolute paths relative to project root
   - `requirements.txt` - All dependencies listed

4. **`frontend/`** - React/TypeScript frontend
   - `node_modules/` - NPM dependencies
   - `dist/` - Build output

## Database Configuration

The database path is **always** calculated relative to the project root:

```python
# backend/database.py
PROJECT_ROOT = Path(__file__).parent.parent.resolve()  # C:\Projects\uw-workbench
db_file = PROJECT_ROOT / "private" / "databases" / "workbench.db"
DATABASE_URL = f"sqlite:///{db_file.as_posix()}"
```

Result: `sqlite:///C:/Projects/uw-workbench/private/databases/workbench.db`

## Virtual Environment

- **Location**: `C:\Projects\uw-workbench\.venv\`
- **Activation**: `.\.venv\Scripts\Activate.ps1` (PowerShell)
- **Python executable**: `C:\Projects\uw-workbench\.venv\Scripts\python.exe`
- **All dependencies installed here** - never uses external venvs

## Startup Scripts

### `start_backend.ps1`
- Activates the project's virtual environment (`.venv`)
- Sets `PYTHONPATH` to project root
- Starts FastAPI server on port 8000
- **Guarantees** use of project's Python environment

### `start_frontend.ps1`
- Changes to `frontend/` directory
- Runs `npm run dev` (Vite dev server on port 5173)

## Verification

To verify everything is self-contained:

```powershell
# Check Python is from project venv
cd C:\Projects\uw-workbench
.\.venv\Scripts\python.exe -c "import sys; print(sys.executable)"
# Should output: C:\Projects\uw-workbench\.venv\Scripts\python.exe

# Check database path
.\.venv\Scripts\python.exe -c "from backend.database import DATABASE_URL; print(DATABASE_URL)"
# Should output: sqlite:///C:/Projects/uw-workbench/private/databases/workbench.db
```

## Important Notes

1. **Never uses external virtual environments** - The app will only use `.venv` in the project root
2. **All paths are absolute** - Database and file paths are calculated from project root
3. **No external dependencies** - Everything needed is in the project folder
4. **Startup scripts ensure isolation** - They explicitly activate the project's venv and set paths

## Dependencies

All Python dependencies are listed in `backend/requirements.txt` and installed in `.venv/`:
- fastapi
- uvicorn
- sqlalchemy
- pydantic
- email-validator (required for EmailStr validation)
- bcrypt (for password hashing)
- And all other required packages

