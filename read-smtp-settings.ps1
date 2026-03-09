# Read SMTP settings from .env file
$envFile = "backend\.env"

if (Test-Path $envFile) {
    Write-Host "Reading SMTP settings from $envFile..." -ForegroundColor Yellow
    Write-Host ""
    
    $content = Get-Content $envFile
    
    $smtpSettings = @{}
    
    foreach ($line in $content) {
        if ($line -match "^SMTP_") {
            $parts = $line -split "=", 2
            if ($parts.Length -eq 2) {
                $key = $parts[0].Trim()
                $value = $parts[1].Trim().Trim('"').Trim("'")
                $smtpSettings[$key] = $value
            }
        }
    }
    
    if ($smtpSettings.Count -gt 0) {
        Write-Host "Found SMTP settings:" -ForegroundColor Green
        Write-Host ""
        foreach ($key in $smtpSettings.Keys) {
            if ($key -eq "SMTP_PASSWORD") {
                Write-Host "$key = [HIDDEN]" -ForegroundColor Gray
            } else {
                Write-Host "$key = $($smtpSettings[$key])" -ForegroundColor Cyan
            }
        }
        Write-Host ""
        Write-Host "Use these values when prompted by the deployment script." -ForegroundColor Yellow
    } else {
        Write-Host "No SMTP settings found in .env file" -ForegroundColor Yellow
    }
} else {
    Write-Host "File not found: $envFile" -ForegroundColor Red
    Write-Host "Looking for .env in other locations..." -ForegroundColor Yellow
    
    $altPaths = @("private\.env", ".env")
    foreach ($path in $altPaths) {
        if (Test-Path $path) {
            Write-Host "Found: $path" -ForegroundColor Green
            $content = Get-Content $path
            foreach ($line in $content) {
                if ($line -match "^SMTP_") {
                    Write-Host $line -ForegroundColor Cyan
                }
            }
        }
    }
}



