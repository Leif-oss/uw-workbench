# Backend startup script - ensures everything uses project folder
$ErrorActionPreference = "Stop"

# Set working directory to project root
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host "Starting backend server from: $ProjectRoot" -ForegroundColor Green

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

# Verify Python is from project venv
$PythonExe = (Get-Command python).Source
Write-Host "Using Python: $PythonExe" -ForegroundColor Green

# Start server
Write-Host "Starting FastAPI server on http://127.0.0.1:8000..." -ForegroundColor Green
python -m uvicorn backend.main:app --reload --port 8000 --host 127.0.0.1
