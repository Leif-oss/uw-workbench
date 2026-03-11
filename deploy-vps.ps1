# Deploy to Digital Ocean VPS
# This script helps deploy your local changes to the VPS

param(
    [string]$VpsHost = "157.245.172.164",
    [string]$VpsUser = "root",
    [string]$VpsPath = "/root/uw-workbench"
)

Write-Host "Deploying to Digital Ocean VPS" -ForegroundColor Cyan
Write-Host "VPS: $VpsUser@$VpsHost:$VpsPath" -ForegroundColor Yellow
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Host "Error: Must run from project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Creating deployment archive..." -ForegroundColor Yellow
$archiveName = "deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz"

# Create archive (exclude cache and node_modules)
git archive --format=tar.gz --output=$archiveName workbench-features

if (-not (Test-Path $archiveName)) {
    Write-Host "Error: Failed to create archive" -ForegroundColor Red
    exit 1
}

Write-Host "Archive created: $archiveName" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Transferring archive to VPS..." -ForegroundColor Yellow
scp $archiveName "${VpsUser}@${VpsHost}:${VpsPath}/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to transfer archive" -ForegroundColor Red
    Remove-Item $archiveName -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Archive transferred successfully" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Extracting and deploying on VPS..." -ForegroundColor Yellow
Write-Host ""

# SSH command to extract and deploy
$sshCommands = @"
cd $VpsPath
echo 'Extracting archive...'
tar -xzf $archiveName
rm $archiveName
echo 'Running database migrations...'
cd backend
python -m alembic upgrade head
cd ..
echo 'Updating services...'
./scripts/vps-update.sh
echo 'Deployment complete!'
"@

# Execute commands on VPS
ssh "${VpsUser}@${VpsHost}" $sshCommands

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Verify services: ssh $VpsUser@$VpsHost 'cd $VpsPath && docker compose -f docker-compose.prod.yml ps'" -ForegroundColor White
    Write-Host "  2. Check logs: ssh $VpsUser@$VpsHost 'cd $VpsPath && docker compose -f docker-compose.prod.yml logs --tail=50 backend'" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Deployment had errors. Check the output above." -ForegroundColor Red
}

# Clean up local archive
Remove-Item $archiveName -ErrorAction SilentlyContinue
