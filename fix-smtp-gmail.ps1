# Fix Gmail SMTP Configuration
# This script helps configure Gmail SMTP with App Password

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Gmail SMTP Configuration Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "ISSUE DETECTED:" -ForegroundColor Red
Write-Host "Gmail authentication failing - 'Username and Password not accepted'" -ForegroundColor Yellow
Write-Host ""
Write-Host "SOLUTION:" -ForegroundColor Green
Write-Host "Gmail requires an 'App Password' (not your regular password)" -ForegroundColor White
Write-Host ""
Write-Host "Steps to fix:" -ForegroundColor Yellow
Write-Host "1. Go to: https://myaccount.google.com/apppasswords" -ForegroundColor Cyan
Write-Host "2. Sign in to your Google account" -ForegroundColor Cyan
Write-Host "3. Select 'Mail' and 'Other (Custom name)'" -ForegroundColor Cyan
Write-Host "4. Enter 'UW Workbench' as the app name" -ForegroundColor Cyan
Write-Host "5. Click 'Generate'" -ForegroundColor Cyan
Write-Host "6. Copy the 16-character App Password (looks like: xxxx xxxx xxxx xxxx)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Then run this command to update the secret:" -ForegroundColor Yellow
Write-Host '  echo "your-16-char-app-password" | gcloud secrets versions add smtp-password --data-file=-' -ForegroundColor White
Write-Host ""
Write-Host "NOTE: Remove spaces from the App Password before pasting!" -ForegroundColor Yellow
Write-Host ""

$continue = Read-Host "Do you have an App Password ready? (y/n)"
if ($continue -eq "y" -or $continue -eq "Y") {
    Write-Host ""
    Write-Host "Enter your Gmail email address:" -ForegroundColor Cyan
    $email = Read-Host
    
    Write-Host "Enter your 16-character App Password (no spaces):" -ForegroundColor Cyan
    $appPassword = Read-Host -AsSecureString
    $appPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($appPassword))
    
    Write-Host ""
    Write-Host "Updating secrets..." -ForegroundColor Yellow
    
    # Update SMTP user (email)
    echo -n $email | gcloud secrets versions add smtp-user --data-file=-
    Write-Host "  ✓ Updated smtp-user" -ForegroundColor Green
    
    # Update SMTP password (app password)
    echo -n $appPasswordPlain | gcloud secrets versions add smtp-password --data-file=-
    Write-Host "  ✓ Updated smtp-password" -ForegroundColor Green
    
    # Verify
    Write-Host ""
    Write-Host "Verification:" -ForegroundColor Cyan
    $verifyUser = (gcloud secrets versions access latest --secret=smtp-user 2>&1).Trim()
    $verifyPassLength = (gcloud secrets versions access latest --secret=smtp-password 2>&1).Length
    Write-Host "  SMTP_USER: $verifyUser" -ForegroundColor Green
    Write-Host "  SMTP_PASSWORD: [$verifyPassLength characters]" -ForegroundColor Green
    
    if ($verifyPassLength -eq 16) {
        Write-Host ""
        Write-Host "✓ Configuration looks correct!" -ForegroundColor Green
        Write-Host ""
        Write-Host "The next time an email is sent, it should work." -ForegroundColor Cyan
        Write-Host "You may need to wait a minute for secret propagation." -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "⚠ Warning: App Password should be 16 characters (got $verifyPassLength)" -ForegroundColor Yellow
        Write-Host "Make sure you removed all spaces from the App Password!" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "Please get an App Password first:" -ForegroundColor Yellow
    Write-Host "https://myaccount.google.com/apppasswords" -ForegroundColor Cyan
}



