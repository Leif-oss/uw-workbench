# VPS Database Backup & Restore Guide

## Overview

This guide explains how to backup and restore the PostgreSQL database on your VPS. **Always backup before any update or deployment!**

## Quick Backup (Before Updates)

### Automated Pre-Update Backup
```bash
cd /root/uw-workbench
chmod +x scripts/vps-backup-before-update.sh
./scripts/vps-backup-before-update.sh
```

This creates a timestamped backup with description "Pre-update backup".

## Manual Backup

### Create a Backup
```bash
cd /root/uw-workbench
chmod +x scripts/vps-backup-database.sh
./scripts/vps-backup-database.sh "Description of backup"
```

**Example:**
```bash
./scripts/vps-backup-database.sh "Before adding new features"
```

### Backup Details
- **Location:** `./backups/` directory
- **Format:** Compressed SQL dump (`.sql.gz`)
- **Naming:** `uw_workbench_backup_YYYYMMDD_HHMMSS.sql.gz`
- **Metadata:** Each backup includes a `.meta` file with details

### List Available Backups
```bash
ls -lh backups/uw_workbench_backup_*.sql.gz
```

## Download Backup to Local Machine

### Download a Specific Backup
```bash
# From your local machine (PowerShell or Terminal)
scp root@157.245.172.164:/root/uw-workbench/backups/uw_workbench_backup_20240310_120000.sql.gz ./
```

### Download Latest Backup
```bash
# SSH into VPS first
ssh root@157.245.172.164
cd /root/uw-workbench/backups
ls -t uw_workbench_backup_*.sql.gz | head -1

# Then download (from local machine, replace with actual filename)
scp root@157.245.172.164:/root/uw-workbench/backups/[LATEST_FILE] ./
```

## Restore Database

### ⚠️ WARNING: Restore Will Replace All Current Data!

**Always create a backup before restoring!**

### Restore from Backup
```bash
cd /root/uw-workbench
chmod +x scripts/vps-restore-database.sh
./scripts/vps-restore-database.sh backups/uw_workbench_backup_20240310_120000.sql.gz
```

The script will:
1. Ask for confirmation
2. Create a safety backup of current data
3. Restore from the specified backup file
4. Verify the restore

### Restore Process
1. **Confirmation Required:** You must type "yes" to proceed
2. **Safety Backup:** Automatically creates a backup of current data
3. **Restore:** Restores the database from the backup file
4. **Verification:** Check the application to verify data

## Backup Best Practices

### 1. Before Every Update
```bash
./scripts/vps-backup-before-update.sh
```

### 2. Regular Scheduled Backups
Set up a cron job for daily backups:
```bash
# Edit crontab
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * cd /root/uw-workbench && ./scripts/vps-backup-database.sh "Daily automated backup" >> /var/log/backup.log 2>&1
```

### 3. Before Major Changes
- Before database migrations
- Before code deployments
- Before configuration changes
- Before any risky operations

### 4. Backup Retention
- **Keep at least:** Last 7 days of backups
- **Keep weekly:** Last 4 weeks
- **Keep monthly:** Last 3 months
- **Manual cleanup:**
  ```bash
  # Remove backups older than 30 days
  find backups/ -name "uw_workbench_backup_*.sql.gz" -mtime +30 -delete
  ```

## Backup Storage Locations

### On VPS
- **Path:** `/root/uw-workbench/backups/`
- **Format:** Compressed SQL files (`.sql.gz`)
- **Metadata:** `.meta` files with backup information

### Local Machine (Recommended)
- Download important backups to your local machine
- Store in a safe location (external drive, cloud storage)
- Keep multiple copies for redundancy

### Cloud Storage (Optional)
Consider uploading backups to:
- Google Drive
- Dropbox
- AWS S3
- Digital Ocean Spaces

## Verify Backup Integrity

### Check Backup File Size
```bash
ls -lh backups/uw_workbench_backup_*.sql.gz
```

Backups should be at least a few MB (depending on database size). Very small files (< 1MB) may indicate an issue.

### Test Restore (Optional - Use Test Environment)
If you have a test environment, you can test restore there:
```bash
# In test environment
./scripts/vps-restore-database.sh backups/uw_workbench_backup_20240310_120000.sql.gz
```

## Troubleshooting

### Backup Fails
1. **Check container is running:**
   ```bash
   docker ps | grep uw-workbench-postgres
   ```

2. **Check database credentials:**
   ```bash
   cat .env | grep POSTGRES
   ```

3. **Check disk space:**
   ```bash
   df -h
   ```

### Restore Fails
1. **Check backup file exists and is valid:**
   ```bash
   file backups/uw_workbench_backup_*.sql.gz
   ```

2. **Check database connection:**
   ```bash
   docker exec uw-workbench-postgres pg_isready -U uw_workbench
   ```

3. **Check logs:**
   ```bash
   docker compose -f docker-compose.prod.yml logs postgres
   ```

## Emergency Recovery

If something goes wrong during an update:

1. **Stop the application:**
   ```bash
   docker compose -f docker-compose.prod.yml stop
   ```

2. **Restore from backup:**
   ```bash
   ./scripts/vps-restore-database.sh backups/uw_workbench_backup_[LATEST].sql.gz
   ```

3. **Restart services:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

4. **Verify data:**
   - Check the application
   - Verify critical data is present
   - Check logs for errors

## Backup Scripts Reference

### `vps-backup-database.sh`
- Creates a timestamped database backup
- Compresses the backup
- Creates metadata file
- Lists recent backups

### `vps-restore-database.sh`
- Restores database from backup file
- Creates safety backup before restore
- Requires confirmation
- Handles compressed backups

### `vps-backup-before-update.sh`
- Wrapper script for pre-update backups
- Adds descriptive message
- Designed for use before deployments

## Questions?

If you have questions or issues with backups:
1. Check the backup file exists and has reasonable size
2. Verify database container is running
3. Check disk space on VPS
4. Review backup script output for errors
