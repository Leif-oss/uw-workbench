# Fix Database Persistence - Connect Cloud SQL to Cloud Run

## The Problem

Your Cloud SQL instance exists but is **NOT connected** to Cloud Run, so it's using ephemeral SQLite that gets wiped on every restart.

## Solution: Connect Cloud SQL to Cloud Run

### Step 1: Get Connection Name

```powershell
$PROJECT_ID = "ultra-ace-481723-e6"
$CONNECTION_NAME = gcloud sql instances describe uw-workbench-db --project=$PROJECT_ID --format="value(connectionName)"
Write-Host "Connection Name: $CONNECTION_NAME"
```

### Step 2: Check/Create DB_PASSWORD Secret

If the secret doesn't exist, create it:

```powershell
# Get the database password (you'll need to know this or reset it)
$DB_PASSWORD = "YOUR_DB_PASSWORD"  # Replace with actual password

# Create or update the secret
echo $DB_PASSWORD | gcloud secrets create DB_PASSWORD --data-file=- --project=$PROJECT_ID
# Or if it exists:
echo $DB_PASSWORD | gcloud secrets versions add DB_PASSWORD --data-file=- --project=$PROJECT_ID
```

### Step 3: Update Cloud Run Service

```powershell
$PROJECT_ID = "ultra-ace-481723-e6"
$CONNECTION_NAME = "ultra-ace-481723-e6:us-central1:uw-workbench-db"  # Replace with actual from step 1

# Update Cloud Run to use Cloud SQL
gcloud run services update uw-workbench-backend `
    --region=us-central1 `
    --project=$PROJECT_ID `
    --add-cloudsql-instances=$CONNECTION_NAME `
    --set-env-vars="CLOUD_SQL_CONNECTION_NAME=$CONNECTION_NAME,DB_USER=postgres,DB_NAME=uw_workbench" `
    --update-secrets="DB_PASSWORD=DB_PASSWORD:latest"
```

### Step 4: Verify Connection

After updating, check the logs:

```powershell
gcloud run services logs read uw-workbench-backend `
    --region=us-central1 `
    --project=$PROJECT_ID `
    --limit=50 | Select-String -Pattern "Cloud SQL|SQLite|database"
```

You should see:
```
INFO: Successfully connected to Cloud SQL PostgreSQL
```

**NOT:**
```
WARNING: DATABASE_URL not set, using default SQLite database
```

## After Fixing

Once Cloud SQL is connected:
- ✅ Database will persist across container restarts
- ✅ Data won't be lost
- ✅ You'll need to recreate Leif (current data is in SQLite which will be lost)

## Important Notes

1. **Current SQLite data will be lost** - Once you switch to Cloud SQL, the SQLite database won't be used anymore
2. **Recreate Leif** - After connecting Cloud SQL, manually create Leif again
3. **Future data will persist** - Once connected, all data will be stored in Cloud SQL and persist



