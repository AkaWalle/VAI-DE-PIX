#!/bin/bash

# Script para fazer deploy do projeto para Raspberry Pi 5 via SSH
# Uso: ./scripts/deploy-to-rpi5.sh [IP_DO_RASPBERRY_PI]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# IP do Raspberry Pi (pode ser passado como argumento)
RPI_IP="${1:-192.168.6.40}"
RPI_USER="${RPI_USER:-pi}"
RPI_DIR="${RPI_DIR:-~/vai-de-pix}"

echo -e "${BLUE}================================================"
echo "🚀 Deploy VAI DE PIX para Raspberry Pi 5"
echo "================================================${NC}"
echo ""
echo -e "${YELLOW}Configuração:${NC}"
echo "  IP: $RPI_IP"
echo "  Usuário: $RPI_USER"
echo "  Diretório: $RPI_DIR"
echo ""

# Verificar se ssh está disponível
if ! command -v ssh >/dev/null 2>&1; then
    echo -e "${RED}❌ SSH não encontrado. Instale OpenSSH primeiro.${NC}"
    exit 1
fi

# Verificar se rsync está disponível
if ! command -v rsync >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  rsync não encontrado. Usando scp (mais lento)...${NC}"
    USE_RSYNC=false
else
    USE_RSYNC=true
fi

# Testar conexão SSH
echo -e "${YELLOW}🔌 Testando conexão SSH...${NC}"
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$RPI_USER@$RPI_IP" exit 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Conexão SSH requer autenticação.${NC}"
    echo -e "${YELLOW}Por favor, certifique-se de que:${NC}"
    echo "  1. SSH está habilitado no Raspberry Pi"
    echo "  2. Você tem acesso SSH configurado (chave ou senha)"
    echo ""
    read -p "Continuar mesmo assim? (s/N): " continue_deploy
    if [[ ! $continue_deploy =~ ^[Ss]$ ]]; then
        echo -e "${RED}Deploy cancelado.${NC}"
        exit 1
    fi
fi

# Criar diretório no Raspberry Pi
echo -e "${YELLOW}📁 Criando diretório no Raspberry Pi...${NC}"
ssh "$RPI_USER@$RPI_IP" "mkdir -p $RPI_DIR"

# Fazer build do frontend localmente (se ainda não foi feito)
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}🏗️  Fazendo build do frontend...${NC}"
    npm run build
fi

# Criar arquivo .gitignore temporário para excluir node_modules e venv
cat > .deployignore << EOF
node_modules/
backend/venv/
backend/__pycache__/
backend/**/__pycache__/
*.pyc
*.pyo
*.pyd
.Python
*.so
*.egg
*.egg-info/
dist/
.env
.env.local
*.log
.git/
.vscode/
.idea/
EOF

# Sincronizar arquivos
echo -e "${YELLOW}📤 Enviando arquivos para Raspberry Pi...${NC}"

if [ "$USE_RSYNC" = true ]; then
    rsync -avz --progress \
        --exclude-from=.deployignore \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='backend/venv' \
        --exclude='dist' \
        -e ssh \
        ./ "$RPI_USER@$RPI_IP:$RPI_DIR/"
    
    # Enviar dist separadamente
    if [ -d "dist" ]; then
        echo -e "${YELLOW}📤 Enviando frontend buildado...${NC}"
        rsync -avz --progress \
            -e ssh \
            dist/ "$RPI_USER@$RPI_IP:$RPI_DIR/dist/"
    fi
else
    # Usar scp como fallback
    echo -e "${YELLOW}Usando scp (pode ser mais lento)...${NC}"
    scp -r \
        --exclude='node_modules' \
        --exclude='backend/venv' \
        --exclude='.git' \
        ./ "$RPI_USER@$RPI_IP:$RPI_DIR/"
fi

# Limpar arquivo temporário
rm -f .deployignore

# Executar setup no Raspberry Pi
echo -e "${YELLOW}⚙️  Executando setup no Raspberry Pi...${NC}"
ssh "$RPI_USER@$RPI_IP" << EOF
    set -e
    cd $RPI_DIR
    
    # Verificar se está na branch correta
    if [ -d ".git" ]; then
        git checkout raspberry-pi-5 2>/dev/null || echo "Branch já está correta ou não é um repositório git"
    fi
    
    # Executar script de setup
    if [ -f "scripts/setup-raspberry-pi.sh" ]; then
        chmod +x scripts/setup-raspberry-pi.sh
        echo "Executando setup..."
        # Não executar automaticamente - deixar usuário executar manualmente
        echo "✅ Arquivos transferidos!"
        echo ""
        echo "Próximos passos:"
        echo "1. Conecte-se ao Raspberry Pi:"
        echo "   ssh $RPI_USER@$RPI_IP"
        echo ""
        echo "2. Navegue até o diretório:"
        echo "   cd $RPI_DIR"
        echo ""
        echo "3. Execute o setup:"
        echo "   ./scripts/setup-raspberry-pi.sh"
        echo ""
        echo "4. Ou execute manualmente:"
        echo "   cd backend"
        echo "   python3.11 -m venv venv"
        echo "   source venv/bin/activate"
        echo "   pip install -r requirements.txt"
        echo "   alembic upgrade head"
        echo "   cd .."
        echo "   npm install"
        echo "   npm run build"
    else
        echo "⚠️  Script de setup não encontrado"
    fi
EOF

echo ""
echo -e "${GREEN}================================================"
echo "✅ Deploy concluído!"
echo "================================================${NC}"
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo "1. Conecte-se ao Raspberry Pi:"
echo "   ${GREEN}ssh $RPI_USER@$RPI_IP${NC}"
echo ""
echo "2. Navegue até o diretório:"
echo "   ${GREEN}cd $RPI_DIR${NC}"
echo ""
echo "3. Execute o setup:"
echo "   ${GREEN}./scripts/setup-raspberry-pi.sh${NC}"
echo ""
echo "4. Ou inicie diretamente (se já configurado):"
echo "   ${GREEN}./start-vai-de-pix.sh${NC}"
echo ""

