# Script de Deploy Vercel - PowerShell
# Uso: .\deploy-vercel.ps1

Write-Host "🚀 DEPLOY VERCEL - SCRIPT AUTOMÁTICO" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# 1. Verificar se está na raiz
if (-not (Test-Path "package.json")) {
    Write-Host "❌ ERRO: package.json não encontrado na raiz!" -ForegroundColor Red
    Write-Host "   Execute este script na raiz do projeto." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ package.json encontrado na raiz" -ForegroundColor Green

# 2. Verificar vercel.json
if (-not (Test-Path "vercel.json")) {
    Write-Host "❌ ERRO: vercel.json não encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ vercel.json encontrado" -ForegroundColor Green

# 3. Verificar branch
$branch = git branch --show-current
Write-Host "📦 Branch atual: $branch" -ForegroundColor Cyan

# 4. Verificar se está commitado
$packageInGit = git ls-files | Select-String "^package.json$"
if (-not $packageInGit) {
    Write-Host "⚠️  package.json não está commitado. Adicionando..." -ForegroundColor Yellow
    git add package.json
    git commit -m "fix: garantir package.json na raiz"
}

Write-Host "✅ package.json está commitado" -ForegroundColor Green

# 5. Verificar Vercel CLI
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Host "📦 Instalando Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

Write-Host "✅ Vercel CLI instalado" -ForegroundColor Green

# 6. Login (se necessário)
Write-Host "🔐 Verificando login no Vercel..." -ForegroundColor Cyan
try {
    vercel whoami | Out-Null
} catch {
    Write-Host "   Fazendo login..." -ForegroundColor Yellow
    vercel login
}

# 7. Deploy
Write-Host "🚀 Iniciando deploy..." -ForegroundColor Cyan
vercel --prod --yes

Write-Host ""
Write-Host "✅ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan

