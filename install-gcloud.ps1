# Install Google Cloud SDK for Windows
Write-Host "Installing Google Cloud SDK..." -ForegroundColor Cyan

# Check if chocolatey is installed
if (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "Using Chocolatey to install gcloud..." -ForegroundColor Yellow
    choco install gcloudsdk -y
} else {
    Write-Host "Chocolatey not found. Please install manually:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Download from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Cyan
    Write-Host "2. Run the installer"
    Write-Host "3. Restart your terminal/PowerShell"
    Write-Host ""
    Write-Host "Or install Chocolatey first, then run this script again:"
    Write-Host "   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
}

Write-Host ""
Write-Host "After installation, run:" -ForegroundColor Green
Write-Host "   gcloud init"
Write-Host "   gcloud auth login"





