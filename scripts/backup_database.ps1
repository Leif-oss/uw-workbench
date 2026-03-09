# Database Backup Script for Cloud SQL PostgreSQL
# Usage: .\scripts\backup_database.ps1

param(
    [string]$ProjectId = "",
    [string]$InstanceName = "uw-workbench-db",
    [string]$BackupBucket = "",
    [string]$Description = ""
)

# Get project ID if not provided
if ([string]::IsNullOrEmpty($ProjectId)) {
    $ProjectId = gcloud config get-value project 2>$null
    if ([string]::IsNullOrEmpty($ProjectId)) {
        Write-Host "ERROR: Project ID not found. Please set PROJECT_ID or run 'gcloud config set project PROJECT_ID'" -ForegroundColor Red
        exit 1
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database Backup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Project ID: $ProjectId" -ForegroundColor White
Write-Host "Instance: $InstanceName" -ForegroundColor White
Write-Host ""

# Generate timestamp
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$DateLabel = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Create description if not provided
if ([string]::IsNullOrEmpty($Description)) {
    $Description = "Manual backup before deployment - $DateLabel"
}

Write-Host "Creating Cloud SQL backup..." -ForegroundColor Yellow
Write-Host "Description: $Description" -ForegroundColor Gray
Write-Host ""

# Create Cloud SQL backup
try {
    $BackupResult = gcloud sql backups create `
        --instance=$InstanceName `
        --description=$Description `
        2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create backup" -ForegroundColor Red
        Write-Host $BackupResult -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Cloud SQL backup created successfully" -ForegroundColor Green
    Write-Host ""
    
    # Get backup ID from output
    $BackupId = ($BackupResult | Select-String -Pattern "id:\s*(\d+)").Matches.Groups[1].Value
    
    if ($BackupId) {
        Write-Host "Backup ID: $BackupId" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "ERROR: Exception creating backup: $_" -ForegroundColor Red
    exit 1
}

# Export to SQL file if bucket provided
if (-not [string]::IsNullOrEmpty($BackupBucket)) {
    $BackupFileName = "workbench_backup_$Timestamp.sql"
    $BackupPath = "$BackupBucket/$BackupFileName"
    
    Write-Host ""
    Write-Host "Exporting database to SQL file..." -ForegroundColor Yellow
    Write-Host "Destination: $BackupPath" -ForegroundColor Gray
    
    try {
        gcloud sql export sql $InstanceName `
            $BackupPath `
            --database=uw_workbench `
            --project=$ProjectId
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database exported to: $BackupPath" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Warning: SQL export failed, but Cloud SQL backup was created" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Warning: SQL export failed: $_" -ForegroundColor Yellow
        Write-Host "Cloud SQL backup was still created successfully" -ForegroundColor Yellow
    }
}

# List recent backups
Write-Host ""
Write-Host "Recent backups:" -ForegroundColor Cyan
gcloud sql backups list --instance=$InstanceName --limit=5 --format="table(id,windowStartTime,status,description)"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Verify backup in Cloud Console" -ForegroundColor White
Write-Host "  2. Test restore procedure in staging" -ForegroundColor White
Write-Host "  3. Proceed with deployment" -ForegroundColor White
Write-Host ""
