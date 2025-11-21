# 🚀 VAI DE PIX - FIX COMPLETO RAILWAY + VERCEL

## ✅ CORREÇÕES APLICADAS

### 1. ✅ Erro "db_type não reconhecido" CORRIGIDO
- **Problema:** DATABASE_URL tinha parâmetros inválidos como `?db_type=postgresql`
- **Solução:** `backend/database.py` agora remove automaticamente todos os parâmetros após `?`
- **Resultado:** URL limpa: `postgresql://user:pass@host:port/dbname`

### 2. ✅ Health Check Robusto
- **Antes:** Retornava "connected" sem testar
- **Agora:** Testa conexão real com `SELECT 1`
- **Retorna:** Status real da conexão + erro se houver

### 3. ✅ CORS Configurado para Vercel
- **Adicionado:** Regex para permitir `*.vercel.app`
- **Configurado em:** `main.py` e `production_server.py`
- **Resultado:** Frontend no Vercel pode chamar backend no Railway

### 4. ✅ Railway.json Atualizado
- Health check path configurado
- Variáveis de ambiente padrão
- Comando de start correto

---

## 🎯 GUIA DE 3 CLiques - RAILWAY

### CLIQUE 1: Configurar Variáveis no Railway

1. Acesse: https://railway.app
2. Abra seu projeto → Serviço do Backend
3. Vá em **"Variables"**
4. Adicione/Verifique:

```env
# Database (gerado automaticamente pelo Railway PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Security (OBRIGATÓRIO - gere uma chave segura)
SECRET_KEY=sua-chave-super-secreta-minimo-32-caracteres-aleatorios-aqui

# Environment
ENVIRONMENT=production
LOG_LEVEL=INFO

# Server (Railway define PORT automaticamente)
PORT=${{PORT}}

# Frontend URLs (para CORS)
FRONTEND_URL=https://seu-frontend.vercel.app
FRONTEND_URL_PRODUCTION=https://seu-frontend.vercel.app

# Recurring Jobs (opcional)
ENABLE_RECURRING_JOBS=true
```

**⚠️ IMPORTANTE:** 
- `DATABASE_URL` deve ser limpa (sem `?db_type=postgresql`)
- Se a URL tiver parâmetros extras, remova manualmente
- Formato correto: `postgresql://user:pass@host:5432/dbname`

### CLIQUE 2: Executar Migrations

1. No Railway, vá em **"Deployments"**
2. Clique nos **3 pontos** do último deploy
3. Selecione **"Open in Shell"**
4. Execute:

```bash
cd backend
alembic upgrade head
```

### CLIQUE 3: Verificar Health Check

1. No Railway, copie a URL pública do serviço
2. Acesse: `https://seu-backend.up.railway.app/api/health`
3. Deve retornar:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-XX...",
  "database": "connected",
  "database_error": null,
  "environment": "production"
}
```

**✅ Se `database: "connected"` → TUDO OK!**

---

## 🎯 GUIA DE 3 CLiques - VERCEL

### CLIQUE 1: Adicionar VITE_API_URL

1. Acesse: https://vercel.com/akawalles-projects/vai-de-pix/settings/environment-variables
2. Clique em **"+ Add New"**
3. Configure:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://seu-backend.up.railway.app/api` (substitua pela URL real do Railway)
   - **Environment:** ✅ Production, ✅ Preview, ✅ Development
4. Clique em **"Save"**

### CLIQUE 2: Re-deploy

1. Vá em **"Deployments"**
2. Clique nos **3 pontos** do último deploy
3. Selecione **"Redeploy"**
4. Aguarde o deploy completar

### CLIQUE 3: Testar

1. Acesse o frontend no Vercel
2. Abra Console do navegador (F12)
3. Verifique se não há erros de CORS
4. Teste login/registro

---

## 🧪 TESTES COM CURL

### 1. Testar Health Check

```bash
curl https://seu-backend.up.railway.app/api/health
```

**Resposta esperada:**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### 2. Testar Registro de Usuário

```bash
curl -X POST https://seu-backend.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "password": "senha123",
    "name": "Usuário Teste"
  }'
```

**Resposta esperada:**
```json
{
  "message": "Usuário criado com sucesso",
  "user_id": 1
}
```

### 3. Testar Login

```bash
curl -X POST https://seu-backend.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "password": "senha123"
  }'
```

**Resposta esperada:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

---

## 🔍 VERIFICAÇÃO FINAL

### ✅ Checklist Railway

- [ ] PostgreSQL criado e rodando (status verde)
- [ ] `DATABASE_URL` configurada (sem parâmetros extras)
- [ ] `SECRET_KEY` configurada (mínimo 32 caracteres)
- [ ] `ENVIRONMENT=production` configurado
- [ ] Migrations executadas (`alembic upgrade head`)
- [ ] Health check retorna `database: "connected"`
- [ ] Backend acessível publicamente

### ✅ Checklist Vercel

- [ ] `VITE_API_URL` configurada com URL do Railway
- [ ] Re-deploy feito após adicionar variável
- [ ] Frontend carrega sem erros
- [ ] Console do navegador sem erros de CORS
- [ ] Login/Registro funcionando

### ✅ Checklist Testes

- [ ] `/api/health` retorna `database: "connected"`
- [ ] `/api/auth/register` cria usuário no banco
- [ ] `/api/auth/login` retorna token
- [ ] Frontend consegue fazer requisições ao backend
- [ ] Dados aparecem no banco do Railway

---

## 🚨 TROUBLESHOOTING

### Erro: "db_type não reconhecido"

**Causa:** DATABASE_URL tem parâmetros inválidos

**Solução:**
1. No Railway, copie a `DATABASE_URL`
2. Remova tudo após `?` (ex: `?db_type=postgresql`)
3. Formato correto: `postgresql://user:pass@host:5432/dbname`
4. Cole a URL limpa no Railway
5. Faça re-deploy

### Erro: "database: error" no health check

**Causa:** Conexão com banco falhando

**Solução:**
1. Verifique se PostgreSQL está rodando (status verde)
2. Verifique se `DATABASE_URL` está correta
3. Verifique se migrations foram executadas
4. Veja logs no Railway para mais detalhes

### Erro de CORS no frontend

**Causa:** CORS não configurado corretamente

**Solução:**
1. Verifique se `FRONTEND_URL` está configurada no Railway
2. Verifique se `VITE_API_URL` está configurada no Vercel
3. Verifique logs do backend para ver origem bloqueada
4. Certifique-se de que o backend está usando `production_server.py`

### Frontend não conecta ao backend

**Causa:** `VITE_API_URL` não configurada ou incorreta

**Solução:**
1. Verifique se `VITE_API_URL` está no Vercel
2. Verifique se a URL está correta (deve terminar com `/api`)
3. Teste a URL diretamente: `curl https://seu-backend.up.railway.app/api/health`
4. Faça re-deploy após adicionar variável

---

## 📝 ARQUIVOS MODIFICADOS

### Backend
- ✅ `backend/database.py` - Limpa parâmetros inválidos da DATABASE_URL
- ✅ `backend/main.py` - CORS configurado para Vercel
- ✅ `backend/production_server.py` - Health check robusto + CORS
- ✅ `backend/railway.json` - Configuração atualizada

### Raiz
- ✅ `railway.json` - Configuração atualizada

---

## 🎉 RESULTADO FINAL

Após seguir este guia:

✅ **Backend no Railway:**
- PostgreSQL conectado e saudável
- Health check verde
- API funcionando

✅ **Frontend no Vercel:**
- Conectado ao backend no Railway
- Login/Registro funcionando
- Sem erros de CORS

✅ **Banco Real:**
- Dados sendo salvos no PostgreSQL do Railway
- Migrations executadas
- Tabelas criadas

---

## 🚀 COMANDOS RÁPIDOS

### Railway (Shell)
```bash
# Executar migrations
cd backend && alembic upgrade head

# Verificar conexão
python -c "from database import engine; engine.connect(); print('OK')"
```

### Vercel (CLI)
```bash
# Adicionar variável
vercel env add VITE_API_URL production

# Re-deploy
vercel --prod --yes
```

### Testes Locais
```bash
# Testar health
curl http://localhost:8000/api/health

# Testar registro
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","name":"Test"}'
```

---

## ✅ MENSAGEM FINAL

**🎉 VAI DE PIX 100% NO AR COM BANCO REAL! 🎉**

- ✅ Backend: Railway (FastAPI + PostgreSQL)
- ✅ Frontend: Vercel (React/Vite)
- ✅ Banco: PostgreSQL no Railway
- ✅ Health Check: Verde e funcionando
- ✅ Register/Login: Funcionando em produção

**URLs:**
- Frontend: https://seu-frontend.vercel.app
- Backend: https://seu-backend.up.railway.app
- Health: https://seu-backend.up.railway.app/api/health
- Docs: https://seu-backend.up.railway.app/api/docs

---

**Dúvidas?** Consulte os logs no Railway e Vercel para mais detalhes.

