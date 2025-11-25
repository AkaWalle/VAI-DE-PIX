#!/bin/bash

# Script de instalação automatizada para Raspberry Pi 5
# VAI DE PIX - Sistema de Controle Financeiro

set -e  # Parar em caso de erro

echo "🍓 Instalando VAI DE PIX no Raspberry Pi 5..."
echo "================================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Atualizar sistema
echo -e "${YELLOW}📦 Atualizando sistema...${NC}"
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
echo -e "${YELLOW}📦 Instalando dependências básicas...${NC}"
sudo apt install -y \
    build-essential \
    curl \
    wget \
    git \
    python3-dev \
    python3-pip \
    libpq-dev \
    gcc \
    postgresql-client

# Instalar Node.js
if ! command_exists node; then
    echo -e "${YELLOW}📦 Instalando Node.js...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo -e "${GREEN}✅ Node.js já instalado: $(node -v)${NC}"
fi

# Verificar versão do Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js versão 18+ é necessário. Versão atual: $(node -v)${NC}"
    exit 1
fi

# Verificar e instalar Python (3.9+ necessário)
echo -e "${YELLOW}🐍 Verificando Python...${NC}"

# Verificar versão do Python disponível
PYTHON_VERSION=$(python3 --version 2>/dev/null | cut -d' ' -f2 | cut -d'.' -f1,2)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)

if [ -z "$PYTHON_VERSION" ] || [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 9 ]); then
    echo -e "${YELLOW}📦 Instalando Python 3...${NC}"
    sudo apt install -y python3 python3-venv python3-dev python3-pip
    
    # Tentar instalar Python 3.11 se disponível (opcional)
    if apt-cache show python3.11 >/dev/null 2>&1; then
        echo -e "${YELLOW}📦 Python 3.11 disponível, instalando...${NC}"
        sudo apt install -y python3.11 python3.11-venv python3.11-dev || echo -e "${YELLOW}⚠️  Python 3.11 não disponível, usando versão padrão${NC}"
    else
        echo -e "${YELLOW}⚠️  Python 3.11 não disponível nos repositórios.${NC}"
        echo -e "${YELLOW}   Usando Python $(python3 --version | cut -d' ' -f2) (deve ser 3.9+)${NC}"
    fi
else
    echo -e "${GREEN}✅ Python $PYTHON_VERSION encontrado${NC}"
    
    # Tentar instalar Python 3.11 se disponível e não for 3.11+
    if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 11 ]); then
        if apt-cache show python3.11 >/dev/null 2>&1; then
            echo -e "${YELLOW}📦 Python 3.11 disponível, instalando (opcional)...${NC}"
            sudo apt install -y python3.11 python3.11-venv python3.11-dev || echo -e "${YELLOW}⚠️  Python 3.11 não disponível, continuando com Python $PYTHON_VERSION${NC}"
        fi
    fi
fi

# Determinar qual versão do Python usar
if command_exists python3.11; then
    PYTHON_CMD="python3.11"
elif command_exists python3.10; then
    PYTHON_CMD="python3.10"
elif command_exists python3.9; then
    PYTHON_CMD="python3.9"
else
    PYTHON_CMD="python3"
fi

echo -e "${GREEN}✅ Usando: $PYTHON_CMD ($($PYTHON_CMD --version 2>&1))${NC}"

# Instalar PostgreSQL
if ! command_exists psql; then
    echo -e "${YELLOW}📦 Instalando PostgreSQL...${NC}"
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
else
    echo -e "${GREEN}✅ PostgreSQL já instalado${NC}"
fi

# Configurar banco de dados
echo -e "${YELLOW}🗄️  Configurando banco de dados...${NC}"
sudo -u postgres psql << EOF || true
CREATE DATABASE vai_de_pix;
CREATE USER vai_de_pix_user WITH PASSWORD 'vai_de_pix_pass';
ALTER ROLE vai_de_pix_user SET client_encoding TO 'utf8';
ALTER ROLE vai_de_pix_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE vai_de_pix_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE vai_de_pix TO vai_de_pix_user;
\q
EOF

# Instalar Docker (opcional)
read -p "Deseja instalar Docker? (s/N): " install_docker
if [[ $install_docker =~ ^[Ss]$ ]]; then
    if ! command_exists docker; then
        echo -e "${YELLOW}📦 Instalando Docker...${NC}"
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
        echo -e "${GREEN}✅ Docker instalado. Você precisa fazer logout/login para usar Docker sem sudo.${NC}"
    else
        echo -e "${GREEN}✅ Docker já instalado${NC}"
    fi
fi

# Configurar backend
echo -e "${YELLOW}⚙️  Configurando backend...${NC}"
cd backend

# Criar venv se não existir
if [ ! -d "venv" ]; then
    $PYTHON_CMD -m venv venv
fi

# Ativar venv e instalar dependências
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Criar .env se não existir
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}📝 Arquivo .env criado. Por favor, edite com suas configurações.${NC}"
    else
        cat > .env << EOF
DATABASE_URL=postgresql://vai_de_pix_user:vai_de_pix_pass@localhost:5432/vai_de_pix
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
FRONTEND_URL=http://localhost:8080
EOF
        echo -e "${GREEN}✅ Arquivo .env criado automaticamente${NC}"
    fi
fi

# Executar migrações
echo -e "${YELLOW}🔄 Executando migrações do banco...${NC}"
alembic upgrade head || echo -e "${YELLOW}⚠️  Migrações podem precisar ser executadas manualmente${NC}"

deactivate
cd ..

# Configurar frontend
echo -e "${YELLOW}⚙️  Configurando frontend...${NC}"
npm install

# Criar .env.local se não existir
if [ ! -f ".env.local" ]; then
    cat > .env.local << EOF
VITE_API_URL=http://localhost:8000/api
EOF
    echo -e "${GREEN}✅ Arquivo .env.local criado${NC}"
fi

# Build do frontend
read -p "Deseja fazer build do frontend agora? (S/n): " build_frontend
if [[ ! $build_frontend =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}🏗️  Fazendo build do frontend...${NC}"
    npm run build
    echo -e "${GREEN}✅ Build concluído!${NC}"
fi

# Criar script de inicialização otimizado para RPi 5
cat > start-vai-de-pix.sh << 'SCRIPT_EOF'
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
SCRIPT_EOF

chmod +x start-vai-de-pix.sh

echo ""
echo -e "${GREEN}================================================"
echo "✅ Instalação concluída!"
echo "================================================${NC}"
echo ""
echo "📝 Próximos passos:"
echo "1. Edite backend/.env com suas configurações (se necessário)"
echo "2. Execute: ./start-vai-de-pix.sh"
echo "3. Acesse: http://localhost:8000 ou http://[IP-DO-RPI]:8000"
echo ""
echo "📚 Para mais informações, consulte: RASPBERRY-PI-5-SETUP.md"
echo ""

