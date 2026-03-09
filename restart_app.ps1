# Restart app script - stops existing servers and starts fresh ones
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host "Restarting application..." -ForegroundColor Green

# Stop existing Python and Node processes
Write-Host "Stopping existing servers..." -ForegroundColor Yellow
Get-Process | Where-Object {
    ($_.ProcessName -eq "python" -or $_.ProcessName -eq "node") -and
    (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*uvicorn*" -or
    (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*vite*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

# Verify ports are free
$backendPort = netstat -ano | findstr ":8000" | findstr "LISTENING"
$frontendPort = netstat -ano | findstr ":5173" | findstr "LISTENING"

if ($backendPort) {
    Write-Host "Warning: Port 8000 still in use" -ForegroundColor Red
}
if ($frontendPort) {
    Write-Host "Warning: Port 5173 still in use" -ForegroundColor Red
}

# Start backend
Write-Host "Starting backend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-File", "$ProjectRoot\start_backend.ps1"

Start-Sleep -Seconds 3

# Start frontend
Write-Host "Starting frontend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-File", "$ProjectRoot\start_frontend.ps1"

Start-Sleep -Seconds 5

# Verify servers are running
Write-Host "`nVerifying servers..." -ForegroundColor Green
$backendRunning = netstat -ano | findstr ":8000" | findstr "LISTENING"
$frontendRunning = netstat -ano | findstr ":5173" | findstr "LISTENING"

if ($backendRunning) {
    Write-Host "✓ Backend running on port 8000" -ForegroundColor Green
} else {
    Write-Host "✗ Backend not running" -ForegroundColor Red
}

if ($frontendRunning) {
    Write-Host "✓ Frontend running on port 5173" -ForegroundColor Green
} else {
    Write-Host "✗ Frontend not running" -ForegroundColor Red
}

Write-Host "`nServers started in separate PowerShell windows." -ForegroundColor Cyan
Write-Host "Close those windows to stop the servers." -ForegroundColor Cyan

