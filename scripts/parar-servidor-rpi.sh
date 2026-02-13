#!/bin/bash

# Script para parar o servidor do VAI DE PIX no Raspberry Pi
# Uso: ./scripts/parar-servidor-rpi.sh

echo "🛑 Parando servidor VAI DE PIX..."
echo "================================================"

# Encontrar processos usando a porta 8000
PIDS=$(sudo lsof -ti:8000 2>/dev/null || fuser 8000/tcp 2>/dev/null || netstat -tlnp 2>/dev/null | grep :8000 | awk '{print $7}' | cut -d'/' -f1 | grep -v "^$" | sort -u)

if [ -z "$PIDS" ]; then
    # Tentar encontrar processos Python rodando production_server.py
    PIDS=$(ps aux | grep "[p]roduction_server.py" | awk '{print $2}')
fi

if [ -z "$PIDS" ]; then
    echo "ℹ️  Nenhum processo encontrado na porta 8000"
    echo "   O servidor pode não estar rodando"
    exit 0
fi

echo "📋 Processos encontrados:"
for PID in $PIDS; do
    if [ -n "$PID" ]; then
        ps -p $PID -o pid,cmd --no-headers 2>/dev/null || echo "   PID: $PID (processo não encontrado)"
    fi
done

echo ""
read -p "Deseja parar estes processos? (S/n): " confirm
if [[ $confirm =~ ^[Nn]$ ]]; then
    echo "❌ Operação cancelada"
    exit 0
fi

# Parar processos
for PID in $PIDS; do
    if [ -n "$PID" ] && kill -0 $PID 2>/dev/null; then
        echo "🛑 Parando processo $PID..."
        kill $PID
        sleep 1
        
        # Se ainda estiver rodando, forçar
        if kill -0 $PID 2>/dev/null; then
            echo "⚠️  Processo não parou, forçando..."
            kill -9 $PID 2>/dev/null
        fi
    fi
done

# Verificar se parou
sleep 2
REMAINING=$(sudo lsof -ti:8000 2>/dev/null || echo "")
if [ -z "$REMAINING" ]; then
    echo "✅ Servidor parado com sucesso!"
else
    echo "⚠️  Ainda há processos na porta 8000: $REMAINING"
    echo "   Execute manualmente: sudo kill -9 $REMAINING"
fi

