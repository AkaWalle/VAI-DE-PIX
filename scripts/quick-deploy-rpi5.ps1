# Script rápido para deploy no Raspberry Pi 5
# Configura o IP e executa o deploy

$RPI_IP = "192.168.10.130"
$RPI_USER = "pi"

Write-Host "🚀 Deploy Rápido para Raspberry Pi 5" -ForegroundColor Cyan
Write-Host "IP: $RPI_IP" -ForegroundColor Yellow
Write-Host ""

# Verificar se está na branch correta
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -ne "raspberry-pi-5") {
    Write-Host "⚠️  Você não está na branch raspberry-pi-5" -ForegroundColor Yellow
    Write-Host "Branch atual: $currentBranch" -ForegroundColor Yellow
    $switch = Read-Host "Deseja fazer checkout para raspberry-pi-5? (S/n)"
    if ($switch -ne "n" -and $switch -ne "N") {
        git checkout raspberry-pi-5
    }
}

# Executar deploy
Write-Host ""
Write-Host "Executando deploy..." -ForegroundColor Yellow
& ".\scripts\deploy-to-rpi5.ps1" -RpiIp $RPI_IP -RpiUser $RPI_USER

