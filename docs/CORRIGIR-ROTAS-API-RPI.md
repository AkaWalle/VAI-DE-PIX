# 🔧 Corrigir Rotas da API no Raspberry Pi

## 🐛 Problema

Algumas rotas da API (especialmente POST/PUT/DELETE) não funcionam porque a rota catch-all estava interceptando todas as requisições.

## ✅ Solução

A rota catch-all foi corrigida para capturar **apenas requisições GET**, permitindo que todas as requisições POST/PUT/DELETE sejam processadas pelos routers da API.

## 📋 Passos para Aplicar

No Raspberry Pi, execute:

```bash
# 1. Parar servidor
pkill -f gunicorn

# 2. Atualizar código
cd ~/vai-de-pix
git pull origin raspberry-pi-5

# 3. Reiniciar servidor
./start-vai-de-pix.sh
```

## 🧪 Testar Todas as Rotas

Após reiniciar, teste todas as rotas:

```bash
# Dar permissão de execução ao script
chmod +x scripts/test-all-routes.sh

# Executar testes
./scripts/test-all-routes.sh
```

Ou teste manualmente:

### Rotas Públicas (devem funcionar)

```bash
# API Root
curl http://192.168.10.130:8000/api

# Health Check
curl http://192.168.10.130:8000/api/health

# Registro (POST)
curl -X POST http://192.168.10.130:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"123456"}'

# Login (POST)
curl -X POST http://192.168.10.130:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vaidepix.com","password":"123456"}'
```

### Rotas Protegidas (devem retornar 401 sem token)

```bash
# Listar Transações
curl http://192.168.10.130:8000/api/transactions

# Listar Categorias
curl http://192.168.10.130:8000/api/categories

# Listar Contas
curl http://192.168.10.130:8000/api/accounts
```

## ✅ O Que Foi Corrigido

**Antes:**
- A rota catch-all usava `@app.api_route` com todos os métodos (GET, POST, PUT, DELETE, etc.)
- Isso fazia com que requisições POST/PUT/DELETE fossem interceptadas antes de chegar aos routers

**Depois:**
- A rota catch-all usa apenas `@app.get`
- Apenas requisições GET são capturadas para servir o frontend (SPA routing)
- Todas as requisições POST/PUT/DELETE são processadas pelos routers da API

## 📝 Verificar Rotas Registradas

Para ver todas as rotas registradas no servidor:

```bash
cd ~/vai-de-pix/backend
source venv/bin/activate
python -c "
from production_server import app
print('Rotas registradas:')
for route in app.routes:
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        methods = ', '.join(sorted(route.methods))
        print(f'  {methods:20} {route.path}')
"
deactivate
```

---

**Última atualização**: Janeiro 2025

