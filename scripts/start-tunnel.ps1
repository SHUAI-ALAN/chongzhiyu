param(
  [int]$Port = 8787,
  [string]$HostName = "127.0.0.1",
  [string]$Subdomain = "chongzhiyu-shuai",
  [switch]$Restart
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$runtimeDir = Join-Path $root "server\runtime"
$infoFile = Join-Path $runtimeDir "tunnel-info.json"
$outFile = Join-Path $runtimeDir "tunnel-serveo.out.log"
$errFile = Join-Path $runtimeDir "tunnel-serveo.err.log"

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

function Test-ProcessRunning($processId) {
  if (-not $processId) { return $false }
  return [bool](Get-Process -Id $processId -ErrorAction SilentlyContinue)
}

if (Test-Path $infoFile) {
  $existing = Get-Content -LiteralPath $infoFile -Raw | ConvertFrom-Json
  if (Test-ProcessRunning $existing.pid) {
    if (-not $Restart) {
      Write-Host "Tunnel is already running."
      Write-Host "PID: $($existing.pid)"
      Write-Host "Public URL: $($existing.publicUrl)"
      Write-Host "Official URL: $($existing.officialUrl)"
      Write-Host "Use 'npm run tunnel:stop' before starting a new tunnel."
      exit 0
    }
    Stop-Process -Id $existing.pid -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  }
}

try {
  $health = Invoke-RestMethod -Uri "http://$HostName`:$Port/health" -TimeoutSec 5
  if ($health.code -ne 0) {
    throw "Unexpected health response"
  }
} catch {
  Write-Error "Local server is not ready at http://$HostName`:$Port. Start it first with 'npm run dev'."
  exit 1
}

Remove-Item -LiteralPath $outFile,$errFile -ErrorAction SilentlyContinue

$remoteSpec = if ($Subdomain) {
  "$Subdomain`:80:$HostName`:$Port"
} else {
  "80:$HostName`:$Port"
}

$sshArgs = @(
  "-o", "StrictHostKeyChecking=no",
  "-o", "ServerAliveInterval=60",
  "-R", $remoteSpec,
  "serveo.net"
)

$process = Start-Process `
  -FilePath "ssh.exe" `
  -ArgumentList $sshArgs `
  -WindowStyle Hidden `
  -RedirectStandardOutput $outFile `
  -RedirectStandardError $errFile `
  -PassThru

$publicUrl = ""
$registrationUrl = ""
for ($i = 0; $i -lt 24; $i++) {
  Start-Sleep -Milliseconds 500
  $output = ""
  if (Test-Path $outFile) { $output += Get-Content -LiteralPath $outFile -Raw -ErrorAction SilentlyContinue }
  if (Test-Path $errFile) { $output += Get-Content -LiteralPath $errFile -Raw -ErrorAction SilentlyContinue }
  $cleanOutput = [regex]::Replace($output, "`e\[[0-9;]*m", "")
  $registrationMatch = [regex]::Match($cleanOutput, "https://console\.serveo\.net/ssh/keys\?[^\s]+")
  if ($registrationMatch.Success) {
    $registrationUrl = $registrationMatch.Value.Trim()
  }
  $match = [regex]::Match($cleanOutput, "Forwarding HTTP traffic from\s+(https://[A-Za-z0-9.-]+)")
  if ($match.Success) {
    $publicUrl = $match.Groups[1].Value.Trim()
    break
  }
  if (-not (Test-ProcessRunning $process.Id)) {
    break
  }
}

if (-not $publicUrl) {
  Write-Error "Tunnel started but no public URL was detected. Check $outFile and $errFile."
  exit 1
}

$info = [ordered]@{
  provider = "serveo"
  pid = $process.Id
  localUrl = "http://$HostName`:$Port"
  publicUrl = $publicUrl
  officialUrl = "$publicUrl/official/"
  adminUrl = "$publicUrl/admin/"
  startedAt = (Get-Date).ToString("s")
  subdomain = $Subdomain
  requestedFixedUrl = if ($Subdomain) { "https://$Subdomain.serveousercontent.com" } else { "" }
  fixedUrlActive = if ($Subdomain) { $publicUrl -eq "https://$Subdomain.serveousercontent.com" } else { $false }
  registrationUrl = $registrationUrl
  command = "ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -R $remoteSpec serveo.net"
}

[System.IO.File]::WriteAllText($infoFile, ($info | ConvertTo-Json), [System.Text.UTF8Encoding]::new($false))

Write-Host "Tunnel started."
Write-Host "PID: $($process.Id)"
Write-Host "Public URL: $publicUrl"
Write-Host "Official URL: $publicUrl/official/"
Write-Host "Admin URL: $publicUrl/admin/"
if ($Subdomain -and $publicUrl -ne "https://$Subdomain.serveousercontent.com") {
  Write-Host "Requested fixed URL: https://$Subdomain.serveousercontent.com"
  Write-Host "Serveo did not assign the fixed URL yet. Register the SSH key first:"
  Write-Host $registrationUrl
}
Write-Host "Info saved to: $infoFile"
