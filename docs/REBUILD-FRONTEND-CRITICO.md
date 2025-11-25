# ⚠️ CRÍTICO: Rebuild do Frontend Necessário

Se você ainda vê `localhost:8000` nas requisições, o frontend **NÃO foi rebuildado**.

## 🚨 Problema

O código foi atualizado para detectar automaticamente o IP, mas o frontend buildado (pasta `dist/`) ainda contém o código antigo que usa `localhost`.

## ✅ Solução OBRIGATÓRIA

No Raspberry Pi, execute **TODOS** estes comandos:

```bash
# 1. Parar servidor
pkill -f gunicorn

# 2. Ir para raiz do projeto
cd ~/vai-de-pix

# 3. Atualizar código
git pull origin raspberry-pi-5

# 4. REBUILD DO FRONTEND (OBRIGATÓRIO - SEM ISSO NÃO FUNCIONA!)
npm run build

# 5. Executar migrações (para corrigir updated_at)
cd backend
source venv/bin/activate
alembic upgrade head
deactivate
cd ..

# 6. Reiniciar servidor
./start-vai-de-pix.sh
```

## 🔍 Como Verificar se Funcionou

1. Após o rebuild, acesse `http://192.168.10.130:8000`
2. Abra o console do navegador (F12)
3. **Limpe o cache** (Ctrl+Shift+R ou Ctrl+F5) - MUITO IMPORTANTE!
4. Tente criar conta
5. No console, verifique as requisições:
   - ✅ **Correto**: `http://192.168.10.130:8000/api/auth/register`
   - ❌ **Errado**: `http://localhost:8000/api/auth/register`

## ⚠️ Importante

- **SEMPRE** faça `npm run build` após atualizar código do frontend
- **SEMPRE** limpe o cache do navegador após rebuild
- O código antigo fica na pasta `dist/` até fazer rebuild

## 📝 Comandos Completos (Copiar e Colar)

```bash
pkill -f gunicorn
cd ~/vai-de-pix
git pull origin raspberry-pi-5
npm run build
cd backend
source venv/bin/activate
alembic upgrade head
deactivate
cd ..
./start-vai-de-pix.sh
```

---

**Última atualização**: Janeiro 2025

