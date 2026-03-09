# Frontend startup script - ensures everything uses project folder
$ErrorActionPreference = "Stop"

# Set working directory to project root
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendPath = Join-Path $ProjectRoot "frontend"
Set-Location $FrontendPath

Write-Host "Starting frontend server from: $FrontendPath" -ForegroundColor Green

# Check if server is already running on port 5173
$portInUse = netstat -ano | findstr ":5173" | findstr "LISTENING"
if ($portInUse) {
    Write-Host "Frontend server is already running on port 5173" -ForegroundColor Yellow
    Write-Host "If you need to restart, stop the existing process first" -ForegroundColor Yellow
    exit 0
}

# Start Vite dev server
npm run dev
