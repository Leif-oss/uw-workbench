# PowerShell script to set up PDF transcription for local development
# This installs pdf2image and provides instructions for poppler-utils

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PDF Transcription Local Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the project root
$projectRoot = $PSScriptRoot
if (-not (Test-Path "$projectRoot\backend\requirements.txt")) {
    Write-Host "ERROR: Please run this script from the project root directory" -ForegroundColor Red
    Write-Host "Expected: backend\requirements.txt should exist" -ForegroundColor Yellow
    exit 1
}

Write-Host "Step 1: Checking Python virtual environment..." -ForegroundColor Yellow
$venvPath = "$projectRoot\.venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "  Creating virtual environment..." -ForegroundColor Gray
    python -m venv $venvPath
    Write-Host "  ✅ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "  ✅ Virtual environment exists" -ForegroundColor Green
}

# Activate venv
$activateScript = "$venvPath\Scripts\Activate.ps1"
if (Test-Path $activateScript) {
    & $activateScript
    Write-Host "  ✅ Virtual environment activated" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Could not activate virtual environment" -ForegroundColor Yellow
    Write-Host "  Please run: .\.venv\Scripts\Activate.ps1" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Step 2: Installing pdf2image package..." -ForegroundColor Yellow
pip install pdf2image
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ pdf2image installed" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Failed to install pdf2image" -ForegroundColor Yellow
    Write-Host "  Please run manually: pip install pdf2image" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Step 3: Poppler-utils (System Package)" -ForegroundColor Yellow
Write-Host "  ⚠️  REQUIRED: You need to install poppler-utils manually" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Option A (Recommended - GitHub Release):" -ForegroundColor White
Write-Host "    1. Download from: https://github.com/oschwartz10612/poppler-windows/releases/" -ForegroundColor Gray
Write-Host "    2. Get the latest Release-x.x.x.zip file" -ForegroundColor Gray
Write-Host "    3. Extract to C:\poppler (or any folder)" -ForegroundColor Gray
Write-Host "    4. Add to PATH: C:\poppler\Library\bin" -ForegroundColor Gray
Write-Host ""
Write-Host "  Option B (If you have conda):" -ForegroundColor White
Write-Host "    conda install -c conda-forge poppler" -ForegroundColor Gray
Write-Host ""
Write-Host "  To add to PATH (Windows 10/11):" -ForegroundColor White
Write-Host "    1. Search 'Environment Variables' in Start menu" -ForegroundColor Gray
Write-Host "    2. Click 'Environment Variables' button" -ForegroundColor Gray
Write-Host "    3. Under 'User variables', select 'Path' and click 'Edit'" -ForegroundColor Gray
Write-Host "    4. Click 'New' and add: C:\poppler\Library\bin" -ForegroundColor Gray
Write-Host "    5. Click OK on all dialogs" -ForegroundColor Gray
Write-Host "    6. Restart PowerShell/Terminal" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 4: Verify installation..." -ForegroundColor Yellow
Write-Host "  Testing pdf2image import..." -ForegroundColor Gray
python -c "try:
    from pdf2image import convert_from_bytes
    print('✅ pdf2image is installed')
except ImportError:
    print('❌ pdf2image is NOT installed')"
    
Write-Host "  Testing poppler (pdftoppm command)..." -ForegroundColor Gray
$popplerTest = Get-Command pdftoppm -ErrorAction SilentlyContinue
if ($popplerTest) {
    Write-Host "  ✅ poppler-utils is in PATH" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  poppler-utils NOT found in PATH" -ForegroundColor Yellow
    Write-Host "  Please install poppler-utils (see Step 3 above)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. If you installed poppler, restart your terminal/PowerShell" -ForegroundColor White
Write-Host "  2. Restart your backend server" -ForegroundColor White
Write-Host "  3. Try uploading a scanned PDF - Layer 2 should work!" -ForegroundColor White
Write-Host ""
