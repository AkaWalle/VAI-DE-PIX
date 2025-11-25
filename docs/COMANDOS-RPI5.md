# 🍓 Comandos para Executar no Raspberry Pi 5

## 📥 Clonar o Repositório

No terminal do Raspberry Pi, execute:

```bash
# Clonar o repositório (com a branch raspberry-pi-5)
git clone -b raspberry-pi-5 https://github.com/AkaWalle/VAI-DE-PIX.git vai-de-pix

# OU se já clonou, fazer checkout:
cd vai-de-pix
git fetch origin
git checkout -b raspberry-pi-5 origin/raspberry-pi-5
```

## ⚙️ Executar Setup

```bash
# Dar permissão de execução ao script
chmod +x scripts/setup-raspberry-pi.sh

# Executar o setup
./scripts/setup-raspberry-pi.sh
```

## 🚀 Iniciar Aplicação

Após o setup, execute:

```bash
# Iniciar o Vai de Pix
./start-vai-de-pix.sh
```

## 🔍 Verificar Status

```bash
# Verificar se o backend está rodando
curl http://localhost:8000/api/health

# Ver processos Python
ps aux | grep python

# Ver logs
tail -f backend/logs/*.log
```

## 📝 Comandos Completos (Copiar e Colar)

```bash
# 1. Clonar e configurar (método recomendado - clona direto na branch)
git clone -b raspberry-pi-5 https://github.com/AkaWalle/VAI-DE-PIX.git vai-de-pix
cd vai-de-pix

# OU se já clonou na branch main:
# git fetch origin
# git checkout -b raspberry-pi-5 origin/raspberry-pi-5

# 2. Executar setup
chmod +x scripts/setup-raspberry-pi.sh
./scripts/setup-raspberry-pi.sh

# 3. Iniciar aplicação
./start-vai-de-pix.sh
```

---

**Repositório**: https://github.com/AkaWalle/VAI-DE-PIX.git  
**Branch**: `raspberry-pi-5`

