# PowerShell script to check cloud configuration
# This checks environment variables and Cloud Run service configuration

Write-Host "=" -NoNewline
Write-Host ("=" * 79)
Write-Host "CLOUD CONFIGURATION CHECKER"
Write-Host "=" -NoNewline
Write-Host ("=" * 79)
Write-Host ""

# Check if gcloud is installed
$gcloudInstalled = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloudInstalled) {
    Write-Host "ERROR: gcloud CLI is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Install from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Get project ID
$projectId = gcloud config get-value project 2>$null
if (-not $projectId) {
    Write-Host "ERROR: No GCP project selected" -ForegroundColor Red
    Write-Host "Run: gcloud config set project PROJECT_ID" -ForegroundColor Yellow
    exit 1
}

Write-Host "Project ID: $projectId" -ForegroundColor Cyan
Write-Host ""

# Check Cloud Run services
Write-Host "CLOUD RUN SERVICES:" -ForegroundColor Yellow
Write-Host "-" * 80
$services = @("uw-workbench-backend", "uw-workbench-frontend")

foreach ($service in $services) {
    Write-Host "`nChecking service: $service" -ForegroundColor Cyan
    $serviceInfo = gcloud run services describe $service --region us-central1 --format="json" 2>$null | ConvertFrom-Json
    
    if ($serviceInfo) {
        Write-Host "  ✓ Service exists" -ForegroundColor Green
        Write-Host "  URL: $($serviceInfo.status.url)" -ForegroundColor Gray
        
        # Check environment variables
        $envVars = $serviceInfo.spec.template.spec.containers[0].env
        if ($envVars) {
            Write-Host "  Environment Variables:" -ForegroundColor Gray
            $envVars | Where-Object { $_.name -notmatch "PASSWORD|SECRET|KEY" } | ForEach-Object {
                Write-Host "    $($_.name): $($_.value)" -ForegroundColor DarkGray
            }
            $secretVars = $envVars | Where-Object { $_.valueFrom -ne $null }
            if ($secretVars) {
                Write-Host "  Secrets (from Secret Manager):" -ForegroundColor Gray
                $secretVars | ForEach-Object {
                    Write-Host "    $($_.name): ✓ (from Secret Manager)" -ForegroundColor DarkGray
                }
            }
        }
        
        # Check Cloud SQL connections
        $vpcAccess = $serviceInfo.spec.template.spec.containers[0].resources.vpcAccess
        if ($vpcAccess) {
            Write-Host "  ✓ VPC Access configured" -ForegroundColor Green
        }
    } else {
        Write-Host "  ✗ Service not found" -ForegroundColor Red
    }
}

Write-Host "`n" + ("=" * 80)
Write-Host "SECRET MANAGER SECRETS:" -ForegroundColor Yellow
Write-Host "-" * 80

$requiredSecrets = @(
    "SMTP_HOST",
    "SMTP_PORT", 
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_FROM_EMAIL",
    "SMTP_FROM_NAME",
    "DB_PASSWORD"
)

$secrets = gcloud secrets list --format="json" 2>$null | ConvertFrom-Json

foreach ($secretName in $requiredSecrets) {
    $secret = $secrets | Where-Object { $_.name -eq $secretName }
    if ($secret) {
        Write-Host "  ✓ $secretName" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $secretName (NOT FOUND)" -ForegroundColor Red
    }
}

Write-Host "`n" + ("=" * 80)
Write-Host "CLOUD SQL INSTANCES:" -ForegroundColor Yellow
Write-Host "-" * 80

$sqlInstances = gcloud sql instances list --format="json" 2>$null | ConvertFrom-Json

if ($sqlInstances -and $sqlInstances.Count -gt 0) {
    foreach ($instance in $sqlInstances) {
        Write-Host "  Instance: $($instance.name)" -ForegroundColor Cyan
        Write-Host "    State: $($instance.state)" -ForegroundColor $(if ($instance.state -eq "RUNNABLE") { "Green" } else { "Red" })
        Write-Host "    Region: $($instance.region)" -ForegroundColor Gray
        Write-Host "    Connection Name: $($instance.connectionName)" -ForegroundColor Gray
    }
} else {
    Write-Host "  ✗ No Cloud SQL instances found" -ForegroundColor Red
}

Write-Host "`n" + ("=" * 80)
Write-Host "RECOMMENDATIONS:" -ForegroundColor Yellow
Write-Host "-" * 80
Write-Host ""
Write-Host "1. Run the Python diagnostic script to check runtime configuration:" -ForegroundColor Cyan
Write-Host "   python backend/check_cloud_config.py" -ForegroundColor White
Write-Host ""
Write-Host "2. Test database connection:" -ForegroundColor Cyan
Write-Host "   gcloud run services describe uw-workbench-backend --region us-central1" -ForegroundColor White
Write-Host ""
Write-Host "3. Check Cloud Run logs for errors:" -ForegroundColor Cyan
Write-Host "   gcloud run services logs read uw-workbench-backend --region us-central1 --limit 50" -ForegroundColor White
Write-Host ""
Write-Host "4. Verify Cloud SQL connection in Cloud Run:" -ForegroundColor Cyan
Write-Host "   - Go to Cloud Run console" -ForegroundColor White
Write-Host "   - Select uw-workbench-backend service" -ForegroundColor White
Write-Host "   - Check 'Connections' tab" -ForegroundColor White
Write-Host "   - Verify Cloud SQL instance is connected" -ForegroundColor White
Write-Host ""



