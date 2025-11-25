# 🔍 Verificar Rotas Registradas no Raspberry Pi

## 🐛 Problema

A rota `/api/auth/register` retorna "API endpoint not found", mesmo que outras rotas funcionem.

## ✅ Verificação Passo a Passo

### 1. Verificar se o código foi atualizado

```bash
cd ~/vai-de-pix
git log --oneline -5
```

Você deve ver o commit `fix: corrige rota catch-all para não interceptar requisições POST/PUT/DELETE da API`.

### 2. Verificar se o servidor está usando o código correto

```bash
# Parar servidor
pkill -f gunicorn

# Verificar se parou
ps aux | grep gunicorn
```

### 3. Atualizar código e reiniciar

```bash
cd ~/vai-de-pix
git pull origin raspberry-pi-5

# Verificar se production_server.py tem a correção
grep -A 5 "@app.get(\"/{full_path:path}\")" backend/production_server.py
```

Deve mostrar:
```python
@app.get("/{full_path:path}")
async def serve_spa(full_path: str, request: Request):
```

**NÃO deve mostrar** `@app.api_route` com múltiplos métodos.

### 4. Verificar rotas registradas

```bash
cd ~/vai-de-pix/backend
source venv/bin/activate

python -c "
from production_server import app
print('=' * 60)
print('Rotas registradas na aplicação:')
print('=' * 60)
routes = []
for route in app.routes:
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        methods = ', '.join(sorted(route.methods))
        routes.append((methods, route.path))
routes.sort(key=lambda x: x[1])
for methods, path in routes:
    print(f'{methods:25} {path}')
print('=' * 60)
print(f'Total: {len(routes)} rotas')
"

deactivate
```

Você deve ver:
- `POST                    /api/auth/register`
- `POST                    /api/auth/login`
- `GET                     /api/auth/me`
- E outras rotas...

### 5. Testar diretamente no servidor (localhost)

```bash
# No Raspberry Pi, testar localhost
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"123456"}'
```

Se funcionar em localhost mas não na rede, pode ser problema de CORS ou firewall.

### 6. Verificar logs do servidor

```bash
# Iniciar servidor em foreground para ver logs
cd ~/vai-de-pix
./start-vai-de-pix.sh
```

Em outro terminal, fazer a requisição e ver os logs.

### 7. Reiniciar servidor corretamente

```bash
# Parar tudo
pkill -f gunicorn
sleep 2

# Verificar se parou
ps aux | grep gunicorn

# Iniciar novamente
cd ~/vai-de-pix
./start-vai-de-pix.sh
```

## 🧪 Teste Completo

Após reiniciar, teste todas as rotas:

```bash
# 1. API Root (deve funcionar)
curl http://192.168.10.130:8000/api

# 2. Health (deve funcionar)
curl http://192.168.10.130:8000/api/health

# 3. Register (deve funcionar agora)
curl -X POST http://192.168.10.130:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test'$(date +%s)'@test.com","password":"123456"}'

# 4. Login (deve funcionar)
curl -X POST http://192.168.10.130:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vaidepix.com","password":"123456"}'
```

## ⚠️ Erro Comum: JSON Malformado

Se você ver erro `422 Unprocessable Entity` com `"Expecting ',' delimiter"`, o JSON está malformado.

**❌ ERRADO:**
```json
{"email":"admin@vaidepix.com" "password":"123456"}
```

**✅ CORRETO:**
```json
{"email":"admin@vaidepix.com","password":"123456"}
```

Note a **vírgula** entre os campos!

## 📝 Checklist

- [ ] Código atualizado (`git pull`)
- [ ] Servidor parado (`pkill -f gunicorn`)
- [ ] Rotas verificadas (script acima)
- [ ] Servidor reiniciado (`./start-vai-de-pix.sh`)
- [ ] Teste em localhost funcionando
- [ ] Teste na rede funcionando
- [ ] JSON bem formatado nas requisições

---

**Última atualização**: Janeiro 2025

