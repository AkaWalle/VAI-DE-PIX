#!/bin/bash

# 🧹 Script de Limpeza Agressiva do Projeto VAI DE PIX
# Este script remove arquivos obsoletos, duplicados e não utilizados
# 
# ATENÇÃO: Execute apenas após revisar o RELATORIO_LIMPEZA.md
# 
# Uso: bash limpar-projeto.sh

set -e  # Parar em caso de erro

echo "🧹 Iniciando limpeza do projeto VAI DE PIX..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
DELETED=0
SKIPPED=0

# Função para deletar arquivo
delete_file() {
    local file=$1
    local reason=$2
    
    if [ -f "$file" ] || [ -d "$file" ]; then
        if git rm -r "$file" 2>/dev/null; then
            echo -e "${GREEN}✅ Removido:${NC} $file (${reason})"
            ((DELETED++))
        else
            echo -e "${YELLOW}⚠️  Não versionado (pulando):${NC} $file"
            rm -rf "$file" 2>/dev/null && echo -e "${GREEN}✅ Removido (não versionado):${NC} $file" || true
            ((SKIPPED++))
        fi
    else
        echo -e "${YELLOW}⚠️  Não encontrado:${NC} $file"
        ((SKIPPED++))
    fi
}

echo "📋 Removendo arquivos de backup e temporários..."
delete_file "src/middleware.ts.bak" "Backup de middleware Next.js (projeto usa Vite)"
delete_file "api/index.py.minimal" "Versão minimal para testes de debug"
delete_file "docs/old/" "Pasta com arquivos obsoletos"

echo ""
echo "📋 Removendo componentes com typos/duplicados..."
delete_file "src/components/theme-providerr.tsx" "Typo duplicado (existe theme-provider.tsx correto)"
delete_file "src/components/ApiModeToggle.tsx" "Componente não utilizado"

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
echo "📊 Estatísticas:"
echo -e "${GREEN}✅ Arquivos removidos: ${DELETED}${NC}"
echo -e "${YELLOW}⚠️  Arquivos pulados/não encontrados: ${SKIPPED}${NC}"
echo ""
echo "✅ Limpeza concluída!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Revisar mudanças: git status"
echo "   2. Verificar se tudo está correto"
echo "   3. Commit: git commit -m 'chore: limpeza de arquivos obsoletos'"
echo ""

