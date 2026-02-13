#!/bin/bash

# =============================================================================
# Script de Configuração Automática - Servidor Raspberry Pi 5
# Data: Dezembro 2025
# Sistema: Raspberry Pi OS 64-bit Bookworm
# =============================================================================

set -e  # Para na primeira falha
set -u  # Erro se variável não definida

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    log_error "Por favor, execute com sudo: sudo ./setup-meu-servidor-pi5.sh"
    exit 1
fi

log_info "=========================================="
log_info "Configuração do Servidor Raspberry Pi 5"
log_info "=========================================="

# =============================================================================
# 1. ATUALIZAR SISTEMA E INSTALAR DEPENDÊNCIAS
# =============================================================================
log_info "Atualizando sistema e instalando dependências..."

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
# Instalar pacotes essenciais
apt-get install -y -qq \
    curl \
    wget \
    git \
    ufw \
    cron \
    openssh-server \
    openssh-client \
    certbot \
    python3-certbot-nginx \
    nginx \
    jq \
    unzip \
    ca-certificates \
    gnupg \
    lsb-release \
    apt-transport-https

# Instalar pacotes opcionais (não críticos se falharem)
apt-get install -y -qq software-properties-common 2>/dev/null || log_warning "software-properties-common não disponível, continuando..."

log_success "Sistema atualizado e dependências instaladas"

# =============================================================================
# 2. SOLICITAR INFORMAÇÕES DO USUÁRIO
# =============================================================================
log_info "Solicitando informações necessárias..."

# Garantir que lemos do terminal, não de stdin redirecionado
exec < /dev/tty

echo -n "Digite seu token DuckDNS: "
read DUCKDNS_TOKEN
# Remover espaços em branco do início e fim
DUCKDNS_TOKEN=$(echo "$DUCKDNS_TOKEN" | tr -d '[:space:]')
if [ -z "$DUCKDNS_TOKEN" ]; then
    log_error "Token DuckDNS é obrigatório!"
    exit 1
fi

echo -n "Digite seu domínio DuckDNS (ex: meuservidor.duckdns.org): "
read DUCKDNS_DOMAIN
# Remover espaços em branco do início e fim
DUCKDNS_DOMAIN=$(echo "$DUCKDNS_DOMAIN" | tr -d '[:space:]')
if [ -z "$DUCKDNS_DOMAIN" ]; then
    log_error "Domínio DuckDNS é obrigatório!"
    exit 1
fi

echo -n "Digite seu e-mail para Let's Encrypt: "
read EMAIL
# Remover espaços em branco do início e fim
EMAIL=$(echo "$EMAIL" | tr -d '[:space:]')
if [ -z "$EMAIL" ]; then
    log_error "E-mail é obrigatório!"
    exit 1
fi

echo -n "Digite seu token Cloudflare (opcional, pressione Enter para pular): "
read CLOUDFLARE_TOKEN
CLOUDFLARE_TOKEN=$(echo "$CLOUDFLARE_TOKEN" | tr -d '[:space:]')

echo -n "Digite seu Account ID Cloudflare (opcional, pressione Enter para pular): "
read CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_ACCOUNT_ID=$(echo "$CLOUDFLARE_ACCOUNT_ID" | tr -d '[:space:]')

log_success "Informações coletadas"

# =============================================================================
# 3. CONFIGURAR DUCKDNS
# =============================================================================
log_info "Configurando DuckDNS..."

mkdir -p /opt/duckdns
cat > /opt/duckdns/duck.sh <<EOF
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&ip=" | curl -k -o /opt/duckdns/duck.log -K -
EOF

chmod 700 /opt/duckdns/duck.sh
chown pi:pi /opt/duckdns/duck.sh

# Executar imediatamente
/opt/duckdns/duck.sh

# Adicionar ao cron a cada 5 minutos
(crontab -u pi -l 2>/dev/null | grep -v "/opt/duckdns/duck.sh"; echo "*/5 * * * * /opt/duckdns/duck.sh >/dev/null 2>&1") | crontab -u pi -

log_success "DuckDNS configurado (atualização a cada 5 minutos)"

# =============================================================================
# 4. INSTALAR DOCKER + DOCKER COMPOSE
# =============================================================================
log_info "Instalando Docker e Docker Compose..."

# Remover versões antigas se existirem
apt-get remove -y -qq docker docker-engine docker.io containerd runc 2>/dev/null || true

# Adicionar repositório Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Adicionar usuário pi ao grupo docker
usermod -aG docker pi

# Instalar Docker Compose standalone (versão mais recente)
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r .tag_name)
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Habilitar Docker no boot
systemctl enable docker
systemctl start docker

log_success "Docker e Docker Compose instalados"

# =============================================================================
# 5. INSTALAR E CONFIGURAR NGINX
# =============================================================================
log_info "Configurando Nginx como reverse proxy..."

# Parar nginx temporariamente
systemctl stop nginx 2>/dev/null || true

# Configuração básica do Nginx
cat > /etc/nginx/nginx.conf <<'NGINX_EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
NGINX_EOF

# Criar diretório de sites
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

# Configuração padrão para o domínio DuckDNS
cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 80;
    server_name ${DUCKDNS_DOMAIN};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Habilitar site padrão
ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/default.bak

# Testar configuração
nginx -t

log_success "Nginx configurado"

# =============================================================================
# 6. INSTALAR E CONFIGURAR CLOUDFLARE TUNNEL
# =============================================================================
log_info "Instalando Cloudflare Tunnel..."

# Baixar cloudflared
ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ]; then
    ARCH="arm64"
elif [ "$ARCH" = "armv7l" ]; then
    ARCH="arm"
fi

CLOUDFLARED_VERSION=$(curl -s https://api.github.com/repos/cloudflare/cloudflared/releases/latest | jq -r .tag_name | sed 's/v//')
wget -q "https://github.com/cloudflare/cloudflared/releases/download/v${CLOUDFLARED_VERSION}/cloudflared-linux-${ARCH}" -O /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Criar usuário para cloudflared
useradd -r -s /bin/false cloudflared 2>/dev/null || true

# Criar diretório de configuração
mkdir -p /etc/cloudflared
chown cloudflared:cloudflared /etc/cloudflared

# Se token e account ID foram fornecidos, configurar automaticamente
if [ -n "$CLOUDFLARE_TOKEN" ] && [ -n "$CLOUDFLARE_ACCOUNT_ID" ]; then
    log_info "Configurando Cloudflare Tunnel com credenciais fornecidas..."
    
    # Criar tunnel
    export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_TOKEN"
    export CLOUDFLARE_ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID"
    
    TUNNEL_NAME="pi5-tunnel-$(date +%s)"
    TUNNEL_ID=$(cloudflared tunnel create "$TUNNEL_NAME" --output json | jq -r '.id')
    
    if [ -n "$TUNNEL_ID" ] && [ "$TUNNEL_ID" != "null" ]; then
        # Salvar credenciais
        cloudflared tunnel token "$TUNNEL_ID" > /etc/cloudflared/credentials.json
        
        # Criar configuração do tunnel
        cat > /etc/cloudflared/config.yml <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: ${DUCKDNS_DOMAIN}
    service: http://localhost:80
  - service: http_status:404
EOF
        
        # Criar serviço systemd
        cat > /etc/systemd/system/cloudflared.service <<EOF
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=cloudflared
ExecStart=/usr/local/bin/cloudflared tunnel --config /etc/cloudflared/config.yml run
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF
        
        systemctl daemon-reload
        systemctl enable cloudflared
        systemctl start cloudflared
        
        CLOUDFLARE_TUNNEL_DOMAIN="${DUCKDNS_DOMAIN}"
        log_success "Cloudflare Tunnel configurado automaticamente"
    else
        log_warning "Não foi possível criar tunnel automaticamente. Configure manualmente depois."
        CLOUDFLARE_TUNNEL_DOMAIN="configure-manualmente.cloudflare.com"
    fi
else
    log_warning "Token e Account ID do Cloudflare não fornecidos."
    log_info "Para configurar o Cloudflare Tunnel manualmente, execute:"
    log_info "  cloudflared tunnel login"
    log_info "  cloudflared tunnel create meu-tunnel"
    log_info "  cloudflared tunnel route dns meu-tunnel ${DUCKDNS_DOMAIN}"
    
    # Criar configuração de exemplo
    cat > /etc/cloudflared/config.yml <<EOF
# Configure seu tunnel manualmente:
# 1. Execute: cloudflared tunnel login
# 2. Execute: cloudflared tunnel create meu-tunnel
# 3. Execute: cloudflared tunnel route dns meu-tunnel ${DUCKDNS_DOMAIN}
# 4. Descomente e ajuste as linhas abaixo:

# tunnel: SEU_TUNNEL_ID
# credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: ${DUCKDNS_DOMAIN}
    service: http://localhost:80
  - service: http_status:404
EOF
    
    CLOUDFLARE_TUNNEL_DOMAIN="configure-manualmente.cloudflare.com"
fi

log_success "Cloudflare Tunnel instalado"

# =============================================================================
# 7. CONFIGURAR CERTBOT + LET'S ENCRYPT
# =============================================================================
log_info "Configurando Certbot e Let's Encrypt..."

# Certbot será configurado após o Nginx estar rodando
# Por enquanto, apenas garantir que está instalado
log_success "Certbot instalado (será configurado após Nginx estar ativo)"

# =============================================================================
# 8. CONFIGURAR FIREWALL UFW
# =============================================================================
log_info "Configurando firewall UFW..."

# Resetar regras
ufw --force reset

# Permitir SSH na porta 2222
ufw allow 2222/tcp comment 'SSH'

# Permitir tráfego do Cloudflare
ufw allow from 173.245.48.0/20 comment 'Cloudflare'
ufw allow from 103.21.244.0/22 comment 'Cloudflare'
ufw allow from 103.22.200.0/22 comment 'Cloudflare'
ufw allow from 103.31.4.0/22 comment 'Cloudflare'
ufw allow from 141.101.64.0/18 comment 'Cloudflare'
ufw allow from 108.162.192.0/18 comment 'Cloudflare'
ufw allow from 190.93.240.0/20 comment 'Cloudflare'
ufw allow from 188.114.96.0/20 comment 'Cloudflare'
ufw allow from 197.234.240.0/22 comment 'Cloudflare'
ufw allow from 198.41.128.0/17 comment 'Cloudflare'
ufw allow from 162.158.0.0/15 comment 'Cloudflare'
ufw allow from 104.16.0.0/13 comment 'Cloudflare'
ufw allow from 104.24.0.0/14 comment 'Cloudflare'
ufw allow from 172.64.0.0/13 comment 'Cloudflare'
ufw allow from 131.0.72.0/22 comment 'Cloudflare'

# Permitir HTTP e HTTPS (para Let's Encrypt)
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Habilitar UFW
ufw --force enable

log_success "Firewall UFW configurado"

# =============================================================================
# 9. CONFIGURAR SSH (PORTA 2222, SEM SENHA, COM CHAVES)
# =============================================================================
log_info "Configurando SSH..."

# Backup da configuração original
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Alterar porta para 2222
sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
sed -i 's/^Port 22/Port 2222/' /etc/ssh/sshd_config
if ! grep -q "^Port 2222" /etc/ssh/sshd_config; then
    echo "Port 2222" >> /etc/ssh/sshd_config
fi

# Desabilitar login por senha
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
if ! grep -q "^PasswordAuthentication no" /etc/ssh/sshd_config; then
    echo "PasswordAuthentication no" >> /etc/ssh/sshd_config
fi

# Habilitar autenticação por chave
sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
if ! grep -q "^PubkeyAuthentication yes" /etc/ssh/sshd_config; then
    echo "PubkeyAuthentication yes" >> /etc/ssh/sshd_config
fi

# Gerar par de chaves SSH se não existir
if [ ! -f /home/pi/.ssh/id_rsa ]; then
    log_info "Gerando par de chaves SSH..."
    sudo -u pi mkdir -p /home/pi/.ssh
    sudo -u pi ssh-keygen -t rsa -b 4096 -f /home/pi/.ssh/id_rsa -N "" -q
    sudo -u pi cat /home/pi/.ssh/id_rsa.pub >> /home/pi/.ssh/authorized_keys
    chmod 700 /home/pi/.ssh
    chmod 600 /home/pi/.ssh/id_rsa
    chmod 644 /home/pi/.ssh/id_rsa.pub
    chmod 600 /home/pi/.ssh/authorized_keys
    chown -R pi:pi /home/pi/.ssh
    log_success "Par de chaves SSH gerado em /home/pi/.ssh/"
    log_warning "IMPORTANTE: Salve a chave privada /home/pi/.ssh/id_rsa em local seguro!"
fi

# Reiniciar SSH
systemctl restart sshd

log_success "SSH configurado na porta 2222 (apenas chaves)"

# =============================================================================
# 10. CRIAR ESTRUTURA DE PROJETOS COM EXEMPLO DOCKER-COMPOSE
# =============================================================================
log_info "Criando estrutura de projetos..."

mkdir -p /home/pi/projetos
chown pi:pi /home/pi/projetos

# Criar exemplo de docker-compose.yml com Next.js
cat > /home/pi/projetos/docker-compose.yml <<'DOCKER_COMPOSE_EOF'
version: '3.8'

services:
  nextjs-app:
    image: node:20-alpine
    container_name: meu-app-nextjs
    working_dir: /app
    volumes:
      - ./app:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    command: sh -c "npm install && npm run dev"
    restart: unless-stopped
    environment:
      - NODE_ENV=development
    networks:
      - app-network

  # Exemplo alternativo com Node.js simples
  # nodejs-app:
  #   image: node:20-alpine
  #   container_name: meu-app-nodejs
  #   working_dir: /app
  #   volumes:
  #     - ./app:/app
  #   ports:
  #     - "3000:3000"
  #   command: node server.js
  #   restart: unless-stopped
  #   networks:
  #     - app-network

networks:
  app-network:
    driver: bridge
DOCKER_COMPOSE_EOF

# Criar exemplo de app Next.js básico
mkdir -p /home/pi/projetos/app
cat > /home/pi/projetos/app/package.json <<'PKG_EOF'
{
  "name": "meu-app-nextjs",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev -H 0.0.0.0",
    "build": "next build",
    "start": "next start -H 0.0.0.0"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
PKG_EOF

cat > /home/pi/projetos/app/pages/index.js <<'PAGE_EOF'
export default function Home() {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>🚀 Servidor Raspberry Pi 5 Funcionando!</h1>
      <p>Seu servidor está online e acessível de qualquer lugar do mundo.</p>
      <p>Domínio: {typeof window !== 'undefined' ? window.location.hostname : 'Carregando...'}</p>
    </div>
  );
}
PAGE_EOF

cat > /home/pi/projetos/app/next.config.js <<'NEXT_CONFIG_EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
NEXT_CONFIG_EOF

chown -R pi:pi /home/pi/projetos

log_success "Estrutura de projetos criada em /home/pi/projetos"

# =============================================================================
# 11. INICIAR SERVIÇOS
# =============================================================================
log_info "Iniciando serviços..."

# Iniciar Nginx
systemctl enable nginx
systemctl start nginx

# Aguardar Nginx iniciar
sleep 2

# Configurar certificado SSL com Let's Encrypt
log_info "Configurando certificado SSL com Let's Encrypt..."
if certbot --nginx -d "${DUCKDNS_DOMAIN}" --non-interactive --agree-tos --email "${EMAIL}" --redirect 2>/dev/null; then
    log_success "Certificado SSL configurado com sucesso!"
    
    # Configurar renovação automática
    systemctl enable certbot.timer
    systemctl start certbot.timer
else
    log_warning "Não foi possível obter certificado SSL agora. Configure manualmente depois com:"
    log_info "  certbot --nginx -d ${DUCKDNS_DOMAIN}"
fi

# =============================================================================
# 12. RESUMO FINAL
# =============================================================================
log_success "=========================================="
log_success "CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!"
log_success "=========================================="
echo ""
log_info "📋 INFORMAÇÕES DO SEU SERVIDOR:"
echo ""
echo -e "${GREEN}Domínio DuckDNS:${NC} ${DUCKDNS_DOMAIN}"
echo -e "${GREEN}Domínio Cloudflare Tunnel:${NC} ${CLOUDFLARE_TUNNEL_DOMAIN}"
echo -e "${GREEN}SSH Port:${NC} 2222"
echo -e "${GREEN}Projetos:${NC} /home/pi/projetos"
echo ""
log_info "🔐 ACESSO SSH:"
echo "  ssh -p 2222 pi@$(hostname -I | awk '{print $1}')"
echo "  ou"
echo "  ssh -p 2222 pi@${DUCKDNS_DOMAIN}"
echo ""
log_info "🌐 ACESSO WEB:"
echo "  http://${DUCKDNS_DOMAIN}"
echo "  https://${DUCKDNS_DOMAIN}"
echo ""
log_info "📝 PRÓXIMOS PASSOS:"
echo "  1. Acesse /home/pi/projetos e ajuste o docker-compose.yml"
echo "  2. Execute: cd /home/pi/projetos && docker-compose up -d"
echo "  3. Seu app estará disponível em https://${DUCKDNS_DOMAIN}"
echo ""
log_warning "⚠️  IMPORTANTE:"
echo "  - Salve a chave SSH privada: /home/pi/.ssh/id_rsa"
echo "  - O DuckDNS atualiza automaticamente a cada 5 minutos"
echo "  - O certificado SSL renova automaticamente"
echo ""
log_success "Servidor configurado e pronto para uso! 🎉"
