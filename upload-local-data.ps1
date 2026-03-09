# Export data from local PostgreSQL and import to Cloud SQL
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Upload Local Database to Cloud" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Local database connection
$LocalDBHost = "localhost"
$LocalDBPort = "5432"
$LocalDBName = "uw_workbench"
$LocalDBUser = "uw_workbench"
$LocalDBPassword = "dev_password_change_me"

# Cloud SQL connection
Write-Host "Getting Cloud SQL password..." -ForegroundColor Yellow
$CloudDBPassword = gcloud secrets versions access latest --secret=db-password 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Could not get Cloud SQL password" -ForegroundColor Red
    exit 1
}

$CloudDBHost = "ultra-ace-481723-e6:us-central1:uw-workbench-db"
$CloudDBName = "uw_workbench"
$CloudDBUser = "postgres"

# Create temp directory for export
$TempDir = "$env:TEMP\uw-workbench-export"
if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $TempDir | Out-Null

$ExportFile = Join-Path $TempDir "export.sql"

Write-Host "Step 1: Exporting data from local database..." -ForegroundColor Cyan
Write-Host "Source: $LocalDBUser@$LocalDBHost:$LocalDBPort/$LocalDBName" -ForegroundColor Gray
Write-Host ""

# Use pg_dump to export data only (no schema, just INSERT statements)
$env:PGPASSWORD = $LocalDBPassword
$pgDumpCmd = "pg_dump"
$pgDumpArgs = @(
    "-h", $LocalDBHost
    "-p", $LocalDBPort
    "-U", $LocalDBUser
    "-d", $LocalDBName
    "--data-only"              # Only data, not schema
    "--column-inserts"         # Use INSERT with column names
    "--disable-triggers"       # Disable triggers during restore
    "-f", $ExportFile
)

# Check if pg_dump is available
$pgDumpPath = Get-Command $pgDumpCmd -ErrorAction SilentlyContinue
if (-not $pgDumpPath) {
    Write-Host "ERROR: pg_dump not found. Installing PostgreSQL client tools..." -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools or use Docker to run pg_dump" -ForegroundColor Yellow
    
    # Try using Docker to run pg_dump
    Write-Host ""
    Write-Host "Using Docker to run pg_dump..." -ForegroundColor Yellow
    docker exec uw-workbench-postgres pg_dump -U $LocalDBUser -d $LocalDBName --data-only --column-inserts --disable-triggers > $ExportFile
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to export database" -ForegroundColor Red
        exit 1
    }
} else {
    & $pgDumpCmd $pgDumpArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to export database" -ForegroundColor Red
        exit 1
    }
}

$env:PGPASSWORD = $null

if (-not (Test-Path $ExportFile)) {
    Write-Host "ERROR: Export file not created" -ForegroundColor Red
    exit 1
}

$FileSize = (Get-Item $ExportFile).Length
Write-Host "✅ Exported $([math]::Round($FileSize/1KB, 2)) KB" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Connecting to Cloud SQL..." -ForegroundColor Cyan
Write-Host "Target: $CloudDBUser@$CloudDBHost/$CloudDBName" -ForegroundColor Gray
Write-Host ""

# Use Cloud SQL Proxy or direct connection
# First, try using gcloud sql connect
Write-Host "Using Cloud SQL Proxy to connect..." -ForegroundColor Yellow
Write-Host ""

# Start Cloud SQL Proxy in background
$ProxyPort = 5433
$ProxyProcess = $null

try {
    Write-Host "Starting Cloud SQL Proxy on port $ProxyPort..." -ForegroundColor Yellow
    $ProxyProcess = Start-Process -FilePath "cloud_sql_proxy" -ArgumentList @(
        "-instances=$CloudDBHost=tcp:$ProxyPort"
    ) -PassThru -NoNewWindow
    
    # Wait a moment for proxy to start
    Start-Sleep -Seconds 3
    
    Write-Host "✅ Cloud SQL Proxy started" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Step 3: Importing data to Cloud SQL..." -ForegroundColor Cyan
    Write-Host ""
    
    # Use psql to import
    $env:PGPASSWORD = $CloudDBPassword
    $psqlArgs = @(
        "-h", "localhost"
        "-p", $ProxyPort
        "-U", $CloudDBUser
        "-d", $CloudDBName
        "-f", $ExportFile
    )
    
    $psqlCmd = "psql"
    $psqlPath = Get-Command $psqlCmd -ErrorAction SilentlyContinue
    
    if (-not $psqlPath) {
        Write-Host "ERROR: psql not found. Using alternative method..." -ForegroundColor Yellow
        
        # Alternative: Use Python script to import
        Write-Host "Using Python to import data..." -ForegroundColor Yellow
        python -c @"
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
from sqlalchemy import create_engine, text
import urllib.parse

# Connect via proxy
db_url = f'postgresql://$CloudDBUser:{urllib.parse.quote_plus(str('$CloudDBPassword'))}@localhost:$ProxyPort/$CloudDBName'
engine = create_engine(db_url)

with open(r'$ExportFile', 'r', encoding='utf-8') as f:
    sql = f.read()
    
# Execute in chunks
with engine.connect() as conn:
    conn.execute(text(sql))
    conn.commit()

print('Import complete!')
"@
    } else {
        & $psqlCmd $psqlArgs
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to import data" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "✅ Data imported successfully!" -ForegroundColor Green
    
} finally {
    $env:PGPASSWORD = $null
    
    # Stop Cloud SQL Proxy
    if ($ProxyProcess) {
        Write-Host ""
        Write-Host "Stopping Cloud SQL Proxy..." -ForegroundColor Yellow
        Stop-Process -Id $ProxyProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    # Cleanup
    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Upload Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your local database data has been uploaded to Cloud SQL." -ForegroundColor White
Write-Host "You can now log in with your existing credentials." -ForegroundColor White
Write-Host ""
