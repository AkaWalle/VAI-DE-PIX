# 🚀 DEPLOY VAI DE PIX NO VERCEL - GUIA COMPLETO

## ✅ ARQUIVOS CRIADOS

Todos os arquivos necessários foram criados:
- ✅ `api/index.py` - Serverless Function adapter
- ✅ `requirements.txt` - Dependências Python
- ✅ `vercel.json` - Configuração do Vercel
- ✅ `.vercelignore` - Arquivos ignorados

---

## 📋 PASSO A PASSO DETALHADO

### PASSO 1: COMMIT E PUSH DAS MUDANÇAS

```bash
git add .
git commit -m "feat: configurar deploy no Vercel com FastAPI serverless"
git push origin main
```

---

### PASSO 2: IMPORTAR PROJETO NO VERCEL

1. **Acesse:** https://vercel.com
2. **Login** com GitHub
3. Clique em **"+ Add New..."** → **"Project"**
4. Na lista, encontre **"AkaWalle / VAI-DE-PIX"**
5. Clique em **"Import"**

---

### PASSO 3: CONFIGURAR PROJETO

O Vercel detectará automaticamente. **VERIFIQUE:**

#### **Framework Preset:**
- ✅ Deve mostrar: **"Vite"** (detectado automaticamente)

#### **Root Directory:**
- ✅ Deixe **VAZIO** (não preencher nada)

#### **Build Command:**
- ✅ Deve mostrar: `npm run build`

#### **Output Directory:**
- ✅ Deve mostrar: `dist`

#### **Install Command:**
- ✅ Deve mostrar: `npm install`

**✅ Deixe tudo como está detectado!**

---

### PASSO 4: CONFIGURAR VARIÁVEIS DE AMBIENTE

**ANTES de clicar em "Deploy":**

1. Role até **"Environment Variables"**
2. Clique em **"+ Add"**
3. Adicione **TODAS** estas variáveis:

#### **Variáveis Obrigatórias:**

```env
# Database (use PostgreSQL externo - Railway, Supabase, Neon, etc.)
DATABASE_URL=postgresql://user:password@host:5432/database

# Security (GERAR COM: python -c "import secrets; print(secrets.token_urlsafe(32))")
SECRET_KEY=sua-chave-super-secreta-minimo-32-caracteres-aqui

# Environment
ENVIRONMENT=production
LOG_LEVEL=INFO

# Server
PORT=8000
HOST=0.0.0.0

# Frontend URL (será gerado pelo Vercel - você atualizará depois)
FRONTEND_URL=https://vai-de-pix.vercel.app
FRONTEND_URL_PRODUCTION=https://vai-de-pix.vercel.app

# Enable Recurring Jobs
ENABLE_RECURRING_JOBS=false

# Python
PYTHON_VERSION=3.9
```

#### **Como Adicionar:**

1. **Nome:** `DATABASE_URL`
2. **Valor:** Cole sua URL do PostgreSQL
3. **Environment:** Selecione todas (Production, Preview, Development)
4. Clique em **"Add"**
5. Repita para cada variável

**⚠️ IMPORTANTE:**
- `SECRET_KEY` deve ser gerada (não use a do exemplo!)
- `DATABASE_URL` deve ser de um PostgreSQL externo (Railway, Supabase, Neon)
- `FRONTEND_URL` você atualizará depois com a URL real do Vercel

---

### PASSO 5: FAZER DEPLOY

1. Clique em **"Deploy"**
2. ⏳ Aguarde 2-5 minutos
3. ✅ **Projeto no ar!**

Você verá uma URL tipo: `https://vai-de-pix-xxxxx.vercel.app`

---

### PASSO 6: ATUALIZAR FRONTEND_URL

Após o deploy:

1. No Vercel, vá em **Settings** → **Environment Variables**
2. Edite `FRONTEND_URL` e `FRONTEND_URL_PRODUCTION`:
   - Use a URL real: `https://vai-de-pix-xxxxx.vercel.app`
3. Salve
4. Vá em **Deployments** → **Redeploy** (último deploy)

---

### PASSO 7: EXECUTAR MIGRATIONS

O Vercel não permite shell direto, então você precisa:

#### **Opção A: Via Script Local (Recomendado)**

1. Configure `DATABASE_URL` localmente (mesma do Vercel)
2. Execute:
```bash
cd backend
alembic upgrade head
```

#### **Opção B: Via API de Migrations (Criar endpoint)**

Ou crie um endpoint temporário no backend para executar migrations via API.

---

## 🔍 VERIFICAR SE ESTÁ FUNCIONANDO

### 1. Verificar Frontend:
- Acesse: `https://vai-de-pix-xxxxx.vercel.app`
- Deve carregar a aplicação React

### 2. Verificar Backend API:
- Acesse: `https://vai-de-pix-xxxxx.vercel.app/api/health`
- Deve retornar: `{"status": "healthy", ...}`

### 3. Verificar API Docs:
- Acesse: `https://vai-de-pix-xxxxx.vercel.app/api/docs`
- Deve mostrar Swagger UI

### 4. Testar Funcionalidades:
- Login/Registro
- Criar transação
- Dashboard
- Todas as funcionalidades

---

## 🗄️ CONFIGURAR POSTGRESQL EXTERNO

O Vercel não fornece PostgreSQL, então você precisa de um externo:

### Opção 1: Railway (Recomendado)
1. Acesse: https://railway.app
2. **New Project** → **Database** → **PostgreSQL**
3. Copie **DATABASE_URL**
4. Cole no Vercel como variável de ambiente

### Opção 2: Supabase (Gratuito)
1. Acesse: https://supabase.com
2. **New Project**
3. Vá em **Settings** → **Database**
4. Copie **Connection String**
5. Cole no Vercel

### Opção 3: Neon (Gratuito)
1. Acesse: https://neon.tech
2. **Create Project**
3. Copie **Connection String**
4. Cole no Vercel

---

## 🚨 TROUBLESHOOTING

### ❌ Erro: "Could not resolve entry module index.html"
**Solução:**
- Verifique se **Root Directory** está vazio no Vercel
- Verifique se `index.html` está na raiz do projeto

### ❌ Erro: "Module not found"
**Solução:**
- Verifique se `requirements.txt` está na raiz
- Verifique se todas as dependências estão listadas

### ❌ Erro: "Database connection failed"
**Solução:**
- Verifique se `DATABASE_URL` está configurada
- Verifique se o PostgreSQL está acessível
- Execute migrations: `alembic upgrade head`

### ❌ Erro: "CORS policy"
**Solução:**
- Verifique se `FRONTEND_URL` está correto
- Faça re-deploy após atualizar variáveis

### ❌ API não responde
**Solução:**
- Verifique logs no Vercel (Deployments → Logs)
- Verifique se `api/index.py` está correto
- Verifique se `vercel.json` está configurado

---

## 📊 ESTRUTURA FINAL

```
vai-de-pix.vercel.app
├── / (Frontend React)
├── /api/* (Backend FastAPI via Serverless Functions)
└── /api/docs (Swagger UI)
```

---

## ✅ CHECKLIST FINAL

### Antes do Deploy:
- [ ] Commit e push das mudanças
- [ ] Projeto importado no Vercel
- [ ] Root Directory vazio
- [ ] Variáveis de ambiente configuradas
- [ ] PostgreSQL externo configurado

### Após o Deploy:
- [ ] Frontend carrega
- [ ] `/api/health` responde
- [ ] `/api/docs` funciona
- [ ] Login funciona
- [ ] Todas as funcionalidades testadas

---

## 🎉 PRONTO!

Seu VAI DE PIX está no ar no Vercel! 🚀

**URLs:**
- Frontend: `https://vai-de-pix-xxxxx.vercel.app`
- API: `https://vai-de-pix-xxxxx.vercel.app/api`
- Docs: `https://vai-de-pix-xxxxx.vercel.app/api/docs`

**Próximos passos:**
1. Configurar domínio customizado (opcional)
2. Executar migrations
3. Testar todas as funcionalidades
4. Monitorar logs e performance

---

## 💡 DICAS PRO

1. **Deploy Automático:**
   - Push para `main` → Deploy automático
   - Pull Requests → Preview deployments

2. **Performance:**
   - Vercel Edge Network (CDN global)
   - Cache automático
   - Otimização automática

3. **Monitoramento:**
   - Vercel Analytics (gratuito)
   - Logs em tempo real
   - Métricas de performance

---

**Dúvidas?** Consulte os logs no Vercel para debug!

