# 🔄 Reiniciar Servidor no Raspberry Pi

## ✅ Rota Confirmada

A rota `/api/auth/register` está registrada corretamente! O problema é que o servidor precisa ser reiniciado para aplicar a correção.

## 📋 Passos para Reiniciar

```bash
# 1. Parar servidor atual
pkill -f gunicorn

# 2. Aguardar alguns segundos
sleep 3

# 3. Verificar se parou completamente
ps aux | grep gunicorn
# Não deve mostrar nenhum processo gunicorn

# 4. Atualizar código (se ainda não atualizou)
cd ~/vai-de-pix
git pull origin raspberry-pi-5

# 5. Reiniciar servidor
./start-vai-de-pix.sh
```

## 🧪 Testar Após Reiniciar

Aguarde alguns segundos para o servidor iniciar completamente, depois teste:

```bash
# Teste 1: API Root
curl http://192.168.10.130:8000/api

# Teste 2: Health Check
curl http://192.168.10.130:8000/api/health

# Teste 3: Register (POST) - Deve funcionar agora!
curl -X POST http://192.168.10.130:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test'$(date +%s)'@test.com","password":"123456"}'

# Teste 4: Login (POST)
curl -X POST http://192.168.10.130:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vaidepix.com","password":"123456"}'
```

## 🔍 Verificar se Servidor Está Rodando

```bash
# Ver processos gunicorn
ps aux | grep gunicorn

# Ver porta 8000
netstat -tuln | grep 8000
# ou
ss -tuln | grep 8000
```

## ⚠️ Se Ainda Não Funcionar

1. **Verificar logs do servidor:**
   ```bash
   # Se o servidor está rodando em background, verificar logs
   # Ou iniciar em foreground para ver logs:
   cd ~/vai-de-pix/backend
   source venv/bin/activate
   gunicorn production_server:app -c gunicorn_config.rpi5.py
   ```

2. **Verificar se a correção está no arquivo:**
   ```bash
   grep -A 2 "@app.get(\"/{full_path:path}\")" ~/vai-de-pix/backend/production_server.py
   ```
   
   Deve mostrar:
   ```python
   @app.get("/{full_path:path}")
   async def serve_spa(full_path: str, request: Request):
   ```

3. **Testar diretamente no servidor (localhost):**
   ```bash
   curl -X POST http://localhost:8000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","email":"test@test.com","password":"123456"}'
   ```

---

**Última atualização**: Janeiro 2025

