# Database Issue Explanation

## The Problem

**Your database is using SQLite, which is EPHEMERAL in Cloud Run.**

### What Happened:

1. **Cloud SQL is NOT configured** - The logs show:
   ```
   WARNING: DATABASE_URL not set, using default SQLite database
   ```

2. **Code falls back to SQLite** - When Cloud SQL connection fails, `database.py` creates a SQLite file at `/app/private/databases/workbench.db`

3. **Cloud Run containers are stateless** - Every time the container restarts:
   - The filesystem is wiped
   - The SQLite database file is LOST
   - A NEW empty database is created

4. **This is why Leif disappeared** - When the container restarted (during SMTP password update), the SQLite database was wiped and a new empty one was created.

### Evidence from Logs:

```
2026-01-07 15:12:59 WARNING:  DATABASE_URL not set, using default SQLite database
2026-01-07 15:12:59 INFO:     No offices found. Creating single default office...
```

This shows it's creating a NEW database every time.

## The Solution

You need to set up **Cloud SQL (PostgreSQL)** for persistent storage.

### Option 1: Set Up Cloud SQL (Recommended)

1. **Create Cloud SQL instance** (if not exists):
```bash
gcloud sql instances create uw-workbench-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --project=ultra-ace-481723-e6
```

2. **Create database**:
```bash
gcloud sql databases create uw_workbench \
    --instance=uw-workbench-db \
    --project=ultra-ace-481723-e6
```

3. **Create user and set password**:
```bash
gcloud sql users create workbench_user \
    --instance=uw-workbench-db \
    --password=YOUR_SECURE_PASSWORD \
    --project=ultra-ace-481723-e6
```

4. **Store password in Secret Manager**:
```bash
echo "YOUR_SECURE_PASSWORD" | gcloud secrets create DB_PASSWORD --data-file=- --project=ultra-ace-481723-e6
```

5. **Get connection name**:
```bash
gcloud sql instances describe uw-workbench-db --project=ultra-ace-481723-e6 --format="value(connectionName)"
```

6. **Update Cloud Run service** with Cloud SQL connection:
```bash
gcloud run services update uw-workbench-backend \
    --region=us-central1 \
    --project=ultra-ace-481723-e6 \
    --add-cloudsql-instances=PROJECT_ID:REGION:INSTANCE_NAME \
    --set-env-vars="CLOUD_SQL_CONNECTION_NAME=PROJECT_ID:REGION:INSTANCE_NAME,DB_USER=workbench_user,DB_NAME=uw_workbench" \
    --update-secrets="DB_PASSWORD=DB_PASSWORD:latest"
```

### Option 2: Remove SQLite Fallback (Fail Fast)

Modify `backend/database.py` to NOT fall back to SQLite in production - fail if Cloud SQL isn't configured.

## Immediate Fix

**For now, you need to recreate Leif manually** because the SQLite database was wiped.

1. Log in as `leifkeller` (current admin)
2. Go to Admin page
3. Add Leif manually

**But this will happen again on every container restart until Cloud SQL is set up!**

## Prevention

Once Cloud SQL is set up, your data will persist across container restarts because Cloud SQL is a managed database service, not a file in the container.



