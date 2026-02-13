# 🍓 Guia de Deploy para Raspberry Pi 5

Este guia mostra como fazer deploy do projeto para o Raspberry Pi 5 no IP **192.168.6.40**.

## 🚀 Opções de Deploy

### Opção 1: Deploy Automatizado (Recomendado)

#### Windows (PowerShell)

```powershell
# Deploy rápido (usa IP configurado: 192.168.6.40)
.\scripts\quick-deploy-rpi5.ps1

# Ou deploy customizado
.\scripts\deploy-to-rpi5.ps1 -RpiIp 192.168.6.40 -RpiUser pi
```

#### Linux/Mac (Bash)

```bash
# Deploy com IP configurado
chmod +x scripts/deploy-to-rpi5.sh
./scripts/deploy-to-rpi5.sh 192.168.6.40
```

### Opção 2: Deploy Manual

#### 1. Conectar ao Raspberry Pi

```bash
# Windows PowerShell
ssh pi@192.168.6.40

# Linux/Mac
ssh pi@192.168.6.40
```

#### 2. No Raspberry Pi, clonar o repositório

```bash
cd ~
# Método 1: Clonar direto na branch raspberry-pi-5 (recomendado)
git clone -b raspberry-pi-5 https://github.com/AkaWalle/VAI-DE-PIX.git vai-de-pix
cd vai-de-pix

# Método 2: Se já clonou na branch main, fazer checkout:
# git fetch origin
# git checkout -b raspberry-pi-5 origin/raspberry-pi-5
```

#### 3. Executar setup

```bash
chmod +x scripts/setup-raspberry-pi.sh
./scripts/setup-raspberry-pi.sh
```

## 🔌 Scripts de Conexão

### Conectar via SSH

#### Windows (PowerShell)

```powershell
.\scripts\connect-rpi5.ps1
```

#### Linux/Mac (Bash)

```bash
chmod +x scripts/connect-rpi5.sh
./scripts/connect-rpi5.sh
```

### Executar Comando Remoto

#### Windows (PowerShell)

```powershell
# Verificar status
.\scripts\connect-rpi5.ps1 "systemctl status vai-de-pix-backend"

# Ver logs
.\scripts\connect-rpi5.ps1 "tail -f ~/vai-de-pix/backend/logs/*.log"
```

#### Linux/Mac (Bash)

```bash
# Verificar status
./scripts/connect-rpi5.sh "systemctl status vai-de-pix-backend"

# Ver logs
./scripts/connect-rpi5.sh "tail -f ~/vai-de-pix/backend/logs/*.log"
```

## 📋 Checklist de Deploy

### Antes do Deploy

- [ ] Raspberry Pi 5 está ligado e acessível na rede
- [ ] SSH está habilitado no Raspberry Pi
- [ ] Você tem acesso SSH (senha ou chave configurada)
- [ ] Projeto está na branch `raspberry-pi-5`
- [ ] Frontend foi buildado (`npm run build`)

### Durante o Deploy

- [ ] Arquivos foram transferidos com sucesso
- [ ] Script de setup foi executado
- [ ] Dependências foram instaladas
- [ ] Banco de dados foi configurado
- [ ] Migrações foram executadas

### Após o Deploy

- [ ] Backend está rodando (`http://192.168.6.40:8000`)
- [ ] Frontend está acessível (`http://192.168.6.40:8000`)
- [ ] API Docs funcionando (`http://192.168.6.40:8000/docs`)
- [ ] Health check OK (`http://192.168.6.40:8000/api/health`)

## 🔧 Comandos Úteis

### No Raspberry Pi

```bash
# Iniciar aplicação
cd ~/vai-de-pix
./start-vai-de-pix.sh

# Ver logs do backend
tail -f backend/logs/*.log

# Verificar processos
ps aux | grep -E '(python|gunicorn|node)'

# Verificar uso de recursos
htop

# Reiniciar serviço (se configurado)
sudo systemctl restart vai-de-pix-backend
```

### Do Windows (via SSH)

```powershell
# Ver status
.\scripts\connect-rpi5.ps1 "cd ~/vai-de-pix && ./start-vai-de-pix.sh"

# Ver logs
.\scripts\connect-rpi5.ps1 "tail -f ~/vai-de-pix/backend/logs/*.log"

# Verificar se está rodando
.\scripts\connect-rpi5.ps1 "curl http://localhost:8000/api/health"
```

## 🐛 Troubleshooting

### Problema: Não consigo conectar via SSH

```powershell
# Verificar se o Raspberry Pi está acessível
ping 192.168.6.40

# Tentar conexão manual
ssh pi@192.168.6.40
```

**Soluções:**
- Verificar se SSH está habilitado no Raspberry Pi
- Verificar firewall
- Verificar se o IP está correto

### Problema: Deploy falha ao transferir arquivos

**Soluções:**
- Verificar espaço em disco no Raspberry Pi: `df -h`
- Verificar permissões: `ls -la ~/vai-de-pix`
- Tentar deploy manual via git clone

### Problema: Aplicação não inicia

```bash
# Verificar logs
ssh pi@192.168.6.40 "cd ~/vai-de-pix/backend && tail -f logs/*.log"

# Verificar se PostgreSQL está rodando
ssh pi@192.168.6.40 "sudo systemctl status postgresql"

# Verificar variáveis de ambiente
ssh pi@192.168.6.40 "cd ~/vai-de-pix/backend && cat .env"
```

## 📊 Monitoramento

### Verificar Status Remotamente

```powershell
# Health check
curl http://192.168.6.40:8000/api/health

# Ver processos
.\scripts\connect-rpi5.ps1 "ps aux | grep python"

# Ver uso de recursos
.\scripts\connect-rpi5.ps1 "free -h && df -h"
```

## 🔐 Segurança

### Configurar Chave SSH (Recomendado)

```powershell
# Gerar chave SSH (se ainda não tiver)
ssh-keygen -t ed25519 -C "seu-email@exemplo.com"

# Copiar chave para Raspberry Pi
ssh-copy-id pi@192.168.6.40
```

Agora você pode conectar sem senha!

## 📝 Notas

- O IP **192.168.6.40** está configurado nos scripts
- Para mudar o IP, edite `.rpi5-config` ou passe como parâmetro
- O usuário padrão é `pi` (pode ser alterado)
- O diretório padrão é `~/vai-de-pix`

---

**Última atualização**: Janeiro 2025  
**IP do Raspberry Pi**: 192.168.6.40

