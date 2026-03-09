# Rollback Deployment Script
# Usage: .\scripts\rollback_deployment.ps1 [REVISION_NAME] or [--list] to see available revisions

param(
    [string]$Revision = "",
    [string]$Region = "us-central1",
    [switch]$List,
    [switch]$RestoreDatabase,
    [string]$BackupId = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Rollback Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# List available revisions
if ($List -or [string]::IsNullOrEmpty($Revision)) {
    Write-Host "Available Backend Revisions:" -ForegroundColor Yellow
    Write-Host ""
    $BackendRevisions = gcloud run revisions list --service=uw-workbench-backend --region=$Region --format="table(metadata.name,status.creationTimestamp,spec.containers[0].image,status.conditions[0].status)" --sort-by="~metadata.creationTimestamp" --limit=10
    Write-Host $BackendRevisions
    
    Write-Host ""
    Write-Host "Available Frontend Revisions:" -ForegroundColor Yellow
    Write-Host ""
    $FrontendRevisions = gcloud run revisions list --service=uw-workbench-frontend --region=$Region --format="table(metadata.name,status.creationTimestamp,spec.containers[0].image,status.conditions[0].status)" --sort-by="~metadata.creationTimestamp" --limit=10
    Write-Host $FrontendRevisions
    
    if ([string]::IsNullOrEmpty($Revision)) {
        Write-Host ""
        Write-Host "To rollback, specify a revision:" -ForegroundColor Yellow
        Write-Host "  .\scripts\rollback_deployment.ps1 -Revision REVISION_NAME" -ForegroundColor White
        Write-Host ""
        Write-Host "To rollback to previous revision:" -ForegroundColor Yellow
        Write-Host "  .\scripts\rollback_deployment.ps1 -Revision PREVIOUS" -ForegroundColor White
        exit 0
    }
}

# Get current revision
$CurrentBackendRevision = gcloud run services describe uw-workbench-backend --region=$Region --format="value(status.latestReadyRevisionName)" 2>$null
$CurrentFrontendRevision = gcloud run services describe uw-workbench-frontend --region=$Region --format="value(status.latestReadyRevisionName)" 2>$null

Write-Host "Current Backend Revision: $CurrentBackendRevision" -ForegroundColor Cyan
Write-Host "Current Frontend Revision: $CurrentFrontendRevision" -ForegroundColor Cyan
Write-Host ""

# Handle "PREVIOUS" keyword
if ($Revision -eq "PREVIOUS") {
    Write-Host "Finding previous revision..." -ForegroundColor Yellow
    $AllRevisions = gcloud run revisions list --service=uw-workbench-backend --region=$Region --format="value(metadata.name)" --sort-by="~metadata.creationTimestamp"
    $RevisionArray = $AllRevisions -split "`n"
    if ($RevisionArray.Length -gt 1) {
        $Revision = $RevisionArray[1]
        Write-Host "Previous revision: $Revision" -ForegroundColor Green
    } else {
        Write-Host "ERROR: No previous revision found" -ForegroundColor Red
        exit 1
    }
}

# Confirm rollback
Write-Host "⚠️  WARNING: This will rollback to revision: $Revision" -ForegroundColor Yellow
Write-Host "Current revision will remain but traffic will be routed to $Revision" -ForegroundColor Yellow
Write-Host ""
$Confirmation = Read-Host "Are you sure you want to proceed? (yes/no)"

if ($Confirmation -ne "yes") {
    Write-Host "Rollback cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Rolling back backend..." -ForegroundColor Yellow

# Rollback backend
gcloud run services update-traffic uw-workbench-backend `
    --region=$Region `
    --to-revisions="$Revision=100"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to rollback backend" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Backend rolled back to: $Revision" -ForegroundColor Green
Write-Host ""

# Rollback frontend (use same revision name pattern or find corresponding frontend revision)
Write-Host "Finding corresponding frontend revision..." -ForegroundColor Yellow

# Try to find frontend revision with similar timestamp
$BackendRevisionInfo = gcloud run revisions describe $Revision --service=uw-workbench-backend --region=$Region --format=json 2>$null | ConvertFrom-Json
$BackendTimestamp = $BackendRevisionInfo.metadata.creationTimestamp

$FrontendRevisions = gcloud run revisions list --service=uw-workbench-frontend --region=$Region --format=json | ConvertFrom-Json
$MatchingFrontend = $FrontendRevisions | Where-Object { 
    $FrontendTimestamp = [DateTime]::Parse($_.metadata.creationTimestamp)
    $BackendTime = [DateTime]::Parse($BackendTimestamp)
    $TimeDiff = [Math]::Abs(($FrontendTimestamp - $BackendTime).TotalMinutes)
    $TimeDiff -lt 30  # Within 30 minutes
} | Select-Object -First 1

if ($MatchingFrontend) {
    $FrontendRevision = $MatchingFrontend.metadata.name
    Write-Host "Rolling back frontend to: $FrontendRevision" -ForegroundColor Yellow
    
    gcloud run services update-traffic uw-workbench-frontend `
        --region=$Region `
        --to-revisions="$FrontendRevision=100"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Frontend rolled back to: $FrontendRevision" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Frontend rollback failed (backend was rolled back successfully)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Could not find matching frontend revision" -ForegroundColor Yellow
    Write-Host "Backend was rolled back, but frontend rollback was skipped" -ForegroundColor Yellow
}

Write-Host ""

# Database restore option
if ($RestoreDatabase) {
    if ([string]::IsNullOrEmpty($BackupId)) {
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "Database Restore" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "⚠️  WARNING: This will restore the database from a backup!" -ForegroundColor Red
        Write-Host "All data since the backup will be LOST!" -ForegroundColor Red
        Write-Host ""
        
        Write-Host "Available backups:" -ForegroundColor Yellow
        gcloud sql backups list --instance=uw-workbench-db --limit=10 --format="table(id,windowStartTime,status,description)"
        Write-Host ""
        
        $BackupId = Read-Host "Enter backup ID to restore from"
        
        if ([string]::IsNullOrEmpty($BackupId)) {
            Write-Host "Database restore cancelled." -ForegroundColor Yellow
            exit 0
        }
    }
    
    Write-Host ""
    Write-Host "⚠️  FINAL WARNING: This will restore database from backup $BackupId" -ForegroundColor Red
    Write-Host "This operation CANNOT be undone!" -ForegroundColor Red
    Write-Host ""
    $FinalConfirmation = Read-Host "Type 'RESTORE' to confirm"
    
    if ($FinalConfirmation -ne "RESTORE") {
        Write-Host "Database restore cancelled." -ForegroundColor Yellow
        exit 0
    }
    
    Write-Host ""
    Write-Host "Restoring database from backup..." -ForegroundColor Yellow
    Write-Host "This may take several minutes..." -ForegroundColor Yellow
    
    gcloud sql backups restore $BackupId `
        --backup-instance=uw-workbench-db
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database restored successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Database restore failed" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Rollback completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Verify application is working correctly" -ForegroundColor White
Write-Host "  2. Test all critical features" -ForegroundColor White
Write-Host "  3. Check logs for any errors" -ForegroundColor White
Write-Host ""
Write-Host "View current revision:" -ForegroundColor Yellow
Write-Host "  gcloud run services describe uw-workbench-backend --region=$Region" -ForegroundColor Gray
Write-Host ""
