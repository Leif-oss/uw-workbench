# Backup Verification Script
# Usage: .\scripts\verify_backup.ps1 [BACKUP_ID]

param(
    [string]$BackupId = "",
    [string]$InstanceName = "uw-workbench-db"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backup Verification Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ([string]::IsNullOrEmpty($BackupId)) {
    Write-Host "Listing recent backups..." -ForegroundColor Yellow
    Write-Host ""
    
    gcloud sql backups list --instance=$InstanceName --limit=10 --format="table(id,windowStartTime,status,description)"
    
    Write-Host ""
    Write-Host "To verify a specific backup, run:" -ForegroundColor Yellow
    Write-Host "  .\scripts\verify_backup.ps1 -BackupId BACKUP_ID" -ForegroundColor White
    exit 0
}

Write-Host "Verifying backup: $BackupId" -ForegroundColor Yellow
Write-Host ""

# Get backup details
$BackupDetails = gcloud sql backups describe $BackupId --instance=$InstanceName --format=json | ConvertFrom-Json

if ($BackupDetails) {
    Write-Host "Backup Details:" -ForegroundColor Cyan
    Write-Host "  ID: $($BackupDetails.id)" -ForegroundColor White
    Write-Host "  Status: $($BackupDetails.status)" -ForegroundColor White
    Write-Host "  Start Time: $($BackupDetails.windowStartTime)" -ForegroundColor White
    Write-Host "  End Time: $($BackupDetails.windowEndTime)" -ForegroundColor White
    Write-Host "  Description: $($BackupDetails.description)" -ForegroundColor White
    Write-Host "  Type: $($BackupDetails.type)" -ForegroundColor White
    
    if ($BackupDetails.status -eq "SUCCESSFUL") {
        Write-Host ""
        Write-Host "✅ Backup is valid and ready to use" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️  Warning: Backup status is $($BackupDetails.status)" -ForegroundColor Yellow
    }
} else {
    Write-Host "ERROR: Could not retrieve backup details" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "To test restore (in staging/test environment):" -ForegroundColor Yellow
Write-Host "  gcloud sql backups restore $BackupId --backup-instance=$InstanceName --restore-instance=TEST_INSTANCE" -ForegroundColor White
Write-Host ""
