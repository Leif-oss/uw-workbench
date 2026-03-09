# Setup secrets for UW-WORKBENCH (after billing is enabled)
# This script will add your secrets to Secret Manager

$PROJECT_ID = "ultra-ace-481723-e6"

Write-Host "🔐 Setting up secrets for UW-WORKBENCH" -ForegroundColor Cyan
Write-Host "Project ID: $PROJECT_ID"
Write-Host ""

# Read OpenAI API key from private/.env
$envFile = "private\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    $aiKey = ($envContent | Select-String "AI_API_KEY=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
    
    if ($aiKey) {
        Write-Host "Found AI_API_KEY in private/.env" -ForegroundColor Green
        Write-Host "Creating/updating secret: ai-api-key..." -ForegroundColor Yellow
        
        # Create secret if it doesn't exist
        gcloud secrets create ai-api-key --replication-policy="automatic" 2>$null
        
        # Add new version
        $aiKey | gcloud secrets versions add ai-api-key --data-file=-
        Write-Host "✅ ai-api-key secret created/updated" -ForegroundColor Green
    } else {
        Write-Host "⚠️  AI_API_KEY not found in private/.env" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  private/.env file not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 You'll need to manually add:" -ForegroundColor Cyan
Write-Host "   - Admin Password: gcloud secrets versions add admin-password --data-file=-"
Write-Host "   - Database Password (if using Cloud SQL): gcloud secrets versions add db-password --data-file=-"
Write-Host ""
Write-Host "Example:" -ForegroundColor Yellow
Write-Host "   `$adminPass = 'your-secure-password'"
Write-Host "   `$adminPass | gcloud secrets versions add admin-password --data-file=-"





