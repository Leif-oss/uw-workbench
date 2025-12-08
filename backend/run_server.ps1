$ErrorActionPreference = "Stop"

Param(
    [int]$Port = 8000
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = $PSScriptRoot

# Ensure imports resolve when launched from any location
$env:PYTHONPATH = $repoRoot

$outLog = Join-Path $backendDir "uvicorn.out.log"
$errLog = Join-Path $backendDir "uvicorn.err.log"

Write-Host "Starting backend (no reload) on port $Port..."
Write-Host "Logging to $outLog and $errLog"

Push-Location $repoRoot
try {
    while ($true) {
        # Run without --reload so watchfiles does not terminate the worker with CTRL_C events
        python -m uvicorn backend.main:app --host 0.0.0.0 --port $Port --proxy-headers 1>> $outLog 2>> $errLog
        $code = $LASTEXITCODE

        if ($code -eq 0 -or $code -eq 3221225786) {
            # uvicorn on Windows returns 0xC000013A (3221225786) for CTRL_BREAK
            # which is emitted by watchfiles reload/shutdown; treat it as a clean stop
            # so callers (Codex) don't interpret it as a crash.
            $global:LASTEXITCODE = 0
            Write-Host "Server stopped (code $code)."
            break
        }

        Write-Host "Server exited with code $code. Restarting in 2 seconds..."
        Start-Sleep -Seconds 2
    }
}
finally {
    Pop-Location
}
