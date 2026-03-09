# Production Setup Guide

This document outlines the production setup for the UW Workbench application.

## Features Implemented

### 1. User Management System ✅
- **Database-backed sessions**: Sessions are now stored in the database instead of memory
- **User roles**: Admin and regular user roles with proper permissions
- **User CRUD operations**: Create, read, update, and delete users via API
- **Password management**: Secure password hashing with bcrypt
- **Session expiration**: 24-hour session expiry with automatic cleanup

### 2. Audit Logging ✅
- **Comprehensive audit trails**: All user actions are logged to `audit_logs` table
- **Tracks**: User, action, entity type, IP address, user agent, request details
- **Automatic logging**: Integrated into all CRUD operations

### 3. Database Migrations ✅
- **Alembic migrations**: Version-controlled database schema changes
- **Auto-run on startup**: Migrations run automatically when the container starts
- **Migration script**: `backend/scripts/run_migrations.py` for manual runs

### 4. Cloud SQL Configuration
- **Automated backups**: Configure daily backups at 2:00 AM UTC
- **Binary logging**: Enabled for point-in-time recovery
- **Connection pooling**: Built into Cloud Run

## Setup Steps

### 1. Configure Cloud SQL Backups

```bash
gcloud sql instances patch uw-workbench-db \
  --backup \
  --backup-start-time=02:00 \
  --enable-bin-log \
  --project=ultra-ace-481723-e6
```

### 2. Set Up Environment Variables

The following environment variables should be set in Cloud Run:

**Required:**
- `ENVIRONMENT=production`
- `CORS_ORIGINS=https://your-frontend-url.com`
- `CLOUD_SQL_CONNECTION_NAME=ultra-ace-481723-e6:us-central1:uw-workbench-db`
- `DB_USER=postgres`
- `DB_NAME=uw_workbench`

**Secrets (configured via Secret Manager):**
- `DB_PASSWORD` (from Secret Manager: `db-password`)
- `AI_API_KEY` (from Secret Manager: `ai-api-key`)

### 3. Deploy Backend

```bash
cd backend
gcloud builds submit --tag gcr.io/ultra-ace-481723-e6/uw-workbench-backend

gcloud run deploy uw-workbench-backend \
  --image gcr.io/ultra-ace-481723-e6/uw-workbench-backend:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --add-cloudsql-instances=ultra-ace-481723-e6:us-central1:uw-workbench-db \
  --update-secrets AI_API_KEY=ai-api-key:latest \
  --update-secrets DB_PASSWORD=db-password:latest \
  --update-env-vars "ENVIRONMENT=production,CORS_ORIGINS=https://your-frontend-url.com,CLOUD_SQL_CONNECTION_NAME=ultra-ace-481723-e6:us-central1:uw-workbench-db,DB_USER=postgres,DB_NAME=uw_workbench" \
  --project=ultra-ace-481723-e6
```

### 4. Create Initial Admin User

After deployment, create the initial admin user:

```bash
# Via API (requires authentication - use temporary access)
curl -X POST https://uw-workbench-backend-944484068966.us-central1.run.app/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-secure-password",
    "is_admin": true
  }'
```

Or use the `partner1` user (created automatically on startup with admin privileges).

### 5. Run Database Migrations Manually (if needed)

```bash
# Connect to the Cloud Run container
gcloud run jobs create run-migrations \
  --image gcr.io/ultra-ace-481723-e6/uw-workbench-backend:latest \
  --region us-central1 \
  --set-env-vars "ENVIRONMENT=production,CLOUD_SQL_CONNECTION_NAME=...,DB_USER=...,DB_NAME=..." \
  --add-cloudsql-instances=ultra-ace-481723-e6:us-central1:uw-workbench-db \
  --command python \
  --args "-c,from backend.scripts.run_migrations import run_migrations; run_migrations()"
```

## API Endpoints

### Authentication
- `POST /auth/login` - Login with username/password
- `POST /auth/logout` - Logout (invalidate session)
- `GET /auth/me` - Get current user info

### User Management (Admin only)
- `GET /users` - List all users
- `POST /users` - Create new user
- `GET /users/{user_id}` - Get user details
- `PATCH /users/{user_id}` - Update user
- `DELETE /users/{user_id}` - Delete user

### Audit Logs
- Audit logs are automatically created for all actions
- View via database query: `SELECT * FROM audit_logs ORDER BY timestamp DESC`

## Security Features

1. **Password Hashing**: Bcrypt with automatic salt generation
2. **Session Management**: Database-backed with expiration
3. **Role-Based Access**: Admin and user roles
4. **Audit Logging**: Comprehensive tracking of all actions
5. **CORS Protection**: Configured origins only
6. **SQL Injection Protection**: SQLAlchemy ORM with parameterized queries

## Backup & Recovery

### Automated Backups
- **Daily backups**: Automatic at 2:00 AM UTC
- **Retention**: 7 days (default Cloud SQL setting)
- **Binary logging**: Enabled for point-in-time recovery

### Manual Backup
```bash
gcloud sql backups create \
  --instance=uw-workbench-db \
  --project=ultra-ace-481723-e6
```

### Restore from Backup
```bash
gcloud sql backups restore BACKUP_ID \
  --backup-instance=uw-workbench-db \
  --restore-instance=uw-workbench-db \
  --project=ultra-ace-481723-e6
```

## Monitoring

### Cloud Run Logs
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=uw-workbench-backend" \
  --limit 50 \
  --project=ultra-ace-481723-e6
```

### Database Metrics
- Monitor in Cloud Console: SQL > uw-workbench-db > Monitoring
- Key metrics: CPU, memory, connections, query performance

## Troubleshooting

### Database Connection Issues
1. Check Cloud SQL connection name
2. Verify Secret Manager password is correct
3. Check Cloud Run service account has Cloud SQL Client role
4. Verify network connectivity (Cloud Run should use Unix socket)

### Migration Issues
1. Check migration files in `backend/alembic/versions/`
2. Run migrations manually: `python backend/scripts/run_migrations.py`
3. Check database logs in Cloud Console

### Session Issues
1. Sessions expire after 24 hours
2. Sessions are stored in database - check `sessions` table
3. Old sessions are cleaned up automatically

## Next Steps

1. ✅ User management system
2. ✅ Database-backed sessions
3. ✅ Audit logging
4. ✅ Automated migrations
5. ⏳ Cloud SQL backups (configure manually)
6. ⏳ Production deployment
7. ⏳ Monitoring and alerts setup
8. ⏳ Load testing



