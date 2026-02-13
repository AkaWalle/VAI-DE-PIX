# Script para limpar documentação obsoleta (PowerShell)
# Execute: .\scripts\limpar-documentacao.ps1

Write-Host "🧹 Limpando documentação obsoleta..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

# Criar backup
if (-not (Test-Path "docs\backup")) {
    Write-Host "📦 Criando backup..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path "docs\backup" | Out-Null
    Copy-Item -Path "docs\*.md" -Destination "docs\backup\" -ErrorAction SilentlyContinue
    Write-Host "   ✅ Backup criado em docs\backup\" -ForegroundColor Green
}

Set-Location docs

Write-Host "🗑️  Excluindo arquivos obsoletos..." -ForegroundColor Yellow
Write-Host ""

# Deploy Vercel obsoletos
Write-Host "   - Deploy Vercel obsoletos..." -ForegroundColor Gray
$vercelFiles = @(
    "ACAO_IMEDIATA_DEPLOY.md", "ACAO_IMEDIATA_VERCEL.md", "ADICIONAR_DATABASE_URL.md",
    "ANTES_DEPOIS.md", "COMO_CORRIGIR_VERCEL_DASHBOARD.md", "CONECTAR_RAILWAY_VERCEL.md",
    "CONFIGURAR_RAILWAY_FRONTEND.md", "CORRIGIR_DATABASE_URL_RAILWAY.md",
    "DATABASE_URL_RAILWAY.md", "DEPLOY_CONCLUIDO.md", "DEPLOY_FINAL_CONCLUIDO.md",
    "DEPLOY_MANUAL_SUCESSO.md", "DEPLOY_REALIZADO.md", "DEPLOY_VERCEL_AGORA_FINAL.md",
    "DEPLOY_VERCEL_AGORA.md", "DEPLOY_VERCEL_FIX_NUCLEAR.md", "DEPLOY_VERCEL_FIX.md",
    "DEPLOY_VERCEL_RAILWAY_2025.md", "ENTENDENDO_URLS_RAILWAY.md",
    "ESTRUTURA_FINAL_VERIFICADA.md", "ESTRUTURA_RAIZ_CONFIRMADA.md", "EXECUTAR_AGORA.md",
    "FIX_BRANCH_MAIN.md", "FIX_INDEX_HTML.md", "FIX_VERCEL_BRANCH.md",
    "FIX_VERCEL_DEPLOY_ERROR.md", "INSTRUCOES_DEPLOY_LIMPO.md",
    "INSTRUCOES_FINAIS_DEPLOY.md", "INSTRUCOES_VERCEL_DASHBOARD.md",
    "INSTRUCOES_VERCEL_DO_ZERO.md", "MIGRATIONS_EXECUTADAS.md",
    "ONDE_ESTA_DATABASE_URL.md", "OPERACAO_NUCLEAR_CONCLUIDA.md",
    "QUAIS-ENVS-VERCEL.md", "RAILWAY_FIX_COMPLETO.md", "RESUMO_DEPLOY_FINAL.md",
    "RESUMO_DEPLOY_VERCEL.md", "RESUMO-EXECUTIVO.md", "SOLUCAO_DEFINITIVA_VERCEL.md",
    "SOLUCAO-ERRO-500-VERCEL.md", "TESTE_AGORA.md", "UPLOAD-GITHUB.md",
    "VARIAVEIS-VERCEL-LISTA.md", "VERCEL_BRANCH_CONFIG.md", "VERCEL_DEPLOY_COMPLETO.md",
    "VERCEL_DEPLOY_FIX.md", "VERCEL_FIX_DEPLOY.md", "VERCEL_ROOT_DIRECTORY_FIX.md",
    "VERIFICACAO_DEPLOY.md", "VERIFICACAO-VARIAVEIS-VERCEL.md"
)

foreach ($file in $vercelFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
    }
}

# RPi temporários
Write-Host "   - RPi temporários..." -ForegroundColor Gray
$rpiFiles = @(
    "APLICAR-CORRECOES-RPI.md", "APLICAR-MIGRACAO-UPDATED_AT-RPI.md",
    "ATUALIZAR-SCRIPT-START-RPI.md", "CORRIGIR-ENV-RPI.md",
    "CORRIGIR-FRONTEND-API-RPI.md", "CORRIGIR-IMPORTS-PRODUCTION-SERVER.md",
    "CORRIGIR-MULTIPLAS-HEADS-RPI.md", "CORRIGIR-PERMISSOES-POSTGRES-RPI.md",
    "CORRIGIR-ROTAS-API-RPI.md", "CORRIGIR-UPDATED_AT-CATEGORIES-RPI.md",
    "INSTALAR-GUNICORN-RPI.md", "INSTALAR-PSYCOPG2-RPI.md",
    "INSTALAR-PYTHON3.11-RPI.md", "REBUILD-FRONTEND-CRITICO.md",
    "REBUILD-FRONTEND-RPI.md", "REBUILD-FRONTEND-URGENTE-RPI.md",
    "REINICIAR-SERVIDOR-RPI.md", "RESOLVER-CONFLITOS-GIT-RPI.md",
    "RODAR-RPI5-SUCESSO.md", "TESTAR-API-RPI.md", "TESTAR-TODAS-ROTAS-RPI.md",
    "VERIFICAR-API-FUNCIONANDO-RPI.md", "VERIFICAR-PG-HBA-RPI.md",
    "VERIFICAR-POSTGRESQL-RPI.md", "VERIFICAR-ROTAS-REGISTRADAS-RPI.md"
)

foreach ($file in $rpiFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
    }
}

# Limpar pasta deploy
Write-Host "   - Pasta deploy..." -ForegroundColor Gray
Set-Location deploy
$deployFiles = @(
    "VERIFICACAO_DEPLOY.md", "VERCEL_FIX_DEPLOY.md", "VERCEL_DEPLOY_COMPLETO.md",
    "RESUMO_DEPLOY_VERCEL.md", "RAILWAY_FIX_COMPLETO.md", "ONDE_ESTA_DATABASE_URL.md",
    "ENTENDENDO_URLS_RAILWAY.md", "DEPLOY_VERCEL_AGORA.md", "DEPLOY_VERCEL_FIX.md",
    "DEPLOY_FINAL_CONCLUIDO.md", "DEPLOY_CONCLUIDO.md", "DATABASE_URL_RAILWAY.md",
    "CONFIGURAR_RAILWAY_FRONTEND.md", "CORRIGIR_DATABASE_URL_RAILWAY.md",
    "CONECTAR_RAILWAY_VERCEL.md", "ADICIONAR_DATABASE_URL.md",
    "VERIFICACAO-PROJETO-VERCEL.md", "SOLUCAO-404-API-VERCEL.md",
    "RESOLVER-PROJETOS-DUPLICADOS-VERCEL.md", "CORRIGIR-PROJETOS-DUPLICADOS.md",
    "ENTENDER-LOGS-VERCEL.md"
)

foreach ($file in $deployFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
    }
}
Set-Location ..

# Limpar outros
Write-Host "   - Outros arquivos..." -ForegroundColor Gray
$otherFiles = @("CHANGELOG.md", "VERIFICAR-BANCO-DADOS.md", "deploy.md")
foreach ($file in $otherFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
    }
}

Write-Host ""
Write-Host "✅ Limpeza concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Arquivos mantidos (importantes):" -ForegroundColor Cyan
Write-Host "   - README.md"
Write-Host "   - RASPBERRY-PI-5-SETUP.md"
Write-Host "   - docs/DEPLOY-RPI5.md"
Write-Host "   - docs/COMANDOS-RPI5.md"
Write-Host "   - docs/CONECTAR-DBEAVER-RPI.md"
Write-Host "   - docs/HABILITAR-CONEXAO-REMOTA-POSTGRES-RPI.md"
Write-Host "   - docs/deploy/DEPLOY-VERCEL.md"
Write-Host "   - docs/deploy/RAILWAY_DEPLOY_GUIDE.md"
Write-Host "   - E outros essenciais..."
Write-Host ""
Write-Host "💾 Backup disponível em: docs\backup\" -ForegroundColor Yellow
