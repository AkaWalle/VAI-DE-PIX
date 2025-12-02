#!/bin/bash

# Script para iniciar o servidor VAI DE PIX no Raspberry Pi
# Tenta usar systemd, se não estiver configurado, inicia manualmente
# Uso: ./scripts/iniciar-servidor-rpi.sh

set -e

echo "🚀 Iniciando servidor VAI DE PIX..."
echo "=================================================="

# Verificar se estamos na raiz do projeto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script a partir da raiz do projeto"
    exit 1
fi

# Verificar se serviço systemd existe
if systemctl list-unit-files | grep -q "vai-de-pix.service"; then
    echo "📦 Usando serviço systemd..."
    
    # Verificar se está rodando
    if systemctl is-active --quiet vai-de-pix.service; then
        echo "✅ Servidor já está rodando"
        echo ""
        echo "Status:"
        sudo systemctl status vai-de-pix.service --no-pager -l | head -10
    else
        echo "▶️  Iniciando serviço..."
        sudo systemctl start vai-de-pix.service
        sleep 2
        
        if systemctl is-active --quiet vai-de-pix.service; then
            echo "✅ Servidor iniciado com sucesso!"
            echo ""
            echo "Status:"
            sudo systemctl status vai-de-pix.service --no-pager -l | head -10
        else
            echo "❌ Erro ao iniciar serviço"
            echo ""
            echo "Logs:"
            sudo journalctl -u vai-de-pix.service -n 20 --no-pager
            exit 1
        fi
    fi
else
    echo "⚠️  Serviço systemd não encontrado"
    echo "   Iniciando servidor manualmente..."
    echo ""
    echo "💡 Para configurar serviço systemd, execute:"
    echo "   ./scripts/configurar-servico-systemd.sh"
    echo ""
    
    # Verificar se já está rodando
    if lsof -ti:8000 >/dev/null 2>&1; then
        echo "✅ Servidor já está rodando na porta 8000"
        exit 0
    fi
    
    # Iniciar manualmente
    cd backend
    
    if [ ! -d "venv" ]; then
        echo "❌ Erro: Ambiente virtual não encontrado"
        echo "   Execute: python3 -m venv venv"
        exit 1
    fi
    
    source venv/bin/activate
    
    echo "▶️  Iniciando servidor em background..."
    nohup python production_server.py > /tmp/vai-de-pix.log 2>&1 &
    SERVER_PID=$!
    
    sleep 3
    
    # Verificar se iniciou
    if kill -0 $SERVER_PID 2>/dev/null; then
        echo "✅ Servidor iniciado (PID: $SERVER_PID)"
        echo "📝 Logs em: /tmp/vai-de-pix.log"
        echo ""
        echo "Para parar o servidor:"
        echo "  kill $SERVER_PID"
        echo "  ou"
        echo "  ./scripts/parar-servidor-rpi.sh"
    else
        echo "❌ Erro ao iniciar servidor"
        echo ""
        echo "Últimas linhas do log:"
        tail -20 /tmp/vai-de-pix.log 2>/dev/null || echo "Log não disponível"
        exit 1
    fi
    
    deactivate
    cd ..
fi

echo ""
echo "=================================================="
echo "✅ Servidor iniciado!"
echo "=================================================="
echo ""
echo "🌐 Acesse a aplicação em:"
echo "   http://localhost:8000"
echo "   ou"
echo "   http://$(hostname -I | awk '{print $1}'):8000"
echo ""
echo "🔍 Verificar saúde:"
echo "   curl http://localhost:8000/api/health"
echo ""

