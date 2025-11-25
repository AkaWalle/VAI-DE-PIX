# 🚀 GUIA COMPLETO DE DEPLOY NO VERCEL - VAI DE PIX

## 📋 ESTRATÉGIA DE DEPLOY

O Vercel é **perfeito para o frontend React**, mas para o backend Python/FastAPI, temos 2 opções:

### ✅ OPÇÃO 1: Frontend no Vercel + Backend em Render/Railway (RECOMENDADO)
- Frontend: Vercel (100% gratuito, sempre ativo)
- Backend: Render ou Railway (gratuito/pago)

### ✅ OPÇÃO 2: Tudo no Vercel (Serverless Functions)
- Frontend: Vercel
- Backend: Vercel Serverless Functions (Python)
- ⚠️ Requer adaptação do código

**Vamos usar a OPÇÃO 1 (mais simples e recomendada)!**

---

## 🎯 PARTE 1: IMPORTAR PROJETO NO VERCEL

### Passo 1: Criar Conta no Vercel

1. Acesse: https://vercel.com
2. Clique em **"Sign Up"**
3. Escolha **"Continue with GitHub"**
4. Autorize o Vercel a acessar seus repositórios

### Passo 2: Importar Projeto

1. No dashboard do Vercel, clique em **"+ Add New..."**
2. Selecione **"Project"**
3. Na lista de repositórios, encontre **"VAI-DE-PIX"**
4. Clique em **"Import"**

### Passo 3: Configurar Projeto

O Vercel detectará automaticamente que é um projeto Vite/React. Configure:

#### **Framework Preset:**
- ✅ Deve detectar automaticamente: **"Vite"**

#### **Root Directory:**
- Deixe **vazio** (raiz do projeto)

#### **Build Command:**
```
npm run build
```

#### **Output Directory:**
```
dist
```

#### **Install Command:**
```
npm install
```

### Passo 4: Configurar Environment Variables

Antes de fazer deploy, adicione as variáveis de ambiente:

1. Na página de configuração, role até **"Environment Variables"**
2. Clique em **"+ Add"**
3. Adicione:

```env
# URL da API Backend (você configurará depois)
VITE_API_URL=https://seu-backend.onrender.com/api

# Ou se usar Railway:
VITE_API_URL=https://seu-backend.up.railway.app/api
```

**⚠️ IMPORTANTE:** No Vercel, variáveis de ambiente do Vite precisam começar com `VITE_`!

### Passo 5: Deploy

1. Clique em **"Deploy"**
2. Aguarde 1-3 minutos
3. ✅ **Frontend no ar!**

---

## 🔧 PARTE 2: CONFIGURAR BACKEND (RENDER OU RAILWAY)

### Opção A: Backend no Render (Gratuito)

#### 1. Criar PostgreSQL no Render

1. Acesse: https://render.com
2. **New** → **PostgreSQL**
3. Nome: `vai-de-pix-db`
4. Copiar **Internal Database URL**

#### 2. Criar Web Service (Backend)

1. **New** → **Web Service**
2. Conecte repositório `VAI-DE-PIX`
3. Configurações:
   - **Name**: `vai-de-pix-backend`
   - **Language**: `Python 3`
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Build Command**: 
     ```
     pip install -r requirements.txt
     ```
   - **Start Command**: 
     ```
     python production_server.py
     ```
4. **Environment Variables**:
   ```env
   DATABASE_URL=postgresql://... (do PostgreSQL)
   SECRET_KEY=sua-chave-secreta-32-caracteres
   ENVIRONMENT=production
   PORT=8000
   FRONTEND_URL=https://vai-de-pix.vercel.app
   FRONTEND_URL_PRODUCTION=https://vai-de-pix.vercel.app
   ENABLE_RECURRING_JOBS=true
   ```
5. **Create Web Service**

#### 3. Obter URL do Backend

Após deploy, copie a URL: `https://vai-de-pix-backend.onrender.com`

---

### Opção B: Backend no Railway ($5/mês)

1. Upgrade para Railway Hobby ($5/mês)
2. Siga o guia em `RAILWAY_DEPLOY_GUIDE.md`
3. Obter URL: `https://vai-de-pix.up.railway.app`

---

## 🔗 PARTE 3: CONECTAR FRONTEND E BACKEND

### Passo 1: Atualizar Variável de Ambiente no Vercel

1. No Vercel, vá em **Settings** → **Environment Variables**
2. Edite `VITE_API_URL`:
   ```
   VITE_API_URL=https://vai-de-pix-backend.onrender.com/api
   ```
   (ou URL do Railway se usar)

### Passo 2: Re-deploy

1. Vá em **Deployments**
2. Clique nos **3 pontinhos** do último deploy
3. **Redeploy**

OU

1. Faça um commit qualquer no GitHub
2. O Vercel fará deploy automático

---

## 📝 PARTE 4: CONFIGURAR CORS NO BACKEND

O backend precisa permitir requisições do Vercel:

### No Render/Railway, adicione:

```env
FRONTEND_URL=https://vai-de-pix.vercel.app
FRONTEND_URL_PRODUCTION=https://vai-de-pix.vercel.app
```

O `production_server.py` já está configurado para usar essas variáveis!

---

## ✅ PARTE 5: EXECUTAR MIGRATIONS

Após o backend estar no ar:

### No Render:
1. Vá em **Shell** do serviço
2. Execute:
```bash
cd backend
alembic upgrade head
```

### No Railway:
1. Abra **Shell** do serviço
2. Execute:
```bash
cd backend
alembic upgrade head
```

---

## 🎯 PARTE 6: VERIFICAR SE ESTÁ FUNCIONANDO

### 1. Verificar Frontend:
- Acesse: `https://vai-de-pix.vercel.app`
- Deve carregar a aplicação

### 2. Verificar Backend:
- Acesse: `https://seu-backend.onrender.com/api/health`
- Deve retornar: `{"status": "healthy"}`

### 3. Verificar Conexão:
- Abra o console do navegador (F12)
- Tente fazer login
- Verifique se as requisições vão para o backend correto

---

## 🔧 CONFIGURAÇÃO AVANÇADA

### Configurar Domínio Customizado no Vercel

1. No Vercel, vá em **Settings** → **Domains**
2. Adicione seu domínio
3. Configure DNS conforme instruções

### Configurar Domínio Customizado no Backend

1. No Render/Railway, configure domínio customizado
2. Atualize `FRONTEND_URL` e `FRONTEND_URL_PRODUCTION` no backend
3. Atualize `VITE_API_URL` no Vercel

---

## 📊 ESTRUTURA FINAL

```
┌─────────────────────────────────────┐
│   FRONTEND (Vercel)                 │
│   https://vai-de-pix.vercel.app     │
│   - React + Vite                    │
│   - 100% Gratuito                   │
│   - Sempre ativo                    │
└──────────────┬──────────────────────┘
               │
               │ API Calls
               │
┌──────────────▼──────────────────────┐
│   BACKEND (Render/Railway)          │
│   https://backend.onrender.com      │
│   - FastAPI + Python                │
│   - PostgreSQL                      │
│   - Gratuito/Pago                   │
└─────────────────────────────────────┘
```

---

## 🚨 TROUBLESHOOTING

### ❌ Erro: "CORS policy"
**Solução:**
- Verifique se `FRONTEND_URL` está configurado no backend
- Verifique se a URL do Vercel está correta

### ❌ Erro: "API not found"
**Solução:**
- Verifique se `VITE_API_URL` está configurada no Vercel
- Verifique se a URL do backend está correta
- Faça re-deploy após mudar variáveis

### ❌ Erro: "Database connection failed"
**Solução:**
- Verifique `DATABASE_URL` no backend
- Execute migrations: `alembic upgrade head`

### ❌ Frontend não carrega
**Solução:**
- Verifique logs no Vercel
- Verifique se build foi bem-sucedido
- Verifique se `dist` está sendo gerado

---

## 📋 CHECKLIST FINAL

### Frontend (Vercel):
- [ ] Projeto importado
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] `VITE_API_URL` configurada
- [ ] Deploy bem-sucedido
- [ ] Site acessível

### Backend (Render/Railway):
- [ ] PostgreSQL criado
- [ ] Web Service criado
- [ ] Language: Python 3
- [ ] Root Directory: `backend`
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy bem-sucedido
- [ ] Health check funcionando
- [ ] Migrations executadas

### Conexão:
- [ ] CORS configurado
- [ ] Frontend conectado ao backend
- [ ] Login funcionando
- [ ] API respondendo

---

## 🎉 PRONTO!

Seu VAI DE PIX está no ar com:
- ✅ Frontend no Vercel (gratuito, sempre ativo)
- ✅ Backend no Render/Railway (gratuito/pago)
- ✅ PostgreSQL configurado
- ✅ Deploy automático do GitHub

**URLs:**
- Frontend: `https://vai-de-pix.vercel.app`
- Backend: `https://seu-backend.onrender.com/api`
- Docs: `https://seu-backend.onrender.com/api/docs`

---

## 💡 DICAS PRO

1. **Deploy Automático:**
   - Push para `main` → Deploy automático no Vercel
   - Push para `main` → Deploy automático no Render/Railway

2. **Preview Deployments:**
   - Pull Requests geram previews automáticos no Vercel
   - Teste antes de fazer merge!

3. **Analytics:**
   - Vercel Analytics (gratuito) para monitorar performance
   - Ative em Settings → Analytics

4. **Performance:**
   - Vercel Edge Network (CDN global)
   - Cache automático de assets
   - Otimização automática de imagens

---

**Precisa de ajuda?** Consulte os logs no Vercel e Render para debug!

