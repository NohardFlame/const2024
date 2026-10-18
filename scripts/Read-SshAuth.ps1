# Reads gitignored ssh_auth. Never prints the password.
# Format:
#   login: USER
#   password: SECRET
param(
    [string]$AuthFile = (Join-Path (Split-Path $PSScriptRoot -Parent) "ssh_auth")
)

if (-not (Test-Path -LiteralPath $AuthFile)) {
    throw "Missing auth file: $AuthFile (create locally, see docs/deploy.md)"
}

$login = $null
$password = $null
Get-Content -LiteralPath $AuthFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -match '^\s*login\s*:\s*(.+)\s*$') {
        $login = $Matches[1].Trim()
    }
    elseif ($line -match '^\s*password\s*:\s*(.+)\s*$') {
        $password = $Matches[1].Trim()
    }
}

if (-not $login -or -not $password) {
    throw "ssh_auth must contain 'login:' and 'password:' lines"
}

[pscustomobject]@{
    Login     = $login
    Password  = $password
    HostName  = "141.8.192.14"          # SSH IP (may be flaky)
    FtpHost   = "informatics384.ru"     # preferred for deploy
    Site      = "informatics384.ru"
    RemoteRoot = "/domains/informatics384.ru/public_html/const2024"
    PublicUrl  = "https://informatics384.ru/const2024/"
}
