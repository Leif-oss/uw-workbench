# Step 3: Store Secrets in Secret Manager
Write-Host "Storing Secrets in Secret Manager..." -ForegroundColor Yellow
Write-Host ""

# OpenAI API Key (Required)
Write-Host "Enter your OpenAI API Key:" -ForegroundColor Cyan
Write-Host "(It should start with 'sk-')" -ForegroundColor Gray
$aiKey = Read-Host

if ($aiKey) {
    Write-Host "`nStoring OpenAI API key..." -ForegroundColor Cyan
    echo -n $aiKey | gcloud secrets create ai-api-key --data-file=- 2>$null
    if ($LASTEXITCODE -ne 0) {
        # Secret already exists, add new version
        Write-Host "Secret already exists, updating..." -ForegroundColor Yellow
        echo -n $aiKey | gcloud secrets versions add ai-api-key --data-file=-
    }
    Write-Host "✅ OpenAI API key stored" -ForegroundColor Green
} else {
    Write-Host "⚠️  No API key provided, skipping..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "SMTP Settings (Optional - for email functionality)" -ForegroundColor Cyan
$setupSMTP = Read-Host "Set up SMTP? [y/n]"

if ($setupSMTP -eq "y") {
    $smtpHost = Read-Host "SMTP Host (e.g., smtp.gmail.com)"
    $smtpPort = Read-Host "SMTP Port (e.g., 587)"
    $smtpUser = Read-Host "SMTP User/Email"
    $smtpPass = Read-Host "SMTP Password" -AsSecureString
    $smtpFromEmail = Read-Host "From Email"
    $smtpFromName = Read-Host "From Name (e.g., UW Workbench)"
    
    $smtpPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($smtpPass)
    )
    
    $smtpSecrets = @{
        "smtp-host" = $smtpHost
        "smtp-port" = $smtpPort
        "smtp-user" = $smtpUser
        "smtp-password" = $smtpPassPlain
        "smtp-from-email" = $smtpFromEmail
        "smtp-from-name" = $smtpFromName
    }
    
    Write-Host "`nStoring SMTP secrets..." -ForegroundColor Cyan
    foreach ($name in $smtpSecrets.Keys) {
        $value = $smtpSecrets[$name]
        if ($value) {
            echo -n $value | gcloud secrets create $name --data-file=- 2>$null
            if ($LASTEXITCODE -ne 0) {
                echo -n $value | gcloud secrets versions add $name --data-file=-
            }
        }
    }
    Write-Host "✅ SMTP secrets stored" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Secrets stored!" -ForegroundColor Green
Write-Host "`nNext step: Grant service account permissions" -ForegroundColor Cyan



