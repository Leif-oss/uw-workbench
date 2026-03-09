# Deployment Log Manager
# Usage: .\scripts\deployment_log.ps1 [--new] [--list] [--view ID]

param(
    [switch]$New,
    [switch]$List,
    [string]$View = "",
    [string]$LogFile = "deployment_log.json"
)

$LogPath = Join-Path $PSScriptRoot ".." $LogFile

function Get-Logs {
    if (Test-Path $LogPath) {
        $content = Get-Content $LogPath -Raw
        return ($content | ConvertFrom-Json)
    }
    return @()
}

function Save-Logs {
    param([array]$Logs)
    $Logs | ConvertTo-Json -Depth 10 | Set-Content $LogPath
}

if ($List) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Deployment History" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $Logs = Get-Logs
    
    if ($Logs.Count -eq 0) {
        Write-Host "No deployment logs found." -ForegroundColor Yellow
        exit 0
    }
    
    $Logs | ForEach-Object {
        $statusColor = switch ($_.Status) {
            "Success" { "Green" }
            "Failed" { "Red" }
            "Rolled Back" { "Yellow" }
            default { "White" }
        }
        
        Write-Host "ID: $($_.Id)" -ForegroundColor Cyan
        Write-Host "  Date: $($_.Date)" -ForegroundColor White
        Write-Host "  Deployed By: $($_.DeployedBy)" -ForegroundColor White
        Write-Host "  Status: $($_.Status)" -ForegroundColor $statusColor
        Write-Host "  Git Commit: $($_.GitCommit)" -ForegroundColor White
        Write-Host "  Backend URL: $($_.BackendUrl)" -ForegroundColor White
        Write-Host "  Frontend URL: $($_.FrontendUrl)" -ForegroundColor White
        if ($_.Notes) {
            Write-Host "  Notes: $($_.Notes)" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
    exit 0
}

if ($View) {
    $Logs = Get-Logs
    $Log = $Logs | Where-Object { $_.Id -eq $View }
    
    if (-not $Log) {
        Write-Host "Deployment log with ID '$View' not found." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Deployment Log: $View" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host ($Log | ConvertTo-Json -Depth 10)
    exit 0
}

if ($New) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "New Deployment Log" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $Logs = Get-Logs
    
    $Id = [System.Guid]::NewGuid().ToString()
    $Date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    Write-Host "Enter deployment information:" -ForegroundColor Yellow
    $DeployedBy = Read-Host "Deployed By"
    
    # Get git info
    $GitCommit = "unknown"
    $GitTag = "none"
    if (Test-Command "git") {
        try {
            $GitCommit = git rev-parse --short HEAD 2>$null
            $GitTag = git describe --tags --exact-match 2>$null
            if ($LASTEXITCODE -ne 0) {
                $GitTag = "none"
            }
        } catch {
            # Ignore
        }
    }
    
    Write-Host ""
    Write-Host "Pre-deployment checklist:" -ForegroundColor Yellow
    $BackupCreated = Read-Host "Backup created? (yes/no)"
    $CodeReviewed = Read-Host "Code reviewed? (yes/no)"
    $TestsPassed = Read-Host "Tests passed? (yes/no)"
    $MigrationsTested = Read-Host "Migrations tested? (yes/no)"
    
    Write-Host ""
    Write-Host "Deployment details:" -ForegroundColor Yellow
    $BackendUrl = Read-Host "Backend URL"
    $FrontendUrl = Read-Host "Frontend URL"
    
    Write-Host ""
    $Status = Read-Host "Status (Success/Failed/Rolled Back)"
    $Notes = Read-Host "Notes (optional)"
    
    $NewLog = @{
        Id = $Id
        Date = $Date
        DeployedBy = $DeployedBy
        GitCommit = $GitCommit
        GitTag = $GitTag
        Status = $Status
        PreDeployment = @{
            BackupCreated = $BackupCreated
            CodeReviewed = $CodeReviewed
            TestsPassed = $TestsPassed
            MigrationsTested = $MigrationsTested
        }
        BackendUrl = $BackendUrl
        FrontendUrl = $FrontendUrl
        Notes = $Notes
    }
    
    $Logs += $NewLog
    Save-Logs $Logs
    
    Write-Host ""
    Write-Host "✅ Deployment log created: $Id" -ForegroundColor Green
    Write-Host ""
    Write-Host "View log: .\scripts\deployment_log.ps1 -View $Id" -ForegroundColor Gray
    exit 0
}

# Default: show help
Write-Host "Deployment Log Manager" -ForegroundColor Cyan
Write-Host ""
Write-Host "Usage:" -ForegroundColor Yellow
Write-Host "  .\scripts\deployment_log.ps1 -New          Create new deployment log" -ForegroundColor White
Write-Host "  .\scripts\deployment_log.ps1 -List         List all deployment logs" -ForegroundColor White
Write-Host "  .\scripts\deployment_log.ps1 -View ID      View specific deployment log" -ForegroundColor White
Write-Host ""
