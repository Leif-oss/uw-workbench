# Database Strategy Recommendation: SQLite vs PostgreSQL

## 🎯 Your Assessment is Correct

You've identified a real problem. SQLite is causing:
1. **Inconsistencies** between dev and production environments
2. **Auto-created "produced" data** that should be static/seed data
3. **Migration issues** (SQLite workarounds that don't translate to PostgreSQL)
4. **Data persistence issues** in cloud containers
5. **Schema differences** causing deployment surprises

---

## 🔍 Current Problems Identified

### 1. Auto-Created Data (Should Be Static Seed Data)
**Current Issues:**
- `main.py` auto-creates a default "MAIN" office if none exists (lines 36-58)
- `create_admin_user.py` auto-creates an "ADMIN" office if none exists
- `admin.py` setup-admin endpoint creates offices on-the-fly

**Problem:** This "produced" data should be:
- Pre-seeded via migration or seed script
- Consistent across environments
- Not recreated on every deployment

### 2. Table Creation Method
**Current:**
```python
Base.metadata.create_all(bind=engine)  # main.py line 25
```
**Problem:**
- Works in SQLite (dev) but shouldn't run in production
- Bypasses Alembic migrations
- Can cause schema drift
- No migration history tracking

**Should be:**
- Only Alembic migrations in production
- `create_all` only for quick local dev testing

### 3. SQLite-Specific Workarounds
**Found in migrations:**
- `0004_add_employee_offices_many_to_many.py` has SQLite DROP COLUMN workaround
- `0003_add_user_security_fields.py` checks SQLite-specific tables

**Problem:** These workarounds may not work correctly in PostgreSQL or could cause issues.

### 4. Complex Fallback Logic
**Current database.py:**
- Falls back to SQLite if PostgreSQL connection fails (even in cloud)
- Multiple conditional paths
- Production protection exists but could be bypassed

---

## 💡 Recommended Solution: **Remove SQLite Entirely**

### Option 1: PostgreSQL in Docker (RECOMMENDED)

**Pros:**
- ✅ Identical database in dev and production
- ✅ No migration issues or workarounds
- ✅ Same SQL dialect everywhere
- ✅ Proper connection pooling
- ✅ Better performance testing
- ✅ Forces proper setup from the start

**Cons:**
- ⚠️ Requires Docker (but you're already using it for deployment)
- ⚠️ Slightly more complex initial setup

**Implementation:**
1. Use Docker Compose for local PostgreSQL
2. Remove all SQLite code and fallbacks
3. Require PostgreSQL connection (fail fast if not configured)
4. Use seed scripts instead of auto-creation

---

## 📋 Implementation Plan

### Phase 1: Setup Local PostgreSQL (Docker)

**Create `docker-compose.yml` in project root:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: uw-workbench-postgres
    environment:
      POSTGRES_USER: uw_workbench
      POSTGRES_PASSWORD: dev_password_change_me
      POSTGRES_DB: uw_workbench
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U uw_workbench"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

**Benefits:**
- One command to start: `docker-compose up -d`
- Persistent data in Docker volume
- Same PostgreSQL version as production
- Easy to reset: `docker-compose down -v`

### Phase 2: Remove SQLite Code

**Changes needed:**

1. **Simplify `backend/database.py`:**
   - Remove all SQLite fallback logic
   - Require `DATABASE_URL` environment variable
   - Fail fast if database not configured

2. **Remove auto-creation from `main.py`:**
   - Remove `Base.metadata.create_all()` (use migrations only)
   - Remove default office creation
   - Move to seed script

3. **Create seed data script:**
   - `backend/scripts/seed_data.py`
   - Creates initial office if needed
   - Can be run manually or as part of migration

4. **Update migrations:**
   - Remove SQLite-specific workarounds
   - Ensure all migrations are PostgreSQL-compatible

### Phase 3: Update Development Workflow

**New local setup:**
1. Start PostgreSQL: `docker-compose up -d`
2. Set `DATABASE_URL` in `.env`: `postgresql://uw_workbench:dev_password_change_me@localhost:5432/uw_workbench`
3. Run migrations: `alembic upgrade head`
4. Seed data: `python backend/scripts/seed_data.py` (if needed)
5. Start app: `python -m uvicorn backend.main:app --reload`

**Benefits:**
- Same workflow as production
- Same database engine everywhere
- No surprises at deployment

---

## 🛠️ Alternative: Keep SQLite for Quick Testing Only

If you want to keep SQLite for super-quick local testing, use a strict separation:

**Recommended Approach:**
- **Development (Serious Work):** PostgreSQL in Docker (required)
- **Quick Testing:** SQLite allowed, but with warnings
- **Production:** PostgreSQL only (fail fast if not configured)

**Implementation:**
```python
# database.py
is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
allow_sqlite = os.getenv("ALLOW_SQLITE", "false").lower() == "true"

if is_production:
    # Production: PostgreSQL required, no fallback
    if not DATABASE_URL or "sqlite" in DATABASE_URL.lower():
        raise RuntimeError("SQLite not allowed in production!")
    
elif not allow_sqlite:
    # Development: PostgreSQL preferred, SQLite requires explicit opt-in
    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL required. Use PostgreSQL for development. "
            "Set ALLOW_SQLITE=true to allow SQLite (not recommended)."
        )

# Only allow SQLite if explicitly enabled
if "sqlite" in (DATABASE_URL or "").lower() and not allow_sqlite:
    raise RuntimeError("SQLite disabled. Use PostgreSQL.")
```

**Benefits:**
- Forces PostgreSQL for serious development
- Allows SQLite only if explicitly enabled
- Production always uses PostgreSQL

---

## 📊 Comparison: Keep SQLite vs Remove SQLite

| Aspect | Keep SQLite | Remove SQLite |
|--------|-------------|---------------|
| **Dev/Prod Consistency** | ❌ Different engines | ✅ Same engine |
| **Migration Issues** | ❌ SQLite workarounds needed | ✅ Clean migrations |
| **Setup Complexity** | ✅ Simpler (no Docker) | ⚠️ Requires Docker |
| **Production Safety** | ❌ Risk of inconsistencies | ✅ Guaranteed consistency |
| **Performance Testing** | ❌ Can't test properly | ✅ Accurate testing |
| **Auto-creation Issues** | ❌ Hard to catch | ✅ Forces proper seed data |
| **Cloud Deployment** | ❌ Complex fallback logic | ✅ Simple, predictable |

---

## 🎯 My Recommendation

### **Remove SQLite Entirely**

**Why:**
1. You're already using Docker for deployment
2. Docker Compose makes local PostgreSQL easy
3. Eliminates entire class of bugs
4. Forces proper seed data instead of auto-creation
5. Production-ready from day one
6. Better for team collaboration (same DB everywhere)

**Implementation Priority:**
1. **High Priority:** Set up Docker Compose PostgreSQL
2. **High Priority:** Remove auto-creation code, use seed scripts
3. **Medium Priority:** Clean up SQLite fallback logic
4. **Low Priority:** Remove SQLite support entirely

---

## 🚀 Quick Start: PostgreSQL in Docker

**1. Create `docker-compose.yml` (shown above)**

**2. Update `backend/.env`:**
```env
DATABASE_URL=postgresql://uw_workbench:dev_password_change_me@localhost:5432/uw_workbench
ENVIRONMENT=development
```

**3. Start PostgreSQL:**
```bash
docker-compose up -d
```

**4. Run migrations:**
```bash
cd backend
alembic upgrade head
```

**5. Create seed script** (`backend/scripts/seed_data.py`):
```python
"""Seed initial data. Run after migrations."""
from backend.database import SessionLocal
from backend import models

def seed_initial_data():
    db = SessionLocal()
    try:
        # Create default office if none exists
        if db.query(models.Office).count() == 0:
            office = models.Office(code="MAIN", name="Main Office")
            db.add(office)
            db.commit()
            print("Created default office: MAIN - Main Office")
        else:
            print("Offices already exist, skipping seed.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_initial_data()
```

**6. Run seed (one time):**
```bash
python backend/scripts/seed_data.py
```

---

## ✅ Benefits of This Approach

1. **No More Auto-Creation Bugs:** Seed data is explicit and version-controlled
2. **Consistent Environments:** Same DB engine everywhere
3. **Clean Migrations:** No SQLite workarounds needed
4. **Production Ready:** What works locally works in production
5. **Better Testing:** Can test actual PostgreSQL features (JSONB, full-text search, etc.)
6. **Easier Debugging:** Same SQL dialect, same behavior

---

## 📝 Next Steps

If you agree with removing SQLite:

1. I'll create the Docker Compose setup
2. Update `database.py` to require PostgreSQL
3. Remove auto-creation code from `main.py`
4. Create proper seed data scripts
5. Update migrations to remove SQLite workarounds
6. Update documentation

**Should I proceed with implementing this?**

---

**Alternative:** If you want to keep SQLite for quick testing, I can implement the strict separation approach (PostgreSQL required, SQLite opt-in only) with proper warnings.


