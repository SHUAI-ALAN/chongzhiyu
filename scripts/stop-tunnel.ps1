$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$runtimeDir = Join-Path $root "server\runtime"
$infoFile = Join-Path $runtimeDir "tunnel-info.json"

if (-not (Test-Path $infoFile)) {
  Write-Host "No tunnel-info.json found. Nothing to stop."
  exit 0
}

$info = Get-Content -LiteralPath $infoFile -Raw | ConvertFrom-Json
$process = Get-Process -Id $info.pid -ErrorAction SilentlyContinue

if ($process) {
  Stop-Process -Id $info.pid
  Write-Host "Stopped tunnel process PID: $($info.pid)"
} else {
  Write-Host "Tunnel process was not running: $($info.pid)"
}

Remove-Item -LiteralPath $infoFile -ErrorAction SilentlyContinue
Write-Host "Removed tunnel info file."
