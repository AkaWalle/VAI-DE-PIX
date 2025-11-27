# 🧹 Script de Limpeza Agressiva Completa do Projeto VAI DE PIX (PowerShell)
# Este script remove TODOS os arquivos obsoletos identificados na análise
# 
# ATENÇÃO: Execute apenas após revisar o plano de limpeza
# 
# Uso: .\limpar-projeto-completo.ps1

$ErrorActionPreference = "Stop"

Write-Host "🧹 Iniciando limpeza completa do projeto VAI DE PIX..." -ForegroundColor Cyan
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
Write-Host "📋 Removendo componentes não utilizados..." -ForegroundColor Cyan
Delete-File "src/components/theme-providerr.tsx" "Typo duplicado (existe theme-provider.tsx correto)"
Delete-File "src/components/ApiModeToggle.tsx" "Componente não utilizado"
Delete-File "src/components/ui/input-opt.tsx" "Componente InputOTP não utilizado"
Delete-File "src/components/ui/slide.tsx" "Componente Slider não utilizado"

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
Write-Host "📋 Removendo relatórios de limpeza anteriores..." -ForegroundColor Cyan
Delete-File "RELATORIO_LIMPEZA.md" "Relatório de limpeza anterior"
Delete-File "RESUMO_LIMPEZA.md" "Resumo de limpeza anterior"

Write-Host ""
Write-Host "📋 Removendo documentação obsoleta de deploy Vercel..." -ForegroundColor Cyan
# Deploy Vercel obsoleta
Delete-File "docs/ACAO_IMEDIATA_DEPLOY.md" "Documentação obsoleta"
Delete-File "docs/ACAO_IMEDIATA_VERCEL.md" "Documentação obsoleta"
Delete-File "docs/ADICIONAR_DATABASE_URL.md" "Documentação obsoleta"
Delete-File "docs/ANTES_DEPOIS.md" "Documentação obsoleta"
Delete-File "docs/COMO_CORRIGIR_VERCEL_DASHBOARD.md" "Documentação obsoleta"
Delete-File "docs/CONECTAR_RAILWAY_VERCEL.md" "Documentação obsoleta"
Delete-File "docs/CONFIGURAR_RAILWAY_FRONTEND.md" "Documentação obsoleta"
Delete-File "docs/CORRIGIR_DATABASE_URL_RAILWAY.md" "Documentação obsoleta"
Delete-File "docs/DATABASE_URL_RAILWAY.md" "Documentação obsoleta"
Delete-File "docs/DEPLOY_CONCLUIDO.md" "Documentação obsoleta"
Delete-File "docs/DEPLOY_FINAL_CONCLUIDO.md" "Documentação obsoleta"
Delete-File "docs/DEPLOY_MANUAL_SUCESSO.md" "Documentação obsoleta"
Delete-File "docs/DEPLOY_REALIZADO.md" "Documentação obsoleta"
Delete-File "docs/DEPLOY_VERCEL_AGORA_FINAL.md" "Documentação obsoleta"
Delete-File "docs/DEPLOY_VERCEL_AGORA.md" "Documentação obsoleta"
Delete-File "docs/DEPLOY_VERCEL_FIX_NUCLEAR.md" "Documentação obsoleta"
Delete-File "docs/DEPLOY_VERCEL_FIX.md" "Documentação obsoleta"
Delete-File "docs/DEPLOY_VERCEL_RAILWAY_2025.md" "Documentação obsoleta"
Delete-File "docs/ENTENDENDO_URLS_RAILWAY.md" "Documentação obsoleta"
Delete-File "docs/ESTRUTURA_FINAL_VERIFICADA.md" "Documentação obsoleta"
Delete-File "docs/ESTRUTURA_RAIZ_CONFIRMADA.md" "Documentação obsoleta"
Delete-File "docs/EXECUTAR_AGORA.md" "Documentação obsoleta"
Delete-File "docs/FIX_BRANCH_MAIN.md" "Documentação obsoleta"
Delete-File "docs/FIX_INDEX_HTML.md" "Documentação obsoleta"
Delete-File "docs/FIX_VERCEL_BRANCH.md" "Documentação obsoleta"
Delete-File "docs/FIX_VERCEL_DEPLOY_ERROR.md" "Documentação obsoleta"
Delete-File "docs/INSTRUCOES_DEPLOY_LIMPO.md" "Documentação obsoleta"
Delete-File "docs/INSTRUCOES_FINAIS_DEPLOY.md" "Documentação obsoleta"
Delete-File "docs/INSTRUCOES_VERCEL_DASHBOARD.md" "Documentação obsoleta"
Delete-File "docs/INSTRUCOES_VERCEL_DO_ZERO.md" "Documentação obsoleta"
Delete-File "docs/MIGRATIONS_EXECUTADAS.md" "Documentação obsoleta"
Delete-File "docs/ONDE_ESTA_DATABASE_URL.md" "Documentação obsoleta"
Delete-File "docs/OPERACAO_NUCLEAR_CONCLUIDA.md" "Documentação obsoleta"
Delete-File "docs/QUAIS-ENVS-VERCEL.md" "Documentação obsoleta"
Delete-File "docs/RAILWAY_FIX_COMPLETO.md" "Documentação obsoleta"
Delete-File "docs/RESUMO_DEPLOY_FINAL.md" "Documentação obsoleta"
Delete-File "docs/RESUMO_DEPLOY_VERCEL.md" "Documentação obsoleta"
Delete-File "docs/RESUMO-EXECUTIVO.md" "Documentação obsoleta"
Delete-File "docs/SOLUCAO_DEFINITIVA_VERCEL.md" "Documentação obsoleta"
Delete-File "docs/SOLUCAO-ERRO-500-VERCEL.md" "Documentação obsoleta"
Delete-File "docs/TESTE_AGORA.md" "Documentação obsoleta"
Delete-File "docs/UPLOAD-GITHUB.md" "Documentação obsoleta"
Delete-File "docs/VARIAVEIS-VERCEL-LISTA.md" "Documentação obsoleta"
Delete-File "docs/VERCEL_BRANCH_CONFIG.md" "Documentação obsoleta"
Delete-File "docs/VERCEL_DEPLOY_COMPLETO.md" "Documentação obsoleta"
Delete-File "docs/VERCEL_DEPLOY_FIX.md" "Documentação obsoleta"
Delete-File "docs/VERCEL_FIX_DEPLOY.md" "Documentação obsoleta"
Delete-File "docs/VERCEL_ROOT_DIRECTORY_FIX.md" "Documentação obsoleta"
Delete-File "docs/VERIFICACAO_DEPLOY.md" "Documentação obsoleta"
Delete-File "docs/VERIFICACAO-VARIAVEIS-VERCEL.md" "Documentação obsoleta"
Delete-File "docs/deploy.md" "Documentação obsoleta"

# Arquivos duplicados em docs/deploy/
Delete-File "docs/deploy/ADICIONAR_DATABASE_URL.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/CONECTAR_RAILWAY_VERCEL.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/CONFIGURAR_RAILWAY_FRONTEND.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/CORRIGIR_DATABASE_URL_RAILWAY.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/CORRIGIR-PROJETOS-DUPLICADOS.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/DATABASE_URL_RAILWAY.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/DEPLOY_CONCLUIDO.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/DEPLOY_FINAL_CONCLUIDO.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/DEPLOY_VERCEL_AGORA.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/DEPLOY_VERCEL_FIX.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/ENTENDENDO_URLS_RAILWAY.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/ENTENDER-LOGS-VERCEL.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/ONDE_ESTA_DATABASE_URL.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/RAILWAY_FIX_COMPLETO.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/RESOLVER-PROJETOS-DUPLICADOS-VERCEL.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/RESUMO_DEPLOY_VERCEL.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/SOLUCAO-404-API-VERCEL.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/VERCEL_DEPLOY_COMPLETO.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/VERCEL_FIX_DEPLOY.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/VERIFICACAO_DEPLOY.md" "Documentação obsoleta duplicada"
Delete-File "docs/deploy/VERIFICACAO-PROJETO-VERCEL.md" "Documentação obsoleta duplicada"

Write-Host ""
Write-Host "📋 Removendo documentação temporária do Raspberry Pi..." -ForegroundColor Cyan
# RPi temporários
Delete-File "docs/APLICAR-CORRECOES-RPI.md" "Documentação temporária RPi"
Delete-File "docs/APLICAR-MIGRACAO-UPDATED_AT-RPI.md" "Documentação temporária RPi"
Delete-File "docs/ATUALIZAR-SCRIPT-START-RPI.md" "Documentação temporária RPi"
Delete-File "docs/CORRIGIR-ENV-RPI.md" "Documentação temporária RPi"
Delete-File "docs/CORRIGIR-FRONTEND-API-RPI.md" "Documentação temporária RPi"
Delete-File "docs/CORRIGIR-IMPORTS-PRODUCTION-SERVER.md" "Documentação temporária RPi"
Delete-File "docs/CORRIGIR-MULTIPLAS-HEADS-RPI.md" "Documentação temporária RPi"
Delete-File "docs/CORRIGIR-PERMISSOES-POSTGRES-RPI.md" "Documentação temporária RPi"
Delete-File "docs/CORRIGIR-ROTAS-API-RPI.md" "Documentação temporária RPi"
Delete-File "docs/CORRIGIR-UPDATED_AT-CATEGORIES-RPI.md" "Documentação temporária RPi"
Delete-File "docs/INSTALAR-GUNICORN-RPI.md" "Documentação temporária RPi"
Delete-File "docs/INSTALAR-PSYCOPG2-RPI.md" "Documentação temporária RPi"
Delete-File "docs/INSTALAR-PYTHON3.11-RPI.md" "Documentação temporária RPi"
Delete-File "docs/REBUILD-FRONTEND-CRITICO.md" "Documentação temporária RPi"
Delete-File "docs/REBUILD-FRONTEND-RPI.md" "Documentação temporária RPi"
Delete-File "docs/REBUILD-FRONTEND-URGENTE-RPI.md" "Documentação temporária RPi"
Delete-File "docs/REINICIAR-SERVIDOR-RPI.md" "Documentação temporária RPi"
Delete-File "docs/RESOLVER-CONFLITOS-GIT-RPI.md" "Documentação temporária RPi"
Delete-File "docs/RODAR-RPI5-SUCESSO.md" "Documentação temporária RPi"
Delete-File "docs/TESTAR-API-RPI.md" "Documentação temporária RPi"
Delete-File "docs/TESTAR-TODAS-ROTAS-RPI.md" "Documentação temporária RPi"
Delete-File "docs/VERIFICAR-API-FUNCIONANDO-RPI.md" "Documentação temporária RPi"
Delete-File "docs/VERIFICAR-PG-HBA-RPI.md" "Documentação temporária RPi"
Delete-File "docs/VERIFICAR-POSTGRESQL-RPI.md" "Documentação temporária RPi"
Delete-File "docs/VERIFICAR-ROTAS-REGISTRADAS-RPI.md" "Documentação temporária RPi"

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
Write-Host "   3. Commit: git commit -m 'chore: limpeza agressiva de arquivos obsoletos'"
Write-Host ""

