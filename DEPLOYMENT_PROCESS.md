# Complete Deployment Process

## Quick Start

### Standard Deployment (Recommended)
```powershell
# This will:
# 1. Run pre-deployment checks
# 2. Create database backup
# 3. Deploy to Cloud Run
# 4. Verify deployment
.\scripts\deploy_with_backup.ps1
```

### Manual Step-by-Step Deployment
```powershell
# 1. Pre-deployment checks
.\scripts\pre_deployment_check.ps1

# 2. Create backup
.\scripts\backup_database.ps1

# 3. Deploy
gcloud builds submit --config cloudbuild.yaml

# 4. Log deployment
.\scripts\deployment_log.ps1 -New
```

---

## Complete Workflow

### Before Every Deployment

#### 1. Pre-Deployment Checks
```powershell
.\scripts\pre_deployment_check.ps1
```

This checks:
- ✅ Environment and tools (gcloud, git)
- ✅ No hardcoded secrets
- ✅ No hardcoded localhost URLs
- ✅ Database migrations configured
- ✅ Environment variables set
- ✅ Build files exist

#### 2. Create Backup
```powershell
.\scripts\backup_database.ps1
```

This creates:
- Cloud SQL automated backup
- Optional SQL export to Cloud Storage

#### 3. Review Checklist
Open `PRE_DEPLOYMENT_CHECKLIST.md` and verify:
- [ ] Code reviewed
- [ ] Tests passed
- [ ] Migrations tested
- [ ] Environment variables configured
- [ ] Security audit completed

### Deployment

#### Option A: Automated Deployment (Recommended)
```powershell
.\scripts\deploy_with_backup.ps1
```

This script automatically:
1. Runs pre-deployment checks
2. Creates database backup
3. Deploys to Cloud Run
4. Verifies deployment
5. Provides rollback instructions if needed

#### Option B: Manual Deployment
```powershell
# Deploy via Cloud Build
gcloud builds submit --config cloudbuild.yaml

# Or use deploy script
.\deploy-to-gcp.ps1
```

### After Deployment

#### 1. Verify Deployment
- Check backend health: `https://your-backend-url/health`
- Test frontend: `https://your-frontend-url`
- Review Cloud Run logs
- Test critical features

#### 2. Log Deployment
```powershell
.\scripts\deployment_log.ps1 -New
```

#### 3. Monitor
- Watch Cloud Run logs for first hour
- Monitor error rates
- Verify all features work

---

## Backup & Recovery

### Automated Backups (One-Time Setup)
```powershell
.\scripts\setup_automated_backups.ps1
```

This configures:
- Daily automated backups (2:00 AM)
- Binary logging (point-in-time recovery)
- 7-day retention (configurable)

### Manual Backups
```powershell
# Create backup
.\scripts\backup_database.ps1

# Verify backup
.\scripts\verify_backup.ps1 [BACKUP_ID]

# List backups
gcloud sql backups list --instance=uw-workbench-db
```

### Restore from Backup
```powershell
# List backups
gcloud sql backups list --instance=uw-workbench-db

# Restore (use in rollback script or manually)
gcloud sql backups restore BACKUP_ID --backup-instance=uw-workbench-db
```

---

## Rollback Procedures

### Quick Rollback
```powershell
# List available revisions
.\scripts\rollback_deployment.ps1 -List

# Rollback to previous revision
.\scripts\rollback_deployment.ps1 -Revision PREVIOUS

# Rollback to specific revision
.\scripts\rollback_deployment.ps1 -Revision REVISION_NAME
```

### Full Rollback (Code + Database)
```powershell
# 1. Rollback code
.\scripts\rollback_deployment.ps1 -Revision PREVIOUS

# 2. Restore database (if needed)
.\scripts\rollback_deployment.ps1 -RestoreDatabase -BackupId BACKUP_ID
```

---

## Deployment Logging

### View Deployment History
```powershell
.\scripts\deployment_log.ps1 -List
```

### View Specific Deployment
```powershell
.\scripts\deployment_log.ps1 -View [LOG_ID]
```

### Create New Deployment Log
```powershell
.\scripts\deployment_log.ps1 -New
```

---

## Troubleshooting

### Deployment Fails

1. **Check Cloud Build logs:**
   ```powershell
   gcloud builds list --limit=5
   gcloud builds log [BUILD_ID]
   ```

2. **Check Cloud Run logs:**
   ```powershell
   gcloud run services logs read uw-workbench-backend --region=us-central1 --tail
   ```

3. **Rollback if needed:**
   ```powershell
   .\scripts\rollback_deployment.ps1 -Revision PREVIOUS
   ```

### Health Check Fails

1. **Check service status:**
   ```powershell
   gcloud run services describe uw-workbench-backend --region=us-central1
   ```

2. **Verify environment variables:**
   ```powershell
   gcloud run services describe uw-workbench-backend --region=us-central1 --format="value(spec.template.spec.containers[0].env)"
   ```

3. **Check database connection:**
   ```powershell
   gcloud sql instances describe uw-workbench-db
   ```

### Database Connection Issues

1. **Verify Cloud SQL connection:**
   ```powershell
   gcloud sql instances describe uw-workbench-db
   ```

2. **Check service account permissions:**
   ```powershell
   gcloud projects get-iam-policy [PROJECT_ID]
   ```

3. **Test connection from Cloud Shell:**
   ```bash
   gcloud sql connect uw-workbench-db --user=postgres
   ```

---

## Best Practices

### Before Deployment
1. ✅ Always run pre-deployment checks
2. ✅ Always create backup before deploying
3. ✅ Test in staging first (if available)
4. ✅ Review all code changes
5. ✅ Verify migrations on clean database

### During Deployment
1. ✅ Use automated deployment script
2. ✅ Monitor Cloud Build logs
3. ✅ Wait for deployment to complete
4. ✅ Verify health checks pass

### After Deployment
1. ✅ Test all critical features
2. ✅ Monitor logs for errors
3. ✅ Log deployment details
4. ✅ Watch for first hour
5. ✅ Document any issues

### Backup Strategy
1. ✅ Automated daily backups enabled
2. ✅ Manual backup before every deployment
3. ✅ Test restore procedure monthly
4. ✅ Keep backups for 90 days
5. ✅ Store backups in separate location

---

## Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `pre_deployment_check.ps1` | Verify deployment readiness | `.\scripts\pre_deployment_check.ps1` |
| `backup_database.ps1` | Create database backup | `.\scripts\backup_database.ps1` |
| `verify_backup.ps1` | Verify backup integrity | `.\scripts\verify_backup.ps1 [BACKUP_ID]` |
| `deploy_with_backup.ps1` | Automated deployment | `.\scripts\deploy_with_backup.ps1` |
| `rollback_deployment.ps1` | Rollback to previous version | `.\scripts\rollback_deployment.ps1 -Revision PREVIOUS` |
| `setup_automated_backups.ps1` | Configure automated backups | `.\scripts\setup_automated_backups.ps1` |
| `deployment_log.ps1` | Manage deployment logs | `.\scripts\deployment_log.ps1 -List` |

---

## Related Documentation

- `PRE_DEPLOYMENT_CHECKLIST.md` - Complete pre-deployment checklist
- `DEPLOYMENT.md` - Detailed deployment guide
- `PRODUCTION_READINESS_PLAN.md` - Production readiness requirements
- `CLOUD_SETUP_COMPLETE.md` - Cloud infrastructure setup

---

**Last Updated:** [DATE]  
**Next Review:** After each major deployment
