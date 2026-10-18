# Thin wrapper: deploy via FTP Python script (reads ssh_auth, never prints password).
# Usage: powershell -NoProfile -File scripts/Deploy-To-Host.ps1
param(
    [string]$RemoteRoot = "/domains/informatics384.ru/public_html/const2024"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot
& python (Join-Path $PSScriptRoot "Deploy-To-Host.py") --remote-root $RemoteRoot
exit $LASTEXITCODE
