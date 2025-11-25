# ✅ Verificar se API está Funcionando no Raspberry Pi

## 🧪 Testes Rápidos

### 1. Health Check (deve funcionar)

```bash
curl http://localhost:8000/api/health
```

**Resposta esperada:**
```json
{"status":"healthy","timestamp":"...","database":"connected"}
```

### 2. API Root

```bash
curl http://localhost:8000/api
```

**Resposta esperada:**
```json
{"message":"VAI DE PIX API","version":"1.0.0","status":"running","docs":"/docs"}
```

### 3. Testar Registro (POST)

```bash
curl -v -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"123456"}'
```

O `-v` mostra detalhes da requisição e resposta.

## 🌐 Testar pela Rede

```bash
# Substitua pelo IP do seu Raspberry Pi
curl http://192.168.10.130:8000/api/health
```

## 📊 Verificar Rotas Disponíveis

Abra no navegador:
```
http://192.168.10.130:8000/docs
```

Isso mostra todas as rotas da API disponíveis.

## 🔍 Verificar se Servidor Está Rodando

```bash
# Ver processos
ps aux | grep gunicorn

# Ver porta
sudo netstat -tulpn | grep 8000
# OU
sudo ss -tulpn | grep 8000
```

## 🐛 Se os Testes Falharem

### Verificar Logs do Gunicorn

Os logs aparecem diretamente no terminal onde você executou `./start-vai-de-pix.sh`.

### Verificar Erros

```bash
# Ver últimos logs do sistema
journalctl -u postgresql -n 20

# Verificar se há erros no Python
cd ~/vai-de-pix/backend
source venv/bin/activate
python -c "from production_server import app; print('OK')"
```

## ✅ Checklist

- [ ] Servidor está rodando (`ps aux | grep gunicorn`)
- [ ] Porta 8000 está aberta (`netstat -tulpn | grep 8000`)
- [ ] Health check responde (`curl http://localhost:8000/api/health`)
- [ ] Frontend carrega (`http://192.168.10.130:8000`)
- [ ] API Docs acessível (`http://192.168.10.130:8000/docs`)

---

**Última atualização**: Janeiro 2025

