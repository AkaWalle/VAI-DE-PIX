#!/bin/bash

# Script para corrigir imports no production_server.py
# Execute: bash scripts/corrigir-imports-rpi.sh

cd ~/vai-de-pix

echo "🔧 Corrigindo imports no production_server.py..."

# Parar servidor
pkill -f gunicorn || true

# Verificar se há imports errados
if grep -q "from backend\." backend/production_server.py; then
    echo "   ⚠️  Encontrados imports incorretos, corrigindo..."
    
    # Corrigir imports
    sed -i 's/from backend\.routers/from routers/g' backend/production_server.py
    sed -i 's/from backend\.database/from database/g' backend/production_server.py
    sed -i 's/from backend\.auth_utils/from auth_utils/g' backend/production_server.py
    
    echo "   ✅ Imports corrigidos"
else
    echo "   ✅ Imports já estão corretos"
    
    # Se ainda assim não funcionar, restaurar do git
    if [ -f ".git/HEAD" ]; then
        echo "   🔄 Restaurando arquivo do Git..."
        git checkout backend/production_server.py
        echo "   ✅ Arquivo restaurado"
    fi
fi

# Verificar imports corretos
echo ""
echo "📋 Imports atuais:"
grep "^from.*routers\|^from.*database\|^from.*auth_utils" backend/production_server.py | head -3

echo ""
echo "✅ Correção aplicada!"
echo "🚀 Execute: ./start-vai-de-pix.sh"

