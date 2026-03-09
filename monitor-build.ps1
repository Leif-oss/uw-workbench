# Monitor Cloud Build Progress
$ErrorActionPreference = "Continue"

$PROJECT_ID = "ultra-ace-481723-e6"

Write-Host "Monitoring Cloud Build Progress..." -ForegroundColor Cyan
Write-Host ""

$buildId = $null
$maxAttempts = 60
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $builds = gcloud builds list --limit=1 --project=$PROJECT_ID --format="json" 2>&1 | ConvertFrom-Json
    
    if ($builds -and $builds.Count -gt 0) {
        $latestBuild = $builds[0]
        $status = $latestBuild.status
        $id = $latestBuild.id
        
        if (-not $buildId) {
            $buildId = $id
            Write-Host "Tracking build: $buildId" -ForegroundColor Green
        }
        
        if ($id -eq $buildId) {
            Write-Host "[$($latestBuild.createTime)] Status: $status" -ForegroundColor $(if ($status -eq "SUCCESS") { "Green" } elseif ($status -eq "FAILURE") { "Red" } else { "Yellow" })
            
            if ($status -eq "SUCCESS") {
                Write-Host ""
                Write-Host "=" * 60 -ForegroundColor Green
                Write-Host "Build completed successfully!" -ForegroundColor Green
                Write-Host "=" * 60 -ForegroundColor Green
                Write-Host ""
                Write-Host "Your frontend has been updated with all latest improvements." -ForegroundColor Yellow
                Write-Host "Try accessing the frontend URL now." -ForegroundColor Yellow
                break
            } elseif ($status -eq "FAILURE") {
                Write-Host ""
                Write-Host "=" * 60 -ForegroundColor Red
                Write-Host "Build failed!" -ForegroundColor Red
                Write-Host "=" * 60 -ForegroundColor Red
                Write-Host ""
                Write-Host "Check logs: gcloud builds log $buildId --project=$PROJECT_ID" -ForegroundColor Yellow
                break
            }
        }
    }
    
    $attempt++
    Start-Sleep -Seconds 10
}

if ($attempt -ge $maxAttempts) {
    Write-Host ""
    Write-Host "Build is taking longer than expected." -ForegroundColor Yellow
    Write-Host "Check status manually: gcloud builds list --limit=1 --project=$PROJECT_ID" -ForegroundColor Yellow
}



