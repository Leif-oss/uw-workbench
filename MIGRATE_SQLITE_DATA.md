# Migrating Your SQLite Data to PostgreSQL

You don't need to re-enter all your data! I've created a migration script that will automatically transfer everything from your SQLite database to PostgreSQL.

## Quick Migration Guide

### Step 1: Ensure PostgreSQL is Running

```bash
# Start PostgreSQL (if not already running)
docker-compose up -d

# Verify it's running
docker ps | grep postgres
```

### Step 2: Set Up PostgreSQL Database

Make sure your `backend/.env` has:
```env
DATABASE_URL=postgresql://uw_workbench:dev_password_change_me@localhost:5432/uw_workbench
```

### Step 3: Run Migrations on PostgreSQL

This creates the empty tables in PostgreSQL:
```bash
cd backend
alembic upgrade head
```

### Step 4: Run the Migration Script

This will copy all your data from SQLite to PostgreSQL:
```bash
python -m backend.scripts.migrate_sqlite_to_postgresql
```

The script will:
- ✅ Read all data from `private/databases/workbench.db` (or `uw_workbench.db`)
- ✅ Map all relationships (offices, employees, agencies, contacts, etc.)
- ✅ Preserve all foreign keys and relationships
- ✅ Handle duplicate detection (won't create duplicates)
- ✅ Show progress as it migrates each table

### Step 5: Verify the Migration

After migration, verify your data:
```bash
# Check in PostgreSQL
psql -h localhost -U uw_workbench -d uw_workbench -c "SELECT COUNT(*) FROM employees;"
psql -h localhost -U uw_workbench -d uw_workbench -c "SELECT COUNT(*) FROM agencies;"
psql -h localhost -U uw_workbench -d uw_workbench -c "SELECT COUNT(*) FROM contacts;"
```

Or just start the app and check in the UI!

## What Gets Migrated?

The script migrates:
- ✅ Offices
- ✅ Employees (with office assignments)
- ✅ Users (with employee links)
- ✅ Agencies
- ✅ Contacts
- ✅ Logs
- ✅ Tasks
- ✅ Production data
- ✅ Submissions

## Migration Features

**Smart Duplicate Detection:**
- Offices: Matched by `code`
- Employees: Matched by `email`
- Users: Matched by `username` or `email`
- Agencies: Matched by `code`

**Relationship Preservation:**
- Employee → Office relationships
- Agency → Office relationships
- Agency → Primary Underwriter relationships
- Contact → Agency relationships
- Log → Agency/Contact relationships
- And all other foreign key relationships

**Safe Migration:**
- Won't create duplicates
- Uses transactions (rolls back on error)
- Shows progress and errors clearly

## Troubleshooting

### "SQLite database not found"
- Check if `private/databases/workbench.db` exists
- The script looks for: `workbench.db` or `uw_workbench.db`

### "PostgreSQL connection failed"
- Make sure PostgreSQL is running: `docker-compose ps`
- Check `DATABASE_URL` in `backend/.env`
- Verify the database exists

### "Table doesn't exist"
- Run migrations first: `alembic upgrade head`
- The migration script requires empty PostgreSQL tables to exist

### Data Already Exists
- The script will ask if you want to proceed
- It will add to existing data (won't overwrite)
- For a fresh start, you can drop and recreate the PostgreSQL database

## After Migration

Once migration is complete:
1. ✅ Test the application with migrated data
2. ✅ Verify all relationships work correctly
3. ✅ Check that all data appears in the UI
4. ✅ Once verified, you can archive the SQLite database (keep as backup!)

## Backup Recommendation

Before migration, create a backup:
```bash
# Copy SQLite database as backup
cp private/databases/workbench.db private/databases/workbench.db.backup
```

## Need to Start Fresh?

If you prefer to start with a clean database instead:
1. Just run migrations: `alembic upgrade head`
2. Seed initial data: `python -m backend.scripts.seed_data`
3. Re-enter data manually (or skip migration)

---

**Ready to migrate?** Just run: `python -m backend.scripts.migrate_sqlite_to_postgresql`


