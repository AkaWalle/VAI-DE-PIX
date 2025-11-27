# Script PowerShell para fazer deploy do projeto para Raspberry Pi 5 via SSH
# Uso: .\scripts\deploy-to-rpi5.ps1 [IP_DO_RASPBERRY_PI]

param(
    [string]$RpiIp = "192.168.6.40",
    [string]$RpiUser = "pi",
    [string]$RpiDir = "~/vai-de-pix"
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🚀 Deploy VAI DE PIX para Raspberry Pi 5" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuração:" -ForegroundColor Yellow
Write-Host "  IP: $RpiIp"
Write-Host "  Usuário: $RpiUser"
Write-Host "  Diretório: $RpiDir"
Write-Host ""

# Verificar se OpenSSH está disponível
try {
    $null = Get-Command ssh -ErrorAction Stop
} catch {
    Write-Host "❌ SSH não encontrado. Instale OpenSSH primeiro." -ForegroundColor Red
    Write-Host "Execute: Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0" -ForegroundColor Yellow
    exit 1
}

# Verificar se scp está disponível
try {
    $null = Get-Command scp -ErrorAction Stop
} catch {
    Write-Host "❌ SCP não encontrado. Instale OpenSSH primeiro." -ForegroundColor Red
    exit 1
}

# Testar conexão SSH
Write-Host "🔌 Testando conexão SSH..." -ForegroundColor Yellow
try {
    $testResult = ssh -o ConnectTimeout=5 -o BatchMode=yes "$RpiUser@$RpiIp" exit 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Conexão SSH requer autenticação." -ForegroundColor Yellow
        Write-Host "Por favor, certifique-se de que:" -ForegroundColor Yellow
        Write-Host "  1. SSH está habilitado no Raspberry Pi"
        Write-Host "  2. Você tem acesso SSH configurado (chave ou senha)"
        Write-Host ""
        $continue = Read-Host "Continuar mesmo assim? (s/N)"
        if ($continue -ne "s" -and $continue -ne "S") {
            Write-Host "Deploy cancelado." -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "⚠️  Não foi possível testar conexão. Continuando..." -ForegroundColor Yellow
}

# Criar diretório no Raspberry Pi
Write-Host "📁 Criando diretório no Raspberry Pi..." -ForegroundColor Yellow
ssh "$RpiUser@$RpiIp" "mkdir -p $RpiDir"

# Fazer build do frontend localmente (se ainda não foi feito)
if (-not (Test-Path "dist")) {
    Write-Host "🏗️  Fazendo build do frontend..." -ForegroundColor Yellow
    npm run build
}

# Criar lista de exclusões
$excludeList = @(
    "node_modules",
    "backend/venv",
    ".git",
    "*.pyc",
    "__pycache__",
    ".vscode",
    ".idea"
)

Write-Host "📤 Enviando arquivos para Raspberry Pi..." -ForegroundColor Yellow
Write-Host "   (Isso pode levar alguns minutos...)" -ForegroundColor Gray

# Criar arquivo temporário com lista de exclusões
$excludeFile = [System.IO.Path]::GetTempFileName()
$excludeList | Out-File -FilePath $excludeFile -Encoding UTF8

try {
    # Usar scp para enviar arquivos
    # Nota: scp no Windows não suporta --exclude nativamente
    # Vamos enviar arquivos importantes manualmente
    
    Write-Host "📤 Enviando estrutura de diretórios..." -ForegroundColor Yellow
    
    # Enviar arquivos principais
    $filesToSend = @(
        "package.json",
        "package-lock.json",
        "vite.config.ts",
        "tsconfig.json",
        "tailwind.config.ts",
        "postcss.config.js",
        "index.html",
        "env.local.example",
        "RASPBERRY-PI-5-SETUP.md"
    )
    
    foreach ($file in $filesToSend) {
        if (Test-Path $file) {
            Write-Host "  Enviando $file..." -ForegroundColor Gray
            scp $file "$RpiUser@$RpiIp`:$RpiDir/"
        }
    }
    
    # Enviar diretórios importantes
    $dirsToSend = @(
        "src",
        "public",
        "backend",
        "scripts",
        "docs"
    )
    
    foreach ($dir in $dirsToSend) {
        if (Test-Path $dir) {
            Write-Host "  Enviando $dir/..." -ForegroundColor Gray
            scp -r $dir "$RpiUser@$RpiIp`:$RpiDir/"
        }
    }
    
    # Enviar dist se existir
    if (Test-Path "dist") {
        Write-Host "📤 Enviando frontend buildado..." -ForegroundColor Yellow
        scp -r dist "$RpiUser@$RpiIp`:$RpiDir/"
    }
    
} finally {
    Remove-Item $excludeFile -ErrorAction SilentlyContinue
}

# Executar comandos no Raspberry Pi
Write-Host "⚙️  Configurando no Raspberry Pi..." -ForegroundColor Yellow

$setupCommands = @"
cd $RpiDir
if [ -d ".git" ]; then
    git checkout raspberry-pi-5 2>/dev/null || echo "Branch já está correta"
fi
chmod +x scripts/setup-raspberry-pi.sh 2>/dev/null || true
echo "✅ Arquivos transferidos!"
"@

ssh "$RpiUser@$RpiIp" $setupCommands

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "✅ Deploy concluído!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Conecte-se ao Raspberry Pi:"
Write-Host "   ssh $RpiUser@$RpiIp" -ForegroundColor Green
Write-Host ""
Write-Host "2. Navegue até o diretório:"
Write-Host "   cd $RpiDir" -ForegroundColor Green
Write-Host ""
Write-Host "3. Execute o setup:"
Write-Host "   ./scripts/setup-raspberry-pi.sh" -ForegroundColor Green
Write-Host ""

