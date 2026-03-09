# Run backend server using project's virtual environment
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

# Activate virtual environment
if (Test-Path "$projectRoot\.venv\Scripts\Activate.ps1") {
    & "$projectRoot\.venv\Scripts\Activate.ps1"
    Write-Host "Activated virtual environment: $projectRoot\.venv"
} else {
    Write-Host "Warning: Virtual environment not found at $projectRoot\.venv"
    Write-Host "Creating virtual environment..."
    python -m venv .venv
    & "$projectRoot\.venv\Scripts\Activate.ps1"
    Write-Host "Installing dependencies..."
    pip install -r backend\requirements.txt
}

# Set Python path to project root
$env:PYTHONPATH = $projectRoot

# Verify we're using the correct Python
Write-Host "Python executable: $(python -c 'import sys; print(sys.executable)')"
Write-Host "Project root: $projectRoot"
Write-Host "Starting server..."

# Start the server
python -m uvicorn backend.main:app --reload --port 8000 --host 127.0.0.1
