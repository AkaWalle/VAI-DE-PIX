#!/bin/bash

# Script para iniciar VAI DE PIX no Raspberry Pi 5
# Permite acesso pela rede local

cd "$(dirname "$0")"

echo "🚀 Iniciando VAI DE PIX no Raspberry Pi 5..."
echo "================================================"

# Verificar se estamos no diretório correto
if [ ! -d "backend" ]; then
    echo "❌ Erro: Execute este script a partir da raiz do projeto"
    exit 1
fi

# Obter IP da rede local
get_local_ip() {
    # Tentar obter IP via hostname -I (Raspberry Pi)
    local ip=$(hostname -I | awk '{print $1}' 2>/dev/null)
    
    # Se não funcionar, tentar via ip route
    if [ -z "$ip" ]; then
        ip=$(ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K\S+' | head -1)
    fi
    
    # Fallback: usar ip addr
    if [ -z "$ip" ]; then
        ip=$(ip addr show | grep -oP 'inet \K[\d.]+' | grep -v '127.0.0.1' | head -1)
    fi
    
    echo "$ip"
}

LOCAL_IP=$(get_local_ip)
PORT=8000

# Verificar se o frontend foi buildado
if [ ! -d "dist" ]; then
    echo "⚠️  Frontend não buildado. Fazendo build..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Erro ao fazer build do frontend"
        exit 1
    fi
fi

# Iniciar backend com Gunicorn (otimizado para RPi 5)
cd backend
source venv/bin/activate

# Usar configuração otimizada para RPi 5 se existir
if [ -f "gunicorn_config.rpi5.py" ]; then
    echo "📦 Usando configuração otimizada para Raspberry Pi 5"
    export GUNICORN_WORKERS=2
    python -m gunicorn production_server:app \
        -c gunicorn_config.rpi5.py \
        --bind 0.0.0.0:$PORT \
        --workers 2 \
        --worker-class uvicorn.workers.UvicornWorker &
else
    echo "📦 Usando configuração padrão"
    export GUNICORN_WORKERS=2
    python -m gunicorn production_server:app \
        -c gunicorn_config.py \
        --bind 0.0.0.0:$PORT \
        --workers 2 \
        --worker-class uvicorn.workers.UvicornWorker &
fi

BACKEND_PID=$!
cd ..

# Aguardar servidor iniciar
sleep 3

# Verificar se está rodando
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Erro: Backend não iniciou corretamente"
    exit 1
fi

echo ""
echo "================================================"
echo "✅ VAI DE PIX está rodando!"
echo "================================================"
echo ""
if [ -n "$LOCAL_IP" ]; then
    echo "🌐 ACESSO PELA REDE (use este IP em outros dispositivos):"
    echo "   http://$LOCAL_IP:$PORT"
    echo ""
    echo "📚 API Docs: http://$LOCAL_IP:$PORT/docs"
    echo "🏥 Health: http://$LOCAL_IP:$PORT/api/health"
else
    echo "🌐 ACESSO LOCAL:"
    echo "   http://localhost:$PORT"
    echo ""
    echo "📚 API Docs: http://localhost:$PORT/docs"
    echo "🏥 Health: http://localhost:$PORT/api/health"
fi
echo ""
echo "💻 ACESSO LOCAL (no próprio Raspberry Pi):"
echo "   http://localhost:$PORT"
echo ""
echo "🔑 Login padrão:"
echo "   Email: admin@vaidepix.com"
echo "   Senha: 123456"
echo ""
echo "📝 Para parar o servidor:"
echo "   kill $BACKEND_PID"
echo ""
echo "================================================"

# Manter script rodando
wait $BACKEND_PID

