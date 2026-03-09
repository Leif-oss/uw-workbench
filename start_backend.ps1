# Backend startup script - ensures everything uses project folder
$ErrorActionPreference = "Stop"

# Set working directory to project root
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host "Starting backend server from: $ProjectRoot" -ForegroundColor Green

# Check if server is already running on port 8000
$portInUse = netstat -ano | findstr ":8000" | findstr "LISTENING"
if ($portInUse) {
    Write-Host "Backend server is already running on port 8000" -ForegroundColor Yellow
    Write-Host "If you need to restart, stop the existing process first" -ForegroundColor Yellow
    exit 0
}

# Activate virtual environment in project folder
$VenvPath = Join-Path $ProjectRoot ".venv"
if (-not (Test-Path $VenvPath)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv $VenvPath
}

# Activate venv
$ActivateScript = Join-Path $VenvPath "Scripts\Activate.ps1"
if (Test-Path $ActivateScript) {
    & $ActivateScript
    Write-Host "Activated virtual environment: $VenvPath" -ForegroundColor Green
} else {
    Write-Host "ERROR: Virtual environment not found at $VenvPath" -ForegroundColor Red
    exit 1
}

# Set PYTHONPATH to project root
$env:PYTHONPATH = $ProjectRoot
Write-Host "PYTHONPATH set to: $env:PYTHONPATH" -ForegroundColor Green

# Unset Cloud SQL environment variables for local development
# This ensures we use DATABASE_URL from .env instead
if ($env:CLOUD_SQL_CONNECTION_NAME) {
    Remove-Item Env:\CLOUD_SQL_CONNECTION_NAME
    Write-Host "Removed CLOUD_SQL_CONNECTION_NAME from environment" -ForegroundColor Yellow
}
if ($env:DB_USER) {
    Remove-Item Env:\DB_USER
    Write-Host "Removed DB_USER from environment" -ForegroundColor Yellow
}
if ($env:DB_PASSWORD) {
    Remove-Item Env:\DB_PASSWORD
    Write-Host "Removed DB_PASSWORD from environment" -ForegroundColor Yellow
}
if ($env:DB_NAME) {
    Remove-Item Env:\DB_NAME
    Write-Host "Removed DB_NAME from environment" -ForegroundColor Yellow
}
Write-Host "Using DATABASE_URL from .env file for local development" -ForegroundColor Green

# Add poppler to PATH if it exists
$PopplerBin = "C:\poppler\poppler-25.12.0\Library\bin"
if (Test-Path $PopplerBin) {
    $env:Path = "$env:Path;$PopplerBin"
    Write-Host "Added poppler to PATH: $PopplerBin" -ForegroundColor Green
} else {
    # Try to find poppler in common locations
    $PopplerPaths = @(
        "C:\poppler\Library\bin",
        "$env:USERPROFILE\poppler\Library\bin"
    )
    foreach ($path in $PopplerPaths) {
        if (Test-Path $path) {
            $env:Path = "$env:Path;$path"
            Write-Host "Added poppler to PATH: $path" -ForegroundColor Green
            break
        }
    }
}

# Verify Python is from project venv
$PythonExe = (Get-Command python).Source
Write-Host "Using Python: $PythonExe" -ForegroundColor Green

# Start server
Write-Host "Starting FastAPI server on http://127.0.0.1:8000..." -ForegroundColor Green
python -m uvicorn backend.main:app --reload --port 8000 --host 127.0.0.1
