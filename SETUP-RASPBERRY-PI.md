# 🍓 Setup Completo - Raspberry Pi 5 Kiosk Mode

Guia passo a passo para transformar seu **Raspberry Pi 5** em um totem kiosk 24/7 rodando o **VAI DE PIX**.

## 📋 Pré-requisitos

- **Raspberry Pi 5** (4GB RAM mínimo, 8GB recomendado)
- **SD Card 32GB+** ou **SSD via USB 3.0** (recomendado)
- **Raspberry Pi OS** (64-bit) instalado
- **Conexão com internet** (WiFi ou Ethernet)
- **Teclado e mouse** (apenas para setup inicial)
- **Monitor/TV** para exibição

## 🚀 Instalação Rápida (1 Comando)

```bash
git clone https://github.com/AkaWalle/VAI-DE-PIX.git
cd VAI-DE-PIX
git checkout raspberry-pi-5
chmod +x scripts/setup-raspberry-pi.sh
./scripts/setup-raspberry-pi.sh
```

O script vai:
1. ✅ Instalar todas as dependências
2. ✅ Configurar PostgreSQL
3. ✅ Configurar backend Python
4. ✅ Buildar frontend
5. ✅ Configurar serviço systemd
6. ✅ Configurar modo kiosk

**Tempo estimado:** 15-30 minutos

## 📦 Instalação Manual (Passo a Passo)

### 1. Atualizar Sistema

```bash
sudo apt update && sudo apt upgrade -y
sudo reboot  # Reiniciar após atualização
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
    postgresql \
    postgresql-contrib \
    nginx \
    unclutter \
    xdotool
```

### 3. Instalar Node.js 20.x

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar
node -v  # Deve mostrar v20.x.x
npm -v
```

### 4. Instalar Python 3.11+

```bash
sudo apt install -y python3.11 python3.11-venv python3.11-dev
python3.11 --version
```

### 5. Configurar PostgreSQL

```bash
# Iniciar PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Criar banco e usuário
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

### 6. Clonar e Configurar Projeto

```bash
cd ~
git clone https://github.com/AkaWalle/VAI-DE-PIX.git vai-de-pix
cd vai-de-pix
git checkout raspberry-pi-5
```

### 7. Configurar Backend

```bash
cd backend

# Criar ambiente virtual
python3.11 -m venv venv
source venv/bin/activate

# Instalar dependências
pip install --upgrade pip
pip install -r requirements.txt

# Configurar .env
cat > .env << EOF
DATABASE_URL=postgresql://vai_de_pix_user:vai_de_pix_pass@localhost:5432/vai_de_pix
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
FRONTEND_URL=http://localhost:8000
ENVIRONMENT=production
PORT=8000
EOF

# Executar migrações
alembic upgrade head

deactivate
cd ..
```

### 8. Configurar Frontend

```bash
# Instalar dependências
npm install

# Criar .env.local
cat > .env.local << EOF
VITE_API_URL=http://localhost:8000/api
EOF

# Build do frontend
npm run build
```

### 9. Testar Servidor

```bash
cd backend
source venv/bin/activate
python production_server.py
```

Acesse `http://[IP-DO-PI]:8000` no navegador. Se funcionar, pare o servidor (Ctrl+C).

### 10. Configurar Serviço Systemd

```bash
sudo nano /etc/systemd/system/vai-de-pix.service
```

Adicione:

```ini
[Unit]
Description=VAI DE PIX - Sistema de Controle Financeiro
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/vai-de-pix/backend
Environment="PATH=/home/pi/vai-de-pix/backend/venv/bin"
ExecStart=/home/pi/vai-de-pix/backend/venv/bin/python production_server.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Ativar serviço:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vai-de-pix.service
sudo systemctl start vai-de-pix.service

# Verificar status
sudo systemctl status vai-de-pix.service
```

### 11. Configurar Modo Kiosk (Chromium)

```bash
# Instalar Chromium
sudo apt install -y chromium-browser

# Criar script de inicialização
sudo nano /home/pi/.xinitrc
```

Adicione:

```bash
#!/bin/bash
xset s off
xset -dpms
xset s noblank
unclutter -idle 0.5 -root &
chromium-browser --kiosk --incognito --disable-infobars http://localhost:8000
```

```bash
chmod +x /home/pi/.xinitrc

# Configurar auto-login e iniciar X no boot
sudo raspi-config
# Opção: System Options → Boot / Auto Login → Desktop Autologin
```

### 12. Configurar Auto-start X

```bash
sudo nano /etc/systemd/system/getty@tty1.service.d/autologin.conf
```

Adicione:

```ini
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin pi --noclear %I $TERM
```

```bash
sudo nano /home/pi/.bash_profile
```

Adicione:

```bash
if [[ -z $DISPLAY ]] && [[ $(tty) = /dev/tty1 ]]; then
    startx
fi
```

### 13. Otimizações para Raspberry Pi 5

```bash
# Aumentar swap (se necessário)
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Alterar: CONF_SWAPSIZE=100 para CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Otimizar PostgreSQL
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Adicione/modifique:

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

```bash
sudo systemctl restart postgresql
```

## 🔧 Comandos Úteis

### Gerenciar Serviço

```bash
# Ver status
sudo systemctl status vai-de-pix.service

# Ver logs
sudo journalctl -u vai-de-pix.service -f

# Reiniciar
sudo systemctl restart vai-de-pix.service

# Parar
sudo systemctl stop vai-de-pix.service
```

### Atualizar Código

```bash
cd ~/vai-de-pix
git pull origin raspberry-pi-5
cd backend
source venv/bin/activate
alembic upgrade head
deactivate
cd ..
npm run build
sudo systemctl restart vai-de-pix.service
```

### Verificar Portas

```bash
# Ver se está rodando
sudo netstat -tlnp | grep 8000

# Ver processos Python
ps aux | grep python
```

## 🐛 Troubleshooting

### Servidor não inicia

```bash
# Ver logs detalhados
sudo journalctl -u vai-de-pix.service -n 50

# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Verificar .env
cat backend/.env
```

### Frontend não aparece

```bash
# Verificar se dist existe
ls -la dist/

# Rebuild frontend
npm run build
```

### Chromium não abre em kiosk

```bash
# Testar manualmente
chromium-browser --kiosk http://localhost:8000

# Verificar logs X
cat ~/.xsession-errors
```

### Performance lenta

```bash
# Verificar uso de recursos
htop

# Verificar temperatura
vcgencmd measure_temp

# Aumentar swap (veja seção de otimizações)
```

## 📊 Monitoramento

### Verificar Saúde do Sistema

```bash
# CPU e Memória
htop

# Disco
df -h

# Temperatura
vcgencmd measure_temp

# Uptime
uptime
```

### Verificar Aplicação

```bash
# Health check da API
curl http://localhost:8000/api/health

# Ver processos
ps aux | grep -E '(python|node|postgres)'
```

## 🔐 Segurança

### Firewall

```bash
sudo apt install -y ufw
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 8000/tcp  # Aplicação (se necessário)
sudo ufw enable
```

### Alterar Senhas Padrão

```bash
# PostgreSQL
sudo -u postgres psql
ALTER USER vai_de_pix_user WITH PASSWORD 'nova-senha-segura';
\q

# Atualizar .env
nano backend/.env
# Atualizar DATABASE_URL com nova senha
```

## 📝 Checklist Final

- [ ] Sistema atualizado
- [ ] Node.js 20.x instalado
- [ ] Python 3.11+ instalado
- [ ] PostgreSQL instalado e configurado
- [ ] Backend configurado e migrações executadas
- [ ] Frontend buildado
- [ ] Serviço systemd configurado e rodando
- [ ] Modo kiosk configurado
- [ ] Aplicação acessível via navegador
- [ ] Auto-start configurado
- [ ] Firewall configurado (se necessário)

## 🎉 Pronto!

Seu Raspberry Pi 5 agora está rodando o **VAI DE PIX** em modo kiosk 24/7!

**Acesso:**
- **Local:** http://localhost:8000
- **Rede:** http://[IP-DO-PI]:8000
- **API Docs:** http://[IP-DO-PI]:8000/docs

**Credenciais padrão:**
- Email: `admin@vaidepix.com`
- Senha: `123456`

---

**Última atualização:** Janeiro 2025  
**IP Configurado:** 192.168.6.40

