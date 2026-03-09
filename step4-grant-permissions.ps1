# Step 4: Grant Service Account Permissions
Write-Host "Granting Service Account Permissions..." -ForegroundColor Yellow
Write-Host ""

$PROJECT_ID = "ultra-ace-481723-e6"
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

Write-Host "Project: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "Service Account: $SERVICE_ACCOUNT" -ForegroundColor Cyan
Write-Host ""

# Grant access to OpenAI API key secret
Write-Host "Granting access to ai-api-key..." -ForegroundColor Cyan
gcloud secrets add-iam-policy-binding ai-api-key `
    --member="serviceAccount:$SERVICE_ACCOUNT" `
    --role="roles/secretmanager.secretAccessor" `
    --project=$PROJECT_ID
Write-Host "✅ ai-api-key access granted" -ForegroundColor Green

# Grant access to SMTP secrets
$smtpSecrets = @("smtp-host", "smtp-port", "smtp-user", "smtp-password", "smtp-from-email", "smtp-from-name")

foreach ($secretName in $smtpSecrets) {
    Write-Host "Granting access to $secretName..." -ForegroundColor Cyan
    $result = gcloud secrets add-iam-policy-binding $secretName `
        --member="serviceAccount:$SERVICE_ACCOUNT" `
        --role="roles/secretmanager.secretAccessor" `
        --project=$PROJECT_ID 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $secretName access granted" -ForegroundColor Green
    } else {
        # Secret might not exist (user skipped SMTP), that's okay
        if ($result -match "NOT_FOUND") {
            Write-Host "⚠️  $secretName not found (skipped)" -ForegroundColor Yellow
        } else {
            Write-Host "⚠️  ${secretName}: $result" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "✅ Permissions granted!" -ForegroundColor Green
Write-Host "`nNext step: Build Docker image" -ForegroundColor Cyan

