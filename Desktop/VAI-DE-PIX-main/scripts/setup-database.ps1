# Script PowerShell para configurar o banco de dados no Vercel
# Execute este script após criar o banco de dados PostgreSQL

Write-Host "🔧 Configurando banco de dados..." -ForegroundColor Cyan

# Verificar se DATABASE_URL está configurada
if (-not $env:DATABASE_URL) {
    Write-Host "❌ Erro: DATABASE_URL não está configurada" -ForegroundColor Red
    Write-Host "Configure a variável de ambiente DATABASE_URL com a connection string do PostgreSQL" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ DATABASE_URL configurada" -ForegroundColor Green

# Executar migrações
Write-Host "📦 Executando migrações do banco de dados..." -ForegroundColor Cyan
Set-Location backend
alembic upgrade head

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migrações executadas com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao executar migrações" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Banco de dados configurado com sucesso!" -ForegroundColor Green

