# Run servers in the current PowerShell window (for use in existing windows)
# Usage: Run this in an existing PowerShell window to start/restart servers

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

function Start-Backend {
    Write-Host "`n=== Starting Backend ===" -ForegroundColor Green
    
    # Check if already running
    $portInUse = netstat -ano | findstr ":8000" | findstr "LISTENING"
    if ($portInUse) {
        Write-Host "Backend already running on port 8000" -ForegroundColor Yellow
        return
    }
    
    # Activate venv
    $VenvPath = Join-Path $ProjectRoot ".venv"
    if (Test-Path "$VenvPath\Scripts\Activate.ps1") {
        & "$VenvPath\Scripts\Activate.ps1"
        $env:PYTHONPATH = $ProjectRoot
        Write-Host "Starting backend on port 8000..." -ForegroundColor Green
        Start-Job -ScriptBlock {
            Set-Location $using:ProjectRoot
            & "$using:VenvPath\Scripts\python.exe" -m uvicorn backend.main:app --reload --port 8000 --host 127.0.0.1
        } | Out-Null
        Start-Sleep -Seconds 2
        Write-Host "Backend started (running in background job)" -ForegroundColor Green
    }
}

function Start-Frontend {
    Write-Host "`n=== Starting Frontend ===" -ForegroundColor Green
    
    # Check if already running
    $portInUse = netstat -ano | findstr ":5173" | findstr "LISTENING"
    if ($portInUse) {
        Write-Host "Frontend already running on port 5173" -ForegroundColor Yellow
        return
    }
    
    $FrontendPath = Join-Path $ProjectRoot "frontend"
    Set-Location $FrontendPath
    Write-Host "Starting frontend on port 5173..." -ForegroundColor Green
    Start-Job -ScriptBlock {
        Set-Location $using:FrontendPath
        npm run dev
    } | Out-Null
    Start-Sleep -Seconds 2
    Write-Host "Frontend started (running in background job)" -ForegroundColor Green
}

# Main
Write-Host "`nUW Workbench Server Manager" -ForegroundColor Cyan
Write-Host "============================`n" -ForegroundColor Cyan

$choice = Read-Host "Start (B)ackend, (F)rontend, (A)ll, or (S)tatus? [B/F/A/S]"

switch ($choice.ToUpper()) {
    "B" { Start-Backend }
    "F" { Start-Frontend }
    "A" { Start-Backend; Start-Frontend }
    "S" {
        Write-Host "`nServer Status:" -ForegroundColor Cyan
        $backend = netstat -ano | findstr ":8000" | findstr "LISTENING"
        $frontend = netstat -ano | findstr ":5173" | findstr "LISTENING"
        if ($backend) { Write-Host "✓ Backend: Running on port 8000" -ForegroundColor Green } else { Write-Host "✗ Backend: Not running" -ForegroundColor Red }
        if ($frontend) { Write-Host "✓ Frontend: Running on port 5173" -ForegroundColor Green } else { Write-Host "✗ Frontend: Not running" -ForegroundColor Red }
    }
    default { Write-Host "Invalid choice" -ForegroundColor Red }
}

Write-Host "`nPress Enter to exit..."
Read-Host

