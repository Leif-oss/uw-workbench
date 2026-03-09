# Automated Backups Setup Guide

This guide explains how to set up automated database backups for UW Workbench.

## Quick Setup

Run the setup script on your VPS:

```bash
cd /root/uw-workbench
chmod +x scripts/setup-automated-backups.sh
./scripts/setup-automated-backups.sh
```

This will:
- Create a backup directory at `/root/uw-workbench/backups`
- Set up a daily backup at 2 AM
- Keep backups for 30 days
- Automatically clean up old backups

## Custom Configuration

### Custom Backup Directory

```bash
./scripts/setup-automated-backups.sh /custom/backup/path
```

### Custom Retention Period

```bash
# Keep backups for 60 days
./scripts/setup-automated-backups.sh /root/uw-workbench/backups 60
```

### Custom Schedule

The schedule uses standard cron format: `minute hour day month weekday`

Examples:
- `0 2 * * *` - Daily at 2 AM (default)
- `0 3 * * *` - Daily at 3 AM
- `0 2 * * 0` - Weekly on Sunday at 2 AM
- `0 2 1 * *` - Monthly on the 1st at 2 AM
- `0 */6 * * *` - Every 6 hours

```bash
# Daily at 3 AM, keep 60 days
./scripts/setup-automated-backups.sh /root/uw-workbench/backups 60 "0 3 * * *"
```

## Manual Backup

You can manually create a backup at any time:

```bash
cd /root/uw-workbench
./scripts/backup-database.sh
```

Or specify a custom backup directory:

```bash
./scripts/backup-database.sh /custom/backup/path
```

## Viewing Backup Logs

Backup operations are logged to:

```bash
tail -f /root/uw-workbench/backups/backup.log
```

## Backup File Format

Backups are stored as compressed SQL files:
- Format: `uw_workbench_backup_YYYYMMDD_HHMMSS.sql.gz`
- Location: `/root/uw-workbench/backups/` (or your custom directory)

## Restoring from Backup

To restore a backup:

1. Stop the application:
   ```bash
   cd /root/uw-workbench
   docker compose -f docker-compose.prod.yml down
   ```

2. Restore the database:
   ```bash
   # Uncompress if needed
   gunzip backups/uw_workbench_backup_YYYYMMDD_HHMMSS.sql.gz
   
   # Restore
   docker exec -i uw-workbench-postgres psql -U uw_workbench -d uw_workbench < backups/uw_workbench_backup_YYYYMMDD_HHMMSS.sql
   ```

3. Start the application:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

## Managing Cron Jobs

### View Current Cron Jobs

```bash
crontab -l
```

### Edit Cron Jobs

```bash
crontab -e
```

### Remove Automated Backups

Edit the crontab and remove the backup line:
```bash
crontab -e
# Remove the line containing "backup-cron-wrapper.sh"
```

## Backup Retention

Old backups are automatically deleted based on the retention period:
- Default: 30 days
- Backups older than the retention period are removed during each backup run
- The retention period can be customized during setup

## Troubleshooting

### Backup Fails

1. Check the backup log:
   ```bash
   tail -f /root/uw-workbench/backups/backup.log
   ```

2. Verify Docker container is running:
   ```bash
   docker ps | grep uw-workbench-postgres
   ```

3. Check database credentials in `.env`:
   ```bash
   grep POSTGRES_PASSWORD .env
   ```

4. Test manual backup:
   ```bash
   ./scripts/backup-database.sh
   ```

### Cron Job Not Running

1. Check if cron service is running:
   ```bash
   systemctl status cron
   ```

2. Check cron logs:
   ```bash
   grep CRON /var/log/syslog
   ```

3. Verify cron job is scheduled:
   ```bash
   crontab -l
   ```

## Best Practices

1. **Test Restores**: Periodically test restoring from backups to ensure they work
2. **Off-Site Backups**: Consider copying backups to cloud storage (S3, Google Drive, etc.)
3. **Monitor Disk Space**: Ensure the backup directory has enough space
4. **Document Schedule**: Keep track of your backup schedule and retention policy
5. **Regular Verification**: Check backup logs regularly to ensure backups are completing successfully

## Cloud Storage Integration

For additional safety, consider setting up automatic uploads to cloud storage:

### Example: Upload to S3

Add to your cron wrapper script:
```bash
# Upload latest backup to S3
aws s3 cp "${BACKUP_DIR}/uw_workbench_backup_*.sql.gz" s3://your-bucket/backups/
```

### Example: Upload to Google Drive

Use `rclone` or similar tools to sync backups to Google Drive.
