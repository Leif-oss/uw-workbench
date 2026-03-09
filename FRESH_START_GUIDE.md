# Fresh Start Guide - PostgreSQL Setup

Starting fresh with PostgreSQL? Perfect! This will help verify everything works correctly.

## Quick Start Steps

### 1. Start PostgreSQL Database

```bash
docker-compose up -d
```

Verify it's running:
```bash
docker ps | grep postgres
```

### 2. Set Up Environment Variables

Create/update `backend/.env`:
```env
# PostgreSQL Connection (REQUIRED)
DATABASE_URL=postgresql://uw_workbench:dev_password_change_me@localhost:5432/uw_workbench

# CORS Origins
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Environment
ENVIRONMENT=development

# OpenAI API Key (for AI features)
AI_API_KEY=sk-your-openai-api-key-here
AI_MODEL=gpt-4o

# Email (optional - for password reset)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
# SMTP_FROM=your-email@gmail.com
```

### 3. Run Database Migrations

This creates all the empty tables:
```bash
cd backend
alembic upgrade head
```

You should see:
```
INFO  [alembic.runtime.migration] Running upgrade ... -> ..., ...
```

### 4. Seed Initial Data (Optional but Recommended)

Creates a default office if none exists:
```bash
python -m backend.scripts.seed_data
```

### 5. Create Your First Admin User

**Option A: Using the setup-admin endpoint**
- Visit the admin setup page
- Use the setup token from environment variable
- Create your admin account

**Option B: Using the script**
```bash
# Make sure seed_data was run first (creates default office)
python -m backend.create_admin_user
```

### 6. Start the Application

**Backend:**
```bash
# From project root
python -m uvicorn backend.main:app --reload --port 8000
```

**Frontend (separate terminal):**
```bash
cd frontend
npm run dev
```

### 7. Verify Everything Works

1. ✅ Backend starts without errors
2. ✅ Frontend connects to backend
3. ✅ You can log in with your admin account
4. ✅ You can create offices, employees, agencies, etc.
5. ✅ All features work correctly

## Testing Checklist

As you test, verify:
- [ ] Can create offices
- [ ] Can create employees (with office assignments)
- [ ] Can create agencies
- [ ] Can create contacts
- [ ] Can create logs
- [ ] Can create production data
- [ ] Relationships work correctly (employee-office, agency-office, etc.)
- [ ] Data persists after restart
- [ ] No errors in console/logs

## Benefits of Starting Fresh

1. **Clean State**: No legacy data issues
2. **Tests the Full Process**: Verifies setup works end-to-end
3. **Learn the System**: Better understanding of the data model
4. **Verify Migration Works**: If you need to migrate later, you'll know the process works

## If You Need Your Old Data Later

No problem! The migration script is always available:
```bash
python -m backend.scripts.migrate_sqlite_to_postgresql
```

Your SQLite databases are still in `private/databases/` as backup.

## Troubleshooting

### "DATABASE_URL environment variable is required"
- Make sure `backend/.env` exists and has `DATABASE_URL` set
- Restart the backend server after changing `.env`

### "Database connection failed"
- Check PostgreSQL is running: `docker-compose ps`
- Verify connection string is correct
- Check PostgreSQL logs: `docker-compose logs postgres`

### "No offices found"
- Run seed script: `python -m backend.scripts.seed_data`
- Or create an office manually via the admin interface

### Tables don't exist
- Run migrations: `alembic upgrade head`
- Check for migration errors

---

**You're all set!** Start with step 1 above and work through each step. This will verify that the PostgreSQL migration was successful and everything works correctly.


