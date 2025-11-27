# 🧹 Script de Limpeza Agressiva do Projeto VAI DE PIX (PowerShell)
# Este script remove arquivos obsoletos, duplicados e não utilizados
# 
# ATENÇÃO: Execute apenas após revisar o RELATORIO_LIMPEZA.md
# 
# Uso: .\limpar-projeto.ps1

$ErrorActionPreference = "Stop"

Write-Host "🧹 Iniciando limpeza do projeto VAI DE PIX..." -ForegroundColor Cyan
Write-Host ""

# Contador
$script:DELETED = 0
$script:SKIPPED = 0

# Função para deletar arquivo
function Delete-File {
    param(
        [string]$file,
        [string]$reason
    )
    
    if (Test-Path $file) {
        try {
            # Tentar remover do git primeiro
            $gitResult = git rm -r $file 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Removido: $file ($reason)" -ForegroundColor Green
                $script:DELETED++
            } else {
                # Se não estiver no git, remover diretamente
                Remove-Item -Recurse -Force $file -ErrorAction SilentlyContinue
                Write-Host "✅ Removido (não versionado): $file" -ForegroundColor Green
                $script:DELETED++
            }
        } catch {
            Write-Host "⚠️  Erro ao remover: $file" -ForegroundColor Yellow
            $script:SKIPPED++
        }
    } else {
        Write-Host "⚠️  Não encontrado: $file" -ForegroundColor Yellow
        $script:SKIPPED++
    }
}

Write-Host "📋 Removendo arquivos de backup e temporários..." -ForegroundColor Cyan
Delete-File "src/middleware.ts.bak" "Backup de middleware Next.js (projeto usa Vite)"
Delete-File "api/index.py.minimal" "Versão minimal para testes de debug"
Delete-File "docs/old/" "Pasta com arquivos obsoletos"

Write-Host ""
Write-Host "📋 Removendo componentes com typos/duplicados..." -ForegroundColor Cyan
Delete-File "src/components/theme-providerr.tsx" "Typo duplicado (existe theme-provider.tsx correto)"
Delete-File "src/components/ApiModeToggle.tsx" "Componente não utilizado"

Write-Host ""
Write-Host "📋 Removendo arquivos duplicados..." -ForegroundColor Cyan
Delete-File "docs/RAILWAY_DEPLOY_GUIDE.md" "Duplicado de docs/deploy/RAILWAY_DEPLOY_GUIDE.md"
Delete-File "public/README.md" "README genérico desnecessário"
Delete-File "dist/README.md" "README na pasta dist (build)"

Write-Host ""
Write-Host "📋 Removendo scripts de teste obsoletos..." -ForegroundColor Cyan
Delete-File "scripts/test-deploy.sh" "Script de teste temporário"
Delete-File "scripts/test-deploy-final.sh" "Script de teste temporário"
Delete-File "scripts/test-deploy-final.ps1" "Script de teste temporário"
Delete-File "scripts/test-deploy-completo.sh" "Script de teste temporário"
Delete-File "scripts/test_vercel_local.sh" "Script de teste temporário"
Delete-File "docs/scripts/test_vercel_local.sh" "Duplicado do script acima"

Write-Host ""
Write-Host "📊 Estatísticas:" -ForegroundColor Cyan
Write-Host "✅ Arquivos removidos: $script:DELETED" -ForegroundColor Green
Write-Host "⚠️  Arquivos pulados/não encontrados: $script:SKIPPED" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Limpeza concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Revisar mudanças: git status"
Write-Host "   2. Verificar se tudo está correto"
Write-Host "   3. Commit: git commit -m 'chore: limpeza de arquivos obsoletos'"
Write-Host ""

