# Wait for Cloud Build to Complete
$ErrorActionPreference = "Continue"

$PROJECT_ID = "ultra-ace-481723-e6"

Write-Host "Waiting for Cloud Build to complete..." -ForegroundColor Cyan
Write-Host ""

$lastStatus = ""
$startTime = Get-Date

while ($true) {
    $builds = gcloud builds list --limit=1 --project=$PROJECT_ID --format="json" --sort-by=~createTime 2>&1 | ConvertFrom-Json
    
    if ($builds -and $builds.Count -gt 0) {
        $build = $builds[0]
        $status = $build.status
        $createTime = $build.createTime
        
        if ($status -ne $lastStatus) {
            $elapsed = (Get-Date) - $startTime
            Write-Host "[$($elapsed.ToString('mm\:ss'))] Build Status: $status" -ForegroundColor $(if ($status -eq "SUCCESS") { "Green" } elseif ($status -eq "FAILURE") { "Red" } elseif ($status -eq "WORKING") { "Yellow" } else { "Cyan" })
            $lastStatus = $status
        }
        
        if ($status -eq "SUCCESS") {
            Write-Host ""
            Write-Host "=" * 60 -ForegroundColor Green
            Write-Host "Build completed successfully!" -ForegroundColor Green
            Write-Host "=" * 60 -ForegroundColor Green
            Write-Host ""
            Write-Host "The deployment is now complete with:" -ForegroundColor Yellow
            Write-Host "✓ OPTIONS handler fix (CORS should work now)" -ForegroundColor Green
            Write-Host "✓ Latest frontend with all improvements" -ForegroundColor Green
            Write-Host "✓ Latest backend code" -ForegroundColor Green
            Write-Host ""
            Write-Host "Try logging in now at:" -ForegroundColor Cyan
            $frontendUrl = gcloud run services describe uw-workbench-frontend --region=us-central1 --format="value(status.url)" --project=$PROJECT_ID 2>&1 | Out-String
            $frontendUrl = $frontendUrl.Trim()
            Write-Host $frontendUrl -ForegroundColor White
            break
        } elseif ($status -eq "FAILURE") {
            Write-Host ""
            Write-Host "=" * 60 -ForegroundColor Red
            Write-Host "Build failed!" -ForegroundColor Red
            Write-Host "=" * 60 -ForegroundColor Red
            Write-Host ""
            Write-Host "Check logs: gcloud builds log $($build.id) --project=$PROJECT_ID" -ForegroundColor Yellow
            break
        }
    }
    
    Start-Sleep -Seconds 5
}



