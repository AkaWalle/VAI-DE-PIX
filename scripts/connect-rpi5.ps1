# Script PowerShell para conectar ao Raspberry Pi 5
# Uso: .\scripts\connect-rpi5.ps1 [comando]

param(
    [string]$RpiIp = "192.168.10.130",
    [string]$RpiUser = "pi",
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Command
)

if ($Command.Count -eq 0) {
    Write-Host "🔌 Conectando ao Raspberry Pi 5..." -ForegroundColor Cyan
    Write-Host "IP: $RpiIp"
    Write-Host "Usuário: $RpiUser"
    Write-Host ""
    ssh "$RpiUser@$RpiIp"
} else {
    Write-Host "🔌 Executando comando no Raspberry Pi 5..." -ForegroundColor Cyan
    $cmd = $Command -join " "
    ssh "$RpiUser@$RpiIp" $cmd
}

