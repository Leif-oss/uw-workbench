# Database Migrations on Deployment

## Problem

Previously, database migrations were not running automatically when deploying to Cloud Run. This caused errors like missing tables (e.g., `employee_offices`) because the database schema was out of sync with the code.

## Solution

The application now automatically runs database migrations on startup using FastAPI's `@app.on_event("startup")` hook.

### How It Works

1. When the Cloud Run service starts, FastAPI triggers the `startup_event()` function
2. The function checks the current database revision against the latest migration
3. If migrations are needed, it runs `alembic upgrade head`
4. The app logs the migration status and continues startup

### Benefits

- **Automatic**: No manual steps required
- **Safe**: Checks current revision before running
- **Resilient**: Logs errors but doesn't crash if migrations fail (they might already be applied)
- **Transparent**: Migration status is logged for debugging

### Migration Files

Migrations are stored in `backend/alembic/versions/`:
- `0001_init.py` - Initial schema
- `0002_add_sessions_and_user_roles.py` - Sessions and user roles
- `0003_add_user_security_fields.py` - Security fields
- `0004_add_employee_offices_many_to_many.py` - Employee-Office many-to-many relationship
- `0005_add_missing_tables.py` - Additional tables
- `0006_add_contact_do_not_contact.py` - Contact updates
- `0007_add_draft_intake_system.py` - Draft intake system

### Manual Migration (if needed)

If you need to run migrations manually:

```bash
# Local
cd backend
alembic upgrade head

# Or via the API endpoint (when TEMP_SETUP_MODE=true)
POST /admin/run-migrations
```

### Deployment Process

When deploying to Cloud Run:
1. Code is built and deployed
2. Service starts
3. `startup_event()` runs automatically
4. Migrations are applied if needed
5. App becomes ready to serve requests

No additional steps required!
