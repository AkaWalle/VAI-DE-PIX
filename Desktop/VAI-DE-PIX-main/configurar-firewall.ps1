# Script para configurar firewall do Windows para VAI DE PIX
# Execute como Administrador: PowerShell -ExecutionPolicy Bypass -File configurar-firewall.ps1

Write-Host "Configurando Firewall para VAI DE PIX..." -ForegroundColor Cyan

# Verificar se está rodando como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERRO: Este script precisa ser executado como Administrador!" -ForegroundColor Red
    Write-Host "Clique com botao direito no PowerShell e selecione 'Executar como administrador'" -ForegroundColor Yellow
    exit 1
}

# Remover regra antiga se existir
netsh advfirewall firewall delete rule name="VAI DE PIX - Porta 8000" 2>&1 | Out-Null

# Adicionar nova regra
netsh advfirewall firewall add rule name="VAI DE PIX - Porta 8000" dir=in action=allow protocol=TCP localport=8000

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Firewall configurado com sucesso!" -ForegroundColor Green
    Write-Host "Porta 8000 agora esta acessivel pela rede local" -ForegroundColor Green
} else {
    Write-Host "✗ Erro ao configurar firewall" -ForegroundColor Red
}

