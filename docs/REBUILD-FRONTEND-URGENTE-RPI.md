# ⚠️ REBUILD URGENTE DO FRONTEND - Corrigir localhost

Se você ainda vê erros de `localhost:8000` no console do navegador, o frontend precisa ser rebuildado.

## ✅ Solução Imediata

No Raspberry Pi, execute:

```bash
# 1. Parar servidor
pkill -f gunicorn

# 2. Ir para raiz do projeto
cd ~/vai-de-pix

# 3. Atualizar código
git pull origin raspberry-pi-5

# 4. REBUILD DO FRONTEND (IMPORTANTE!)
npm run build

# 5. Reiniciar servidor
./start-vai-de-pix.sh
```

## 🔍 Verificar se Funcionou

1. Acesse `http://192.168.10.130:8000`
2. Abra o console do navegador (F12)
3. Limpe o cache (Ctrl+Shift+R)
4. Tente criar conta
5. Verifique no console: as requisições devem ir para `192.168.10.130:8000/api/...` (NÃO localhost)

## ⚠️ Importante

- O rebuild é **obrigatório** após mudanças no código do frontend
- O código antigo fica na pasta `dist/` até fazer rebuild
- Sempre limpe o cache do navegador após rebuild

## 📝 Comandos Rápidos

```bash
cd ~/vai-de-pix
git pull origin raspberry-pi-5
npm run build
./start-vai-de-pix.sh
```

---

**Última atualização**: Janeiro 2025

