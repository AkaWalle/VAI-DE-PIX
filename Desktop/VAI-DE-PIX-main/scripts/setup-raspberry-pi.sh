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

# Instalar Python 3.11+ se necessário
if ! command_exists python3.11; then
    echo -e "${YELLOW}📦 Instalando Python 3.11...${NC}"
    sudo apt install -y python3.11 python3.11-venv python3.11-dev
fi

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
    python3.11 -m venv venv
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

# Criar script de inicialização
cat > start-vai-de-pix.sh << 'EOF'
#!/bin/bash

# Script para iniciar VAI DE PIX

cd "$(dirname "$0")"

echo "🚀 Iniciando VAI DE PIX..."

# Iniciar backend
cd backend
source venv/bin/activate
python production_server.py &
BACKEND_PID=$!
cd ..

echo "✅ Backend iniciado (PID: $BACKEND_PID)"
echo "📝 Para parar: kill $BACKEND_PID"
echo "🌐 Backend: http://localhost:8000"
echo "📚 Docs: http://localhost:8000/docs"

# Iniciar frontend (servidor simples)
if [ -d "dist" ]; then
    cd dist
    python3 -m http.server 8080 &
    FRONTEND_PID=$!
    cd ..
    echo "✅ Frontend iniciado (PID: $FRONTEND_PID)"
    echo "🌐 Frontend: http://localhost:8080"
fi

echo ""
echo "✅ VAI DE PIX está rodando!"
echo "Pressione Ctrl+C para parar"
wait
EOF

chmod +x start-vai-de-pix.sh

echo ""
echo -e "${GREEN}================================================"
echo "✅ Instalação concluída!"
echo "================================================${NC}"
echo ""
echo "📝 Próximos passos:"
echo "1. Edite backend/.env com suas configurações"
echo "2. Execute: ./start-vai-de-pix.sh"
echo "3. Acesse: http://localhost:8080"
echo ""
echo "📚 Para mais informações, consulte: RASPBERRY-PI-5-SETUP.md"
echo ""

