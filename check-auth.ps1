# Check if authentication is working
Write-Host "Checking Google Cloud authentication..." -ForegroundColor Yellow

$authCheck = gcloud auth list 2>&1
Write-Host $authCheck

$projectCheck = gcloud config get-value project 2>&1
Write-Host "`nCurrent project: $projectCheck" -ForegroundColor Cyan

Write-Host "`nTesting API access..." -ForegroundColor Yellow
$testResult = gcloud services list --enabled --limit=1 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Authentication is working!" -ForegroundColor Green
} else {
    Write-Host "❌ Authentication issue detected" -ForegroundColor Red
    Write-Host $testResult
}



