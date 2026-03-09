# Pre-Deployment Checklist Verification Script
# Usage: .\scripts\pre_deployment_check.ps1

param(
    [switch]$SkipBackup,
    [switch]$Verbose
)

$ErrorCount = 0
$WarningCount = 0
$CheckCount = 0

function Write-Check {
    param([string]$Message, [string]$Status = "INFO")
    $script:CheckCount++
    $color = switch ($Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "WARN" { "Yellow" }
        default { "White" }
    }
    $symbol = switch ($Status) {
        "PASS" { "✅" }
        "FAIL" { "❌" }
        "WARN" { "⚠️ " }
        default { "ℹ️ " }
    }
    Write-Host "$symbol $Message" -ForegroundColor $color
}

function Test-Command {
    param([string]$Command)
    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pre-Deployment Checklist Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Environment Check
Write-Host "1. Environment & Tools" -ForegroundColor Yellow
Write-Host "----------------------" -ForegroundColor Gray

if (Test-Command "gcloud") {
    Write-Check "gcloud CLI installed" "PASS"
    $ProjectId = gcloud config get-value project 2>$null
    if ($ProjectId) {
        Write-Check "GCP project configured: $ProjectId" "PASS"
    } else {
        Write-Check "GCP project not configured" "FAIL"
        $script:ErrorCount++
    }
} else {
    Write-Check "gcloud CLI not installed" "FAIL"
    $script:ErrorCount++
}

if (Test-Command "git") {
    Write-Check "Git installed" "PASS"
    $GitStatus = git status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Check "Git repository detected" "PASS"
    } else {
        Write-Check "Not in a Git repository" "WARN"
        $script:WarningCount++
    }
} else {
    Write-Check "Git not installed" "WARN"
    $script:WarningCount++
}

Write-Host ""

# 2. Code Quality Checks
Write-Host "2. Code Quality Checks" -ForegroundColor Yellow
Write-Host "----------------------" -ForegroundColor Gray

# Check for hardcoded secrets
$SecretsPattern = @(
    "sk-[a-zA-Z0-9]{20,}",
    "password\s*=\s*['\"][^'\"]+['\"]",
    "api[_-]?key\s*=\s*['\"][^'\"]+['\"]",
    "secret\s*=\s*['\"][^'\"]+['\"]"
)

$HardcodedSecrets = Get-ChildItem -Path . -Include *.py,*.ts,*.tsx,*.js,*.env -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notmatch "node_modules|\.venv|dist|build" } |
    Select-String -Pattern ($SecretsPattern -join "|") -ErrorAction SilentlyContinue

if ($HardcodedSecrets) {
    Write-Check "Potential hardcoded secrets found" "FAIL"
    if ($Verbose) {
        $HardcodedSecrets | ForEach-Object {
            Write-Host "  File: $($_.Path):$($_.LineNumber) - $($_.Line.Trim())" -ForegroundColor Red
        }
    } else {
        Write-Host "  Run with -Verbose to see details" -ForegroundColor Gray
    }
    $script:ErrorCount++
} else {
    Write-Check "No hardcoded secrets detected" "PASS"
}

# Check for hardcoded localhost URLs
$HardcodedUrls = Get-ChildItem -Path . -Include *.py,*.ts,*.tsx,*.js -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|\.venv|dist|build|start_backend|start_frontend" } |
    Select-String -Pattern "(http://127\.0\.0\.1|http://localhost|localhost:8000|localhost:5173)" -ErrorAction SilentlyContinue |
    Where-Object { $_.Line -notmatch "(//|#|/\*).*localhost" }

if ($HardcodedUrls) {
    Write-Check "Potential hardcoded localhost URLs found" "WARN"
    if ($Verbose) {
        $HardcodedUrls | Select-Object -First 5 | ForEach-Object {
            Write-Host "  File: $($_.Path):$($_.LineNumber)" -ForegroundColor Yellow
        }
    }
    $script:WarningCount++
} else {
    Write-Check "No hardcoded localhost URLs detected" "PASS"
}

Write-Host ""

# 3. Database Checks
Write-Host "3. Database & Migrations" -ForegroundColor Yellow
Write-Host "----------------------" -ForegroundColor Gray

if (Test-Path "backend/alembic") {
    Write-Check "Alembic migrations directory exists" "PASS"
    
    # Check for pending migrations
    if (Test-Command "alembic") {
        Push-Location backend
        $MigrationStatus = alembic current 2>&1
        Pop-Location
        if ($LASTEXITCODE -eq 0) {
            Write-Check "Migrations configured" "PASS"
        } else {
            Write-Check "Migration check failed - verify Alembic setup" "WARN"
            $script:WarningCount++
        }
    } else {
        Write-Check "Alembic not installed or not in PATH" "WARN"
        $script:WarningCount++
    }
} else {
    Write-Check "Alembic migrations directory not found" "WARN"
    $script:WarningCount++
}

# Check database backup
if (-not $SkipBackup) {
    Write-Check "Run backup_database.ps1 before deployment" "INFO"
    Write-Host "  Execute: .\scripts\backup_database.ps1" -ForegroundColor Gray
} else {
    Write-Check "Backup check skipped (using -SkipBackup)" "WARN"
}

Write-Host ""

# 4. Environment Variables
Write-Host "4. Environment Configuration" -ForegroundColor Yellow
Write-Host "----------------------" -ForegroundColor Gray

$RequiredSecrets = @(
    "ai-api-key",
    "db-password"
)

$MissingSecrets = @()
foreach ($secret in $RequiredSecrets) {
    $SecretExists = gcloud secrets describe $secret 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Check "Secret '$secret' exists in Secret Manager" "PASS"
    } else {
        Write-Check "Secret '$secret' not found in Secret Manager" "FAIL"
        $script:ErrorCount++
        $MissingSecrets += $secret
    }
}

# Check for .env files (should not be in production)
if (Test-Path "backend/.env") {
    Write-Check ".env file found (should use Secret Manager in production)" "WARN"
    $script:WarningCount++
}

Write-Host ""

# 5. Build Checks
Write-Host "5. Build & Dependencies" -ForegroundColor Yellow
Write-Host "----------------------" -ForegroundColor Gray

# Check backend requirements
if (Test-Path "backend/requirements.txt") {
    Write-Check "Backend requirements.txt exists" "PASS"
} else {
    Write-Check "Backend requirements.txt not found" "FAIL"
    $script:ErrorCount++
}

# Check frontend package.json
if (Test-Path "frontend/package.json") {
    Write-Check "Frontend package.json exists" "PASS"
    
    # Check if node_modules exists (for local builds)
    if (Test-Path "frontend/node_modules") {
        Write-Check "Frontend dependencies installed" "PASS"
    } else {
        Write-Check "Frontend dependencies not installed (run npm install)" "WARN"
        $script:WarningCount++
    }
} else {
    Write-Check "Frontend package.json not found" "FAIL"
    $script:ErrorCount++
}

Write-Host ""

# 6. Docker & Cloud Build
Write-Host "6. Deployment Configuration" -ForegroundColor Yellow
Write-Host "----------------------" -ForegroundColor Gray

if (Test-Path "backend/Dockerfile") {
    Write-Check "Backend Dockerfile exists" "PASS"
} else {
    Write-Check "Backend Dockerfile not found" "FAIL"
    $script:ErrorCount++
}

if (Test-Path "frontend/Dockerfile") {
    Write-Check "Frontend Dockerfile exists" "PASS"
} else {
    Write-Check "Frontend Dockerfile not found" "FAIL"
    $script:ErrorCount++
}

if (Test-Path "cloudbuild.yaml") {
    Write-Check "Cloud Build configuration exists" "PASS"
} else {
    Write-Check "Cloud Build configuration not found" "WARN"
    $script:WarningCount++
}

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total Checks: $CheckCount" -ForegroundColor White
Write-Host "Errors: $ErrorCount" -ForegroundColor $(if ($ErrorCount -gt 0) { "Red" } else { "Green" })
Write-Host "Warnings: $WarningCount" -ForegroundColor $(if ($WarningCount -gt 0) { "Yellow" } else { "Green" })
Write-Host ""

if ($ErrorCount -gt 0) {
    Write-Host "❌ DEPLOYMENT BLOCKED" -ForegroundColor Red
    Write-Host "Please fix all errors before deploying." -ForegroundColor Red
    exit 1
} elseif ($WarningCount -gt 0) {
    Write-Host "⚠️  DEPLOYMENT READY WITH WARNINGS" -ForegroundColor Yellow
    Write-Host "Review warnings before deploying." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "✅ ALL CHECKS PASSED" -ForegroundColor Green
    Write-Host "Ready for deployment!" -ForegroundColor Green
    exit 0
}
