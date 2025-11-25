# 🧪 Testar API no Raspberry Pi

Guia para testar se a API está funcionando corretamente.

## ✅ Testes Básicos

### 1. Health Check

```bash
curl http://localhost:8000/api/health
```

**Resposta esperada:**
```json
{"status":"healthy","timestamp":"2025-11-25T14:21:42.123456","database":"connected"}
```

### 2. API Root

```bash
curl http://localhost:8000/api
```

**Resposta esperada:**
```json
{"message":"VAI DE PIX API","version":"1.0.0","status":"running","docs":"/docs"}
```

### 3. Testar Registro

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"123456"}'
```

**Resposta esperada (sucesso):**
```json
{"id":"...","name":"Test User","email":"test@example.com","is_active":true}
```

**Resposta esperada (erro - email já existe):**
```json
{"detail":"Email já está em uso"}
```

## 🌐 Testar pela Rede

Substitua `localhost` pelo IP do Raspberry Pi:

```bash
# Health check
curl http://192.168.10.130:8000/api/health

# Registro
curl -X POST http://192.168.10.130:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"123456"}'
```

## 🔍 Verificar Rotas Disponíveis

```bash
# Ver documentação da API
curl http://localhost:8000/docs

# OU abrir no navegador
# http://192.168.10.130:8000/docs
```

## 🐛 Troubleshooting

### Problema: Connection refused

```bash
# Verificar se o servidor está rodando
ps aux | grep gunicorn

# Verificar se a porta está aberta
sudo netstat -tulpn | grep 8000
```

### Problema: 404 Not Found

```bash
# Verificar logs do servidor
tail -f backend/logs/*.log

# OU ver logs do gunicorn
journalctl -u vai-de-pix-backend -n 50
```

### Problema: CORS Error

Verifique se o CORS está configurado corretamente no `production_server.py`.

---

**Última atualização**: Janeiro 2025

