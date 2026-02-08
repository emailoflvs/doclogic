# Add doclogic_v7 to Windows hosts (run as Administrator)
# Right-click -> Run with PowerShell (as Admin)

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$entry = "127.0.0.1 doclogic_v7"

$content = Get-Content $hostsPath -Raw
if ($content -match 'doclogic_v7') {
    Write-Host "doclogic_v7 already in hosts"
} else {
    Add-Content -Path $hostsPath -Value "`n$entry"
    Write-Host "Added: $entry"
}
Write-Host "Done. Open http://doclogic_v7:8087/"
