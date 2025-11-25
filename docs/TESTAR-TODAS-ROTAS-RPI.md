# 🧪 Testar Todas as Rotas da API no Raspberry Pi

Use estes comandos para testar cada endpoint e identificar quais não estão funcionando.

## ✅ Rotas que Devem Funcionar

### 1. Health Check
```bash
curl http://192.168.10.130:8000/api/health
```

### 2. API Root
```bash
curl http://192.168.10.130:8000/api
```

### 3. Registro (POST)
```bash
curl -X POST http://192.168.10.130:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"123456"}'
```

### 4. Login (POST)
```bash
curl -X POST http://192.168.10.130:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vaidepix.com","password":"123456"}'
```

### 5. Docs
```bash
curl http://192.168.10.130:8000/docs
```

## 🔍 Verificar Rotas Registradas

No Raspberry Pi, você pode verificar quais rotas estão registradas:

```bash
cd ~/vai-de-pix/backend
source venv/bin/activate
python -c "
from production_server import app
for route in app.routes:
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        print(f'{list(route.methods)} {route.path}')
"
```

## 🐛 Se Algumas Rotas Não Funcionarem

### Verificar Logs do Servidor

```bash
# Ver logs em tempo real
tail -f /dev/null  # Se não houver arquivo de log, ver saída do gunicorn
```

### Testar Diretamente no Servidor

```bash
# No Raspberry Pi
curl http://localhost:8000/api/auth/register -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"123456"}'
```

## 📝 Relatório de Testes

Teste cada rota e anote quais funcionam e quais não funcionam:

- [ ] `/api` - ✅ Funciona
- [ ] `/api/health` - ?
- [ ] `/api/auth/register` (POST) - ?
- [ ] `/api/auth/login` (POST) - ?
- [ ] `/api/auth/me` (GET) - ?
- [ ] `/api/transactions` (GET) - ?
- [ ] `/api/categories` (GET) - ?
- [ ] `/api/accounts` (GET) - ?

---

**Última atualização**: Janeiro 2025

