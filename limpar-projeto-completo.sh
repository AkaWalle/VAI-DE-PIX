#!/bin/bash
# 🧹 Script de Limpeza Agressiva Completa do Projeto VAI DE PIX
# Este script remove TODOS os arquivos obsoletos identificados na análise
# 
# ATENÇÃO: Execute apenas após revisar o plano de limpeza
# 
# Uso: chmod +x limpar-projeto-completo.sh && ./limpar-projeto-completo.sh

set -e

echo "🧹 Iniciando limpeza completa do projeto VAI DE PIX..."
echo ""

# Contador
DELETED=0
SKIPPED=0

# Função para deletar arquivo
delete_file() {
    local file=$1
    local reason=$2
    
    if [ -f "$file" ] || [ -d "$file" ]; then
        if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
            # Arquivo está no git
            git rm -r "$file" 2>/dev/null && {
                echo "✅ Removido: $file ($reason)"
                ((DELETED++))
            } || {
                echo "⚠️  Erro ao remover do git: $file"
                ((SKIPPED++))
            }
        else
            # Arquivo não está no git, remover diretamente
            rm -rf "$file" 2>/dev/null && {
                echo "✅ Removido (não versionado): $file"
                ((DELETED++))
            } || {
                echo "⚠️  Erro ao remover: $file"
                ((SKIPPED++))
            }
        fi
    else
        echo "⚠️  Não encontrado: $file"
        ((SKIPPED++))
    fi
}

echo "📋 Removendo arquivos de backup e temporários..."
delete_file "src/middleware.ts.bak" "Backup de middleware Next.js (projeto usa Vite)"
delete_file "api/index.py.minimal" "Versão minimal para testes de debug"
delete_file "docs/old/" "Pasta com arquivos obsoletos"

echo ""
echo "📋 Removendo componentes não utilizados..."
delete_file "src/components/theme-providerr.tsx" "Typo duplicado (existe theme-provider.tsx correto)"
delete_file "src/components/ApiModeToggle.tsx" "Componente não utilizado"
delete_file "src/components/ui/input-opt.tsx" "Componente InputOTP não utilizado"
delete_file "src/components/ui/slide.tsx" "Componente Slider não utilizado"

echo ""
echo "📋 Removendo arquivos duplicados..."
delete_file "docs/RAILWAY_DEPLOY_GUIDE.md" "Duplicado de docs/deploy/RAILWAY_DEPLOY_GUIDE.md"
delete_file "public/README.md" "README genérico desnecessário"
delete_file "dist/README.md" "README na pasta dist (build)"

echo ""
echo "📋 Removendo scripts de teste obsoletos..."
delete_file "scripts/test-deploy.sh" "Script de teste temporário"
delete_file "scripts/test-deploy-final.sh" "Script de teste temporário"
delete_file "scripts/test-deploy-final.ps1" "Script de teste temporário"
delete_file "scripts/test-deploy-completo.sh" "Script de teste temporário"
delete_file "scripts/test_vercel_local.sh" "Script de teste temporário"
delete_file "docs/scripts/test_vercel_local.sh" "Duplicado do script acima"

echo ""
echo "📋 Removendo relatórios de limpeza anteriores..."
delete_file "RELATORIO_LIMPEZA.md" "Relatório de limpeza anterior"
delete_file "RESUMO_LIMPEZA.md" "Resumo de limpeza anterior"

echo ""
echo "📋 Removendo documentação obsoleta de deploy Vercel..."
# Deploy Vercel obsoleta
delete_file "docs/ACAO_IMEDIATA_DEPLOY.md" "Documentação obsoleta"
delete_file "docs/ACAO_IMEDIATA_VERCEL.md" "Documentação obsoleta"
delete_file "docs/ADICIONAR_DATABASE_URL.md" "Documentação obsoleta"
delete_file "docs/ANTES_DEPOIS.md" "Documentação obsoleta"
delete_file "docs/COMO_CORRIGIR_VERCEL_DASHBOARD.md" "Documentação obsoleta"
delete_file "docs/CONECTAR_RAILWAY_VERCEL.md" "Documentação obsoleta"
delete_file "docs/CONFIGURAR_RAILWAY_FRONTEND.md" "Documentação obsoleta"
delete_file "docs/CORRIGIR_DATABASE_URL_RAILWAY.md" "Documentação obsoleta"
delete_file "docs/DATABASE_URL_RAILWAY.md" "Documentação obsoleta"
delete_file "docs/DEPLOY_CONCLUIDO.md" "Documentação obsoleta"
delete_file "docs/DEPLOY_FINAL_CONCLUIDO.md" "Documentação obsoleta"
delete_file "docs/DEPLOY_MANUAL_SUCESSO.md" "Documentação obsoleta"
delete_file "docs/DEPLOY_REALIZADO.md" "Documentação obsoleta"
delete_file "docs/DEPLOY_VERCEL_AGORA_FINAL.md" "Documentação obsoleta"
delete_file "docs/DEPLOY_VERCEL_AGORA.md" "Documentação obsoleta"
delete_file "docs/DEPLOY_VERCEL_FIX_NUCLEAR.md" "Documentação obsoleta"
delete_file "docs/DEPLOY_VERCEL_FIX.md" "Documentação obsoleta"
delete_file "docs/DEPLOY_VERCEL_RAILWAY_2025.md" "Documentação obsoleta"
delete_file "docs/ENTENDENDO_URLS_RAILWAY.md" "Documentação obsoleta"
delete_file "docs/ESTRUTURA_FINAL_VERIFICADA.md" "Documentação obsoleta"
delete_file "docs/ESTRUTURA_RAIZ_CONFIRMADA.md" "Documentação obsoleta"
delete_file "docs/EXECUTAR_AGORA.md" "Documentação obsoleta"
delete_file "docs/FIX_BRANCH_MAIN.md" "Documentação obsoleta"
delete_file "docs/FIX_INDEX_HTML.md" "Documentação obsoleta"
delete_file "docs/FIX_VERCEL_BRANCH.md" "Documentação obsoleta"
delete_file "docs/FIX_VERCEL_DEPLOY_ERROR.md" "Documentação obsoleta"
delete_file "docs/INSTRUCOES_DEPLOY_LIMPO.md" "Documentação obsoleta"
delete_file "docs/INSTRUCOES_FINAIS_DEPLOY.md" "Documentação obsoleta"
delete_file "docs/INSTRUCOES_VERCEL_DASHBOARD.md" "Documentação obsoleta"
delete_file "docs/INSTRUCOES_VERCEL_DO_ZERO.md" "Documentação obsoleta"
delete_file "docs/MIGRATIONS_EXECUTADAS.md" "Documentação obsoleta"
delete_file "docs/ONDE_ESTA_DATABASE_URL.md" "Documentação obsoleta"
delete_file "docs/OPERACAO_NUCLEAR_CONCLUIDA.md" "Documentação obsoleta"
delete_file "docs/QUAIS-ENVS-VERCEL.md" "Documentação obsoleta"
delete_file "docs/RAILWAY_FIX_COMPLETO.md" "Documentação obsoleta"
delete_file "docs/RESUMO_DEPLOY_FINAL.md" "Documentação obsoleta"
delete_file "docs/RESUMO_DEPLOY_VERCEL.md" "Documentação obsoleta"
delete_file "docs/RESUMO-EXECUTIVO.md" "Documentação obsoleta"
delete_file "docs/SOLUCAO_DEFINITIVA_VERCEL.md" "Documentação obsoleta"
delete_file "docs/SOLUCAO-ERRO-500-VERCEL.md" "Documentação obsoleta"
delete_file "docs/TESTE_AGORA.md" "Documentação obsoleta"
delete_file "docs/UPLOAD-GITHUB.md" "Documentação obsoleta"
delete_file "docs/VARIAVEIS-VERCEL-LISTA.md" "Documentação obsoleta"
delete_file "docs/VERCEL_BRANCH_CONFIG.md" "Documentação obsoleta"
delete_file "docs/VERCEL_DEPLOY_COMPLETO.md" "Documentação obsoleta"
delete_file "docs/VERCEL_DEPLOY_FIX.md" "Documentação obsoleta"
delete_file "docs/VERCEL_FIX_DEPLOY.md" "Documentação obsoleta"
delete_file "docs/VERCEL_ROOT_DIRECTORY_FIX.md" "Documentação obsoleta"
delete_file "docs/VERIFICACAO_DEPLOY.md" "Documentação obsoleta"
delete_file "docs/VERIFICACAO-VARIAVEIS-VERCEL.md" "Documentação obsoleta"
delete_file "docs/deploy.md" "Documentação obsoleta"

# Arquivos duplicados em docs/deploy/
delete_file "docs/deploy/ADICIONAR_DATABASE_URL.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/CONECTAR_RAILWAY_VERCEL.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/CONFIGURAR_RAILWAY_FRONTEND.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/CORRIGIR_DATABASE_URL_RAILWAY.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/CORRIGIR-PROJETOS-DUPLICADOS.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/DATABASE_URL_RAILWAY.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/DEPLOY_CONCLUIDO.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/DEPLOY_FINAL_CONCLUIDO.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/DEPLOY_VERCEL_AGORA.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/DEPLOY_VERCEL_FIX.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/ENTENDENDO_URLS_RAILWAY.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/ENTENDER-LOGS-VERCEL.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/ONDE_ESTA_DATABASE_URL.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/RAILWAY_FIX_COMPLETO.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/RESOLVER-PROJETOS-DUPLICADOS-VERCEL.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/RESUMO_DEPLOY_VERCEL.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/SOLUCAO-404-API-VERCEL.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/VERCEL_DEPLOY_COMPLETO.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/VERCEL_FIX_DEPLOY.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/VERIFICACAO_DEPLOY.md" "Documentação obsoleta duplicada"
delete_file "docs/deploy/VERIFICACAO-PROJETO-VERCEL.md" "Documentação obsoleta duplicada"

echo ""
echo "📋 Removendo documentação temporária do Raspberry Pi..."
# RPi temporários
delete_file "docs/APLICAR-CORRECOES-RPI.md" "Documentação temporária RPi"
delete_file "docs/APLICAR-MIGRACAO-UPDATED_AT-RPI.md" "Documentação temporária RPi"
delete_file "docs/ATUALIZAR-SCRIPT-START-RPI.md" "Documentação temporária RPi"
delete_file "docs/CORRIGIR-ENV-RPI.md" "Documentação temporária RPi"
delete_file "docs/CORRIGIR-FRONTEND-API-RPI.md" "Documentação temporária RPi"
delete_file "docs/CORRIGIR-IMPORTS-PRODUCTION-SERVER.md" "Documentação temporária RPi"
delete_file "docs/CORRIGIR-MULTIPLAS-HEADS-RPI.md" "Documentação temporária RPi"
delete_file "docs/CORRIGIR-PERMISSOES-POSTGRES-RPI.md" "Documentação temporária RPi"
delete_file "docs/CORRIGIR-ROTAS-API-RPI.md" "Documentação temporária RPi"
delete_file "docs/CORRIGIR-UPDATED_AT-CATEGORIES-RPI.md" "Documentação temporária RPi"
delete_file "docs/INSTALAR-GUNICORN-RPI.md" "Documentação temporária RPi"
delete_file "docs/INSTALAR-PSYCOPG2-RPI.md" "Documentação temporária RPi"
delete_file "docs/INSTALAR-PYTHON3.11-RPI.md" "Documentação temporária RPi"
delete_file "docs/REBUILD-FRONTEND-CRITICO.md" "Documentação temporária RPi"
delete_file "docs/REBUILD-FRONTEND-RPI.md" "Documentação temporária RPi"
delete_file "docs/REBUILD-FRONTEND-URGENTE-RPI.md" "Documentação temporária RPi"
delete_file "docs/REINICIAR-SERVIDOR-RPI.md" "Documentação temporária RPi"
delete_file "docs/RESOLVER-CONFLITOS-GIT-RPI.md" "Documentação temporária RPi"
delete_file "docs/RODAR-RPI5-SUCESSO.md" "Documentação temporária RPi"
delete_file "docs/TESTAR-API-RPI.md" "Documentação temporária RPi"
delete_file "docs/TESTAR-TODAS-ROTAS-RPI.md" "Documentação temporária RPi"
delete_file "docs/VERIFICAR-API-FUNCIONANDO-RPI.md" "Documentação temporária RPi"
delete_file "docs/VERIFICAR-PG-HBA-RPI.md" "Documentação temporária RPi"
delete_file "docs/VERIFICAR-POSTGRESQL-RPI.md" "Documentação temporária RPi"
delete_file "docs/VERIFICAR-ROTAS-REGISTRADAS-RPI.md" "Documentação temporária RPi"

echo ""
echo "📊 Estatísticas:"
echo "✅ Arquivos removidos: $DELETED"
echo "⚠️  Arquivos pulados/não encontrados: $SKIPPED"
echo ""
echo "✅ Limpeza concluída!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Revisar mudanças: git status"
echo "   2. Verificar se tudo está correto"
echo "   3. Commit: git commit -m 'chore: limpeza agressiva de arquivos obsoletos'"
echo ""

