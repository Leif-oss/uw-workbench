# Pre-Deployment Checklist & Backup Strategy

## 🎯 Overview

This document outlines the **complete process** for safely deploying to the cloud, including:
1. Pre-deployment checks and code review
2. Data backup and protection strategies
3. Deployment procedures
4. Post-deployment verification

---

## 📋 Phase 1: Pre-Deployment Checklist

### 1. Code Quality & Review

#### ✅ Code Review Requirements
- [ ] **All code reviewed** by at least one other developer (if team) or self-review checklist completed
- [ ] **No hardcoded secrets** - all secrets in Secret Manager or environment variables
- [ ] **No hardcoded URLs** - all API URLs use environment variables
- [ ] **No debug code** - remove `print()` statements, debug breakpoints, test code
- [ ] **Error handling** - all endpoints have proper error handling
- [ ] **Input validation** - all user inputs validated
- [ ] **SQL injection protection** - using ORM, no raw SQL with user input

#### ✅ Code Standards
- [ ] **Linting passed** - run `pylint` or `ruff` on backend, `eslint` on frontend
- [ ] **Type checking** - TypeScript compilation passes (`npm run build`)
- [ ] **No console errors** - frontend builds without warnings
- [ ] **Dependencies updated** - all packages up to date and secure
- [ ] **No deprecated APIs** - check for deprecated functions/APIs

#### ✅ Security Review
- [ ] **Secrets audit** - verify no secrets in code, logs, or git history
- [ ] **CORS configured** - only production domains allowed
- [ ] **Authentication required** - all protected endpoints require auth
- [ ] **Rate limiting** - consider adding rate limiting for public endpoints
- [ ] **HTTPS enforced** - all connections use HTTPS in production
- [ ] **Dependency vulnerabilities** - run `pip audit` or `npm audit`

### 2. Database & Data

#### ✅ Database Migrations
- [ ] **All migrations tested** - run `alembic upgrade head` on clean database
- [ ] **Migration rollback tested** - verify `alembic downgrade` works
- [ ] **No data loss migrations** - review migrations for destructive changes
- [ ] **Migration order verified** - migrations are sequential and correct
- [ ] **Production data compatible** - migrations work with existing production data

#### ✅ Data Backup (CRITICAL - Do Before Any Deployment)
- [ ] **Full database backup created** - see "Backup Procedures" below
- [ ] **Backup verified** - test restore from backup in staging
- [ ] **Backup stored securely** - encrypted and in separate location
- [ ] **Backup retention** - keep at least 3 backups (daily, weekly, monthly)
- [ ] **Point-in-time recovery** - Cloud SQL automated backups enabled

#### ✅ Data Validation
- [ ] **Data integrity check** - verify no orphaned records
- [ ] **Foreign key constraints** - all relationships valid
- [ ] **Required fields populated** - no NULL values in required fields
- [ ] **Data export** - export critical data as JSON/CSV backup

### 3. Environment Configuration

#### ✅ Environment Variables
- [ ] **All secrets in Secret Manager** - no secrets in code or config files
- [ ] **Environment variables documented** - list all required variables
- [ ] **Production values verified** - correct API keys, URLs, credentials
- [ ] **CORS origins updated** - only production domains
- [ ] **Database connection string** - verified and tested
- [ ] **SMTP configuration** - email sending configured and tested

#### ✅ Cloud Resources
- [ ] **Cloud SQL instance** - running and accessible
- [ ] **Cloud Run services** - backend and frontend configured
- [ ] **Secret Manager** - all secrets exist and accessible
- [ ] **Service accounts** - proper permissions granted
- [ ] **Cloud Build** - build configuration updated
- [ ] **Storage buckets** - if using file storage, buckets created

### 4. Testing

#### ✅ Local Testing
- [ ] **All features tested locally** - verify functionality works
- [ ] **Database migrations tested** - run on local PostgreSQL
- [ ] **API endpoints tested** - all endpoints respond correctly
- [ ] **Frontend builds** - production build succeeds
- [ ] **Error scenarios tested** - test error handling

#### ✅ Staging Testing (If Available)
- [ ] **Deploy to staging first** - test in staging environment
- [ ] **All features work in staging** - verify functionality
- [ ] **Performance acceptable** - response times reasonable
- [ ] **No errors in logs** - check for warnings/errors
- [ ] **Database migrations work** - test migrations in staging

### 5. Documentation

#### ✅ Deployment Documentation
- [ ] **Deployment steps documented** - clear step-by-step guide
- [ ] **Rollback procedure documented** - how to revert if needed
- [ ] **Environment variables documented** - list all required vars
- [ ] **Database migration procedure** - how to run migrations
- [ ] **Troubleshooting guide** - common issues and solutions

---

## 💾 Phase 2: Backup & Data Protection Strategy

### 1. Database Backup Strategy

#### Automated Backups (Cloud SQL)
**If using Google Cloud SQL:**
- ✅ **Automated backups enabled** - daily backups with point-in-time recovery
- ✅ **Backup retention** - 7-30 days (configurable)
- ✅ **Backup window** - set during low-traffic hours
- ✅ **Point-in-time recovery** - enabled for last 7 days

**Configuration:**
```bash
# Enable automated backups (if not already enabled)
gcloud sql instances patch uw-workbench-db \
  --backup-start-time=02:00 \
  --enable-bin-log \
  --backup
```

#### Manual Backup Script
**Create `scripts/backup_database.sh` or `scripts/backup_database.ps1`:**

```bash
#!/bin/bash
# Database backup script for Cloud SQL PostgreSQL

PROJECT_ID="your-project-id"
INSTANCE_NAME="uw-workbench-db"
BACKUP_BUCKET="gs://your-backup-bucket/database-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="workbench_backup_${TIMESTAMP}"

echo "Creating database backup: ${BACKUP_NAME}"

# Create Cloud SQL backup
gcloud sql backups create \
  --instance=${INSTANCE_NAME} \
  --description="Manual backup before deployment ${TIMESTAMP}"

# Export database to SQL file (alternative method)
gcloud sql export sql ${INSTANCE_NAME} \
  gs://${BACKUP_BUCKET}/${BACKUP_NAME}.sql \
  --database=uw_workbench

echo "Backup completed: ${BACKUP_NAME}"
echo "Backup location: gs://${BACKUP_BUCKET}/${BACKUP_NAME}.sql"
```

**PowerShell version (`scripts/backup_database.ps1`):**
```powershell
# Database backup script for Cloud SQL PostgreSQL
$PROJECT_ID = "your-project-id"
$INSTANCE_NAME = "uw-workbench-db"
$BACKUP_BUCKET = "gs://your-backup-bucket/database-backups"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_NAME = "workbench_backup_$TIMESTAMP"

Write-Host "Creating database backup: $BACKUP_NAME" -ForegroundColor Cyan

# Create Cloud SQL backup
gcloud sql backups create `
  --instance=$INSTANCE_NAME `
  --description="Manual backup before deployment $TIMESTAMP"

# Export database to SQL file
gcloud sql export sql $INSTANCE_NAME `
  "$BACKUP_BUCKET/$BACKUP_NAME.sql" `
  --database=uw_workbench

Write-Host "Backup completed: $BACKUP_NAME" -ForegroundColor Green
Write-Host "Backup location: $BACKUP_BUCKET/$BACKUP_NAME.sql" -ForegroundColor Green
```

#### Backup Schedule
```
Daily:   Automated Cloud SQL backup (retain 7 days)
Weekly:  Manual backup to Cloud Storage (retain 4 weeks)
Monthly: Manual backup to Cloud Storage (retain 12 months)
Before Deployment: ALWAYS create manual backup
```

#### Backup Verification
**Test restore procedure:**
```bash
# Test restore from backup (in staging/test environment)
gcloud sql backups restore BACKUP_ID \
  --backup-instance=uw-workbench-db \
  --restore-instance=uw-workbench-test
```

### 2. Application Data Backup

#### File Uploads Backup
**If storing files in Cloud Storage:**
- ✅ **Versioning enabled** - Cloud Storage versioning
- ✅ **Lifecycle policies** - automatic archival of old files
- ✅ **Regular exports** - periodic exports to separate bucket

**If storing files locally:**
- ⚠️ **Not recommended for production** - use Cloud Storage
- ✅ **Regular file backups** - if must use local storage

#### Configuration Backup
- ✅ **Environment variables** - export and store securely
- ✅ **Secret Manager versions** - keep old secret versions
- ✅ **Cloud Run configurations** - export service configurations

### 3. Backup Storage & Security

#### Storage Location
- ✅ **Separate bucket** - backups in dedicated Cloud Storage bucket
- ✅ **Different region** - consider multi-region for disaster recovery
- ✅ **Encryption** - backups encrypted at rest
- ✅ **Access control** - restricted IAM permissions

#### Backup Retention Policy
```
Daily backups:   7 days
Weekly backups:  4 weeks
Monthly backups: 12 months
Pre-deployment:   Keep until next successful deployment + 7 days
```

---

## 🚀 Phase 3: Deployment Process

### Step 1: Pre-Deployment Backup
```bash
# 1. Create manual database backup
./scripts/backup_database.ps1

# 2. Verify backup was created
gcloud sql backups list --instance=uw-workbench-db

# 3. Export current configuration
gcloud run services describe uw-workbench-backend --region=us-central1 > backup_config.yaml
```

### Step 2: Code Review & Testing
- [ ] Complete all items in "Phase 1: Pre-Deployment Checklist"
- [ ] Run all tests locally
- [ ] Verify no breaking changes

### Step 3: Staging Deployment (If Available)
```bash
# Deploy to staging first
gcloud builds submit --config cloudbuild.yaml --substitutions=_ENVIRONMENT=staging
```

### Step 4: Production Deployment
```bash
# Option 1: Using Cloud Build (Recommended)
gcloud builds submit --config cloudbuild.yaml

# Option 2: Manual deployment
./deploy-to-gcp.ps1
```

### Step 5: Post-Deployment Verification
- [ ] **Health checks pass** - `/health` endpoint responds
- [ ] **Database connected** - verify database connection
- [ ] **Frontend loads** - verify frontend is accessible
- [ ] **API endpoints work** - test critical endpoints
- [ ] **No errors in logs** - check Cloud Run logs
- [ ] **Migrations applied** - verify database schema updated

---

## 🔄 Phase 4: Rollback Procedure

### If Deployment Fails

#### Quick Rollback (Cloud Run)
```bash
# Rollback to previous revision
gcloud run services update-traffic uw-workbench-backend \
  --region=us-central1 \
  --to-revisions=PREVIOUS_REVISION=100

# Or rollback to specific image
gcloud run services update uw-workbench-backend \
  --region=us-central1 \
  --image=gcr.io/PROJECT_ID/uw-workbench-backend:PREVIOUS_TAG
```

#### Database Rollback
```bash
# Restore from backup
gcloud sql backups restore BACKUP_ID \
  --backup-instance=uw-workbench-db \
  --restore-instance=uw-workbench-db
```

---

## ✅ Pre-Deployment Checklist Summary

### Critical (Must Do Before Every Deployment)
1. ✅ **Create database backup**
2. ✅ **Review code changes**
3. ✅ **Test migrations locally**
4. ✅ **Verify environment variables**
5. ✅ **Test in staging (if available)**

### Important (Should Do Regularly)
1. ✅ **Security audit**
2. ✅ **Dependency updates**
3. ✅ **Performance testing**
4. ✅ **Documentation updates**

### Recommended (Best Practices)
1. ✅ **Code review by second person**
2. ✅ **Automated testing**
3. ✅ **Load testing**
4. ✅ **Disaster recovery drill**

---

## 📝 Deployment Log Template

**Use this template to document each deployment:**

```
Deployment Date: [DATE]
Deployed By: [NAME]
Git Commit: [COMMIT_HASH]
Version Tag: [TAG]

Pre-Deployment:
- [ ] Backup created: [BACKUP_ID]
- [ ] Code reviewed
- [ ] Tests passed
- [ ] Migrations tested

Deployment:
- Backend URL: [URL]
- Frontend URL: [URL]
- Database: [INSTANCE_NAME]

Post-Deployment:
- [ ] Health checks pass
- [ ] All features working
- [ ] No errors in logs
- [ ] Performance acceptable

Issues/Notes:
[ANY ISSUES OR NOTES]

Rollback Plan:
[IF NEEDED, ROLLBACK STEPS]
```

---

## 🎯 Quick Reference

### Before Every Deployment
1. **Backup database** - `./scripts/backup_database.ps1`
2. **Review checklist** - Complete Phase 1 checklist
3. **Test locally** - Verify everything works
4. **Deploy to staging** - Test in staging first (if available)
5. **Deploy to production** - Use Cloud Build or manual deployment
6. **Verify deployment** - Check health, logs, functionality

### Backup Commands
```bash
# Create backup
./scripts/backup_database.ps1

# List backups
gcloud sql backups list --instance=uw-workbench-db

# Restore from backup
gcloud sql backups restore BACKUP_ID --backup-instance=uw-workbench-db
```

### Deployment Commands
```bash
# Deploy via Cloud Build
gcloud builds submit --config cloudbuild.yaml

# Manual deployment
./deploy-to-gcp.ps1

# Rollback
gcloud run services update-traffic uw-workbench-backend --to-revisions=PREVIOUS=100
```

---

## 📚 Related Documentation

- `DEPLOYMENT.md` - Detailed deployment guide
- `PRODUCTION_READINESS_PLAN.md` - Production readiness checklist
- `CLOUD_SETUP_COMPLETE.md` - Cloud setup instructions
- `PRODUCTION_STABILITY_GUIDE.md` - Stability and monitoring guide

---

**Last Updated:** [DATE]  
**Next Review:** After each major deployment
