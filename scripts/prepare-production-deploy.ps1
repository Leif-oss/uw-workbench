# Prepare Production Deployment
# Run this locally before deploying to VPS
# This merges workbench-features into production

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Preparing Production Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check current branch
$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "Current branch: $currentBranch" -ForegroundColor Yellow

if ($currentBranch -ne "workbench-features") {
    Write-Host "⚠️  Warning: You're not on workbench-features branch" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit
    }
}

# Check for uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  You have uncommitted changes:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    $commit = Read-Host "Commit these changes first? (y/n)"
    if ($commit -eq "y") {
        $message = Read-Host "Commit message"
        git add .
        git commit -m $message
        Write-Host "✅ Changes committed" -ForegroundColor Green
    }
}

# Switch to production branch
Write-Host ""
Write-Host "🔄 Switching to production branch..." -ForegroundColor Cyan
git checkout production

# Merge workbench-features into production
Write-Host "🔀 Merging workbench-features into production..." -ForegroundColor Cyan
git merge workbench-features --no-edit

# Push to remote
Write-Host "📤 Pushing production branch..." -ForegroundColor Cyan
git push origin production

Write-Host ""
Write-Host "✅ Production branch updated!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. SSH into VPS: ssh root@157.245.172.164"
Write-Host "2. Run: cd /root/uw-workbench && git pull && ./scripts/vps-update.sh"
Write-Host "   OR run: ./scripts/deploy-to-production.sh"
