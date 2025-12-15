# Frontend startup script - ensures everything uses project folder
$ErrorActionPreference = "Stop"

# Set working directory to project root
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendPath = Join-Path $ProjectRoot "frontend"
Set-Location $FrontendPath

Write-Host "Starting frontend server from: $FrontendPath" -ForegroundColor Green

# Start Vite dev server
npm run dev
