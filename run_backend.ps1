Param(
    [int]$Port = 8000
)

Write-Host "Starting FastAPI backend on port $Port..."

# Ensure we're in the project root (folder that contains 'backend' and 'frontend')
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

python -m uvicorn backend.main:app --reload --port $Port
