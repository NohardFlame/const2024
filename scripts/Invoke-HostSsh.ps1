# Run a remote command on the project host using credentials from ssh_auth.
# Uses PuTTY plink.exe — password is read from file, never printed.
# Usage (from repo root):
#   powershell -NoProfile -File scripts/Invoke-HostSsh.ps1 -RemoteCommand "pwd; ls"
param(
    [Parameter(Mandatory = $true)]
    [string]$RemoteCommand
)

$ErrorActionPreference = "Stop"
$auth = & (Join-Path $PSScriptRoot "Read-SshAuth.ps1")

$plink = "C:\Program Files\PuTTY\plink.exe"
if (-not (Test-Path -LiteralPath $plink)) {
    $plinkCmd = Get-Command plink -ErrorAction SilentlyContinue
    if (-not $plinkCmd) {
        throw "plink.exe not found (install PuTTY)"
    }
    $plink = $plinkCmd.Source
}

# Prefer domain host (works for FTP); IP for SSH as documented
$hostName = if ($env:CONST_SSH_HOST) { $env:CONST_SSH_HOST } else { $auth.HostName }
$target = "$($auth.Login)@$hostName"

# Cache host key non-interactively (first connect)
$null = cmd /c "echo y| `"$plink`" -ssh $target -pw $($auth.Password) exit" 2>&1

$output = & $plink -ssh $target -pw $auth.Password -batch $RemoteCommand 2>&1
$code = $LASTEXITCODE
$output | ForEach-Object {
    $line = "$_"
    if ($line -match "host key|Store key|cache|WARNING") {
        return
    }
    Write-Output $line
}
exit $code
