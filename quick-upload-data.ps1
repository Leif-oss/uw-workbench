# Quick script to upload local data to cloud
# This exports from local PostgreSQL and imports via the API

Write-Host "="*60 -ForegroundColor Cyan
Write-Host "Upload Local Data to Cloud" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan
Write-Host ""

# Export data
Write-Host "Step 1: Exporting from local database..." -ForegroundColor Yellow
docker exec uw-workbench-postgres pg_dump -U uw_workbench -d uw_workbench --data-only --column-inserts > local_data_export.sql 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Export failed" -ForegroundColor Red
    exit 1
}

# Convert to UTF-8
$content = Get-Content local_data_export.sql -Raw -Encoding Unicode
Set-Content -Path local_data_export.sql -Value $content -Encoding UTF8 -NoNewline

$size = (Get-Item local_data_export.sql).Length
Write-Host "  Exported $([math]::Round($size/1KB, 2)) KB" -ForegroundColor Green
Write-Host ""

# Import to cloud
Write-Host "Step 2: Importing to Cloud SQL..." -ForegroundColor Yellow
python import-sql-to-cloud.py

Write-Host ""
Write-Host "Done! You can now log in with your local credentials." -ForegroundColor Green
Write-Host ""
