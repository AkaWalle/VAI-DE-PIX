# 🍓 Vai de Pix - Setup para Raspberry Pi 5

Este documento contém instruções específicas para rodar o projeto **Vai de Pix** em um Raspberry Pi 5.

## 📋 Pré-requisitos

- **Raspberry Pi 5** com Raspberry Pi OS (64-bit) instalado
- Conexão com internet
- Acesso via SSH ou terminal local
- Pelo menos **4GB de RAM** (recomendado 8GB)
- **32GB+ de armazenamento** (SD card ou SSD)

## 🚀 Instalação Rápida

### Opção 1: Script Automatizado (Recomendado)

```bash
# Clonar o repositório (se ainda não tiver)
git clone <seu-repositorio>
cd "Vai de Pix"

# Fazer checkout da branch raspberry-pi-5
git checkout raspberry-pi-5

# Executar script de instalação
chmod +x scripts/setup-raspberry-pi.sh
./scripts/setup-raspberry-pi.sh
```

### Opção 2: Instalação Manual

Siga os passos abaixo se preferir instalar manualmente.

## 📦 Instalação Manual

### 1. Atualizar o Sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalar Dependências Básicas

```bash
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
```

### 3. Instalar Node.js (versão 20.x)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node -v  # Deve mostrar v20.x.x
npm -v
```

### 4. Instalar Python 3.11+

```bash
sudo apt install -y python3.11 python3.11-venv python3.11-dev

# Verificar instalação
python3.11 --version
```

### 5. Instalar e Configurar PostgreSQL

```bash
# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Iniciar e habilitar serviço
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configurar banco de dados
sudo -u postgres psql << EOF
CREATE DATABASE vai_de_pix;
CREATE USER vai_de_pix_user WITH PASSWORD 'vai_de_pix_pass';
ALTER ROLE vai_de_pix_user SET client_encoding TO 'utf8';
ALTER ROLE vai_de_pix_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE vai_de_pix_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE vai_de_pix TO vai_de_pix_user;
\q
EOF
```

### 6. Configurar Backend

```bash
cd backend

# Criar ambiente virtual
python3.11 -m venv venv

# Ativar ambiente virtual
source venv/bin/activate

# Atualizar pip
pip install --upgrade pip

# Instalar dependências
pip install -r requirements.txt

# Criar arquivo .env
cat > .env << EOF
DATABASE_URL=postgresql://vai_de_pix_user:vai_de_pix_pass@localhost:5432/vai_de_pix
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
FRONTEND_URL=http://localhost:8080
ENVIRONMENT=production
EOF

# Executar migrações
alembic upgrade head

deactivate
cd ..
```

### 7. Configurar Frontend

```bash
# Instalar dependências
npm install

# Criar arquivo .env.local
cat > .env.local << EOF
VITE_API_URL=http://localhost:8000/api
EOF

# Fazer build do frontend
npm run build
```

## 🎯 Executando o Projeto

### Opção 1: Usando o Script de Inicialização

```bash
./start-vai-de-pix.sh
```

### Opção 2: Manualmente

#### Terminal 1 - Backend

```bash
cd backend
source venv/bin/activate
python production_server.py
```

#### Terminal 2 - Frontend (servidor estático)

```bash
cd dist
python3 -m http.server 8080
```

### Opção 3: Usando systemd (Serviço Automático)

Criar serviço systemd para iniciar automaticamente:

```bash
sudo nano /etc/systemd/system/vai-de-pix-backend.service
```

Adicionar:

```ini
[Unit]
Description=Vai de Pix Backend
After=network.target postgresql.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Vai de Pix/backend
Environment="PATH=/home/pi/Vai de Pix/backend/venv/bin"
ExecStart=/home/pi/Vai de Pix/backend/venv/bin/python production_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Habilitar e iniciar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vai-de-pix-backend.service
sudo systemctl start vai-de-pix-backend.service

# Verificar status
sudo systemctl status vai-de-pix-backend.service
```

## 🌐 Acessando o Sistema

Após iniciar os serviços:

- **Frontend**: http://localhost:8080 ou http://[IP-DO-RASPBERRY-PI]:8080
- **Backend API**: http://localhost:8000/api
- **Documentação API**: http://localhost:8000/docs

## 🔧 Otimizações para Raspberry Pi 5

### 1. Aumentar Swap (se necessário)

```bash
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Alterar CONF_SWAPSIZE=100 para CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### 2. Otimizar PostgreSQL para RPi 5

```bash
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Adicionar/modificar:

```conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
```

Reiniciar PostgreSQL:

```bash
sudo systemctl restart postgresql
```

### 3. Usar Build Otimizado do Frontend

O build já está otimizado, mas você pode usar variáveis de ambiente para reduzir ainda mais:

```bash
NODE_ENV=production npm run build
```

## 🐳 Usando Docker (Opcional)

Se preferir usar Docker:

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Fazer logout/login ou executar:
newgrp docker

# Executar com docker-compose
docker-compose up -d
```

**Nota**: Docker pode consumir mais recursos no Raspberry Pi. Use apenas se tiver 8GB de RAM.

## 🔍 Troubleshooting

### Problema: Node.js não instala

```bash
# Limpar cache e tentar novamente
sudo apt clean
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Problema: Python 3.11 não disponível

```bash
# Adicionar repositório deadsnakes
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev
```

### Problema: PostgreSQL não inicia

```bash
# Verificar logs
sudo journalctl -u postgresql -n 50

# Verificar status
sudo systemctl status postgresql

# Reiniciar
sudo systemctl restart postgresql
```

### Problema: Porta já em uso

```bash
# Verificar portas em uso
sudo netstat -tulpn | grep -E ':(8000|8080|5432)'

# Parar processos se necessário
sudo kill -9 <PID>
```

### Problema: Build do frontend falha por falta de memória

```bash
# Aumentar swap (veja seção de otimizações)
# Ou usar build com menos workers
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```

## 📊 Monitoramento de Recursos

```bash
# Monitorar uso de CPU e memória
htop

# Monitorar uso de disco
df -h

# Monitorar processos
ps aux | grep -E '(python|node|postgres)'
```

## 🔐 Segurança

### 1. Alterar Senhas Padrão

```bash
# Alterar senha do PostgreSQL
sudo -u postgres psql
ALTER USER vai_de_pix_user WITH PASSWORD 'sua-senha-segura';
\q
```

### 2. Configurar Firewall

```bash
# Instalar UFW
sudo apt install -y ufw

# Permitir SSH
sudo ufw allow 22/tcp

# Permitir portas do aplicativo (apenas se acessar externamente)
sudo ufw allow 8000/tcp
sudo ufw allow 8080/tcp

# Ativar firewall
sudo ufw enable
```

### 3. Usar HTTPS (Recomendado para produção)

Considere usar um proxy reverso como Nginx com Let's Encrypt:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

## 📝 Notas Importantes

1. **Performance**: O Raspberry Pi 5 tem melhor performance que modelos anteriores, mas ainda é limitado. Para produção com muitos usuários, considere usar um servidor mais potente.

2. **Armazenamento**: Use um SSD via USB 3.0 para melhor performance do banco de dados.

3. **Temperatura**: Monitore a temperatura do RPi 5. Use um cooler ativo se necessário.

4. **Backup**: Configure backups regulares do banco de dados:

```bash
# Criar script de backup
cat > backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/pi/backups"
mkdir -p $BACKUP_DIR
pg_dump -U vai_de_pix_user vai_de_pix > $BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql
# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "backup-*.sql" -mtime +7 -delete
EOF

chmod +x backup-db.sh

# Adicionar ao crontab (backup diário às 2h)
crontab -e
# Adicionar: 0 2 * * * /home/pi/backup-db.sh
```

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs do backend: `backend/logs/`
2. Verifique os logs do sistema: `sudo journalctl -u vai-de-pix-backend -n 50`
3. Verifique a documentação principal: `README.md`
4. Abra uma issue no repositório

## ✅ Checklist de Instalação

- [ ] Sistema atualizado
- [ ] Node.js 20.x instalado
- [ ] Python 3.11+ instalado
- [ ] PostgreSQL instalado e configurado
- [ ] Backend configurado e migrações executadas
- [ ] Frontend buildado
- [ ] Serviços iniciados e funcionando
- [ ] Acesso ao sistema via navegador
- [ ] Firewall configurado (se necessário)
- [ ] Backup configurado

---

**Última atualização**: Janeiro 2025
**Branch**: `raspberry-pi-5`

