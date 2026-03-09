# Setup Automated Backups for Cloud SQL
# Usage: .\scripts\setup_automated_backups.ps1

param(
    [string]$InstanceName = "uw-workbench-db",
    [string]$BackupWindow = "02:00",
    [string]$ProjectId = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Automated Backups" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get project ID
if ([string]::IsNullOrEmpty($ProjectId)) {
    $ProjectId = gcloud config get-value project 2>$null
    if ([string]::IsNullOrEmpty($ProjectId)) {
        Write-Host "ERROR: Project ID not found. Please set PROJECT_ID or run 'gcloud config set project PROJECT_ID'" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Project: $ProjectId" -ForegroundColor White
Write-Host "Instance: $InstanceName" -ForegroundColor White
Write-Host "Backup Window: $BackupWindow" -ForegroundColor White
Write-Host ""

# Check if instance exists
Write-Host "Checking Cloud SQL instance..." -ForegroundColor Yellow
$InstanceExists = gcloud sql instances describe $InstanceName --project=$ProjectId 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: Cloud SQL instance '$InstanceName' not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available instances:" -ForegroundColor Yellow
    gcloud sql instances list --project=$ProjectId
    exit 1
}

Write-Host "✅ Instance found" -ForegroundColor Green
Write-Host ""

# Get current backup settings
Write-Host "Current backup configuration:" -ForegroundColor Cyan
$CurrentSettings = gcloud sql instances describe $InstanceName --project=$ProjectId --format=json | ConvertFrom-Json

$BackupEnabled = $CurrentSettings.settings.backupConfiguration.enabled
$StartTime = $CurrentSettings.settings.backupConfiguration.startTime
$BinaryLogEnabled = $CurrentSettings.settings.backupConfiguration.binaryLogEnabled

Write-Host "  Backups Enabled: $BackupEnabled" -ForegroundColor White
Write-Host "  Backup Window: $StartTime" -ForegroundColor White
Write-Host "  Binary Log: $BinaryLogEnabled" -ForegroundColor White
Write-Host ""

# Configure automated backups
Write-Host "Configuring automated backups..." -ForegroundColor Yellow

gcloud sql instances patch $InstanceName `
    --backup-start-time=$BackupWindow `
    --enable-bin-log `
    --backup `
    --project=$ProjectId

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Automated backups configured successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to configure automated backups" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Verify configuration
Write-Host "Verifying configuration..." -ForegroundColor Yellow
$NewSettings = gcloud sql instances describe $InstanceName --project=$ProjectId --format=json | ConvertFrom-Json

$NewBackupEnabled = $NewSettings.settings.backupConfiguration.enabled
$NewStartTime = $NewSettings.settings.backupConfiguration.startTime
$NewBinaryLogEnabled = $NewSettings.settings.backupConfiguration.binaryLogEnabled

Write-Host ""
Write-Host "Updated backup configuration:" -ForegroundColor Cyan
Write-Host "  Backups Enabled: $NewBackupEnabled" -ForegroundColor White
Write-Host "  Backup Window: $NewStartTime" -ForegroundColor White
Write-Host "  Binary Log: $NewBinaryLogEnabled" -ForegroundColor White
Write-Host ""

# Set backup retention (via Cloud SQL API or console)
Write-Host "Backup Retention:" -ForegroundColor Cyan
Write-Host "  Default retention: 7 days (automated backups)" -ForegroundColor White
Write-Host "  Point-in-time recovery: Available for last 7 days" -ForegroundColor White
Write-Host ""
Write-Host "Note: To change retention period, use Cloud Console:" -ForegroundColor Yellow
Write-Host "  https://console.cloud.google.com/sql/instances/$InstanceName/backups" -ForegroundColor Gray
Write-Host ""

# Create Cloud Storage bucket for manual backups (optional)
Write-Host "Would you like to create a Cloud Storage bucket for manual backup exports? (yes/no)" -ForegroundColor Yellow
$CreateBucket = Read-Host

if ($CreateBucket -eq "yes") {
    $BucketName = "$ProjectId-uw-workbench-backups"
    
    Write-Host ""
    Write-Host "Creating backup bucket: $BucketName" -ForegroundColor Yellow
    
    # Check if bucket exists
    $BucketExists = gsutil ls -b "gs://$BucketName" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Bucket already exists: $BucketName" -ForegroundColor Yellow
    } else {
        # Create bucket
        gsutil mb -p $ProjectId -l us-central1 "gs://$BucketName"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Backup bucket created: $BucketName" -ForegroundColor Green
            
            # Set lifecycle policy for backups (keep 90 days)
            $LifecyclePolicy = @"
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      }
    ]
  }
}
"@
            
            $LifecyclePolicy | gsutil lifecycle set - "gs://$BucketName"
            
            Write-Host "✅ Lifecycle policy set (delete after 90 days)" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Failed to create bucket (you can create it manually later)" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "To use this bucket for manual backups, update backup_database.ps1:" -ForegroundColor Yellow
    Write-Host "  .\scripts\backup_database.ps1 -BackupBucket gs://$BucketName" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Automated backups setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backup Schedule:" -ForegroundColor Yellow
Write-Host "  Daily automated backups: $BackupWindow (Cloud SQL default)" -ForegroundColor White
Write-Host "  Retention: 7 days (configurable in console)" -ForegroundColor White
Write-Host "  Point-in-time recovery: Available for last 7 days" -ForegroundColor White
Write-Host ""
Write-Host "Manual Backup:" -ForegroundColor Yellow
Write-Host "  Before deployments: .\scripts\backup_database.ps1" -ForegroundColor White
Write-Host ""
Write-Host "View Backups:" -ForegroundColor Yellow
Write-Host "  gcloud sql backups list --instance=$InstanceName" -ForegroundColor Gray
Write-Host ""
