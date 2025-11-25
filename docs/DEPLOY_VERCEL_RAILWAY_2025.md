# 🚀 DEPLOY PERFEITO VERCEL + RAILWAY 2025

## ✅ CONFIGURAÇÃO COMPLETA

### 📋 Estrutura do Projeto
- **Frontend:** Vite/React/TypeScript na raiz
- **Backend:** FastAPI/Python em `/backend`
- **Banco:** PostgreSQL no Railway
- **Deploy Frontend:** Vercel
- **Deploy Backend:** Railway

---

## 🎯 PASSO A PASSO - DEPLOY NO VERCEL

### 1. Acessar Vercel Dashboard

👉 **https://vercel.com/dashboard**

### 2. Criar Novo Projeto

1. Clique em **"+ Add New..."** (canto superior direito)
2. Selecione **"Project"**

### 3. Importar Repositório

1. Na lista de repositórios, encontre **"AkaWalle/VAI-DE-PIX"**
2. Clique em **"Import"**

### 4. Configurar Durante Importação

**IMPORTANTE:** Configure TUDO durante a importação:

#### 4.1. Framework Preset
- Clique no dropdown **"Framework Preset"**
- Selecione **"Vite"** (NÃO "Other", NÃO "React")
- Se não aparecer "Vite", selecione **"Other"** e configure manualmente

#### 4.2. Root Directory
- **DEIXE COMPLETAMENTE VAZIO**
- Não digite nada
- Não coloque "."

#### 4.3. Build and Output Settings
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

#### 4.4. Environment Variables

Clique em **"Add Environment Variable"** e adicione:

**Variável 1:**
- **Name:** `VITE_API_URL`
- **Value:** `https://seu-backend.up.railway.app/api` ← **SUBSTITUA pela URL real do Railway**
- **Environment:** ✅ Production, ✅ Preview, ✅ Development

**Exemplo de URL Railway:**
```
https://vai-de-pix-production.up.railway.app/api
```

**Como obter a URL do Railway:**
1. Acesse: https://railway.app
2. Selecione seu projeto
3. Clique no serviço do backend
4. Vá em **"Settings"** → **"Networking"**
5. Copie a URL pública (formato: `https://seu-backend.up.railway.app`)
6. Adicione `/api` no final

#### 4.5. Deploy

1. Clique em **"Deploy"**
2. Aguarde 2-5 minutos
3. ✅ **Frontend no ar!**

---

## 🔧 CONFIGURAÇÃO DO RAILWAY (Backend)

### 1. Verificar Variáveis de Ambiente

No Railway, no serviço do backend, verifique:

#### Variáveis Obrigatórias:

```env
# Database (já configurado)
DATABASE_URL=postgresql://postgres:OkqhtgBPqgGnlMHVmBtGhapAMNhZtWDc@tramway.proxy.rlwy.net:52632/railway

# Security
SECRET_KEY=sua-chave-super-secreta-minimo-32-caracteres
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=production
LOG_LEVEL=INFO

# Server
PORT=8000
HOST=0.0.0.0

# Frontend URL (URL do Vercel após deploy)
FRONTEND_URL=https://vai-de-pix.vercel.app
FRONTEND_URL_PRODUCTION=https://vai-de-pix.vercel.app

# CORS (já configurado no código)
# O backend já permite *.vercel.app automaticamente
```

### 2. Verificar CORS

O backend já está configurado para permitir:
- ✅ Qualquer subdomínio `.vercel.app` (regex: `https://.*\.vercel\.app`)
- ✅ `localhost:3000`, `localhost:5000` (para testes)
- ✅ URL configurada em `FRONTEND_URL`

**Não precisa fazer nada adicional!** O código já está correto.

---

## 🧪 TESTE PÓS-DEPLOY

### 1. Testar Frontend

```bash
# Substitua pela URL real do Vercel
curl https://vai-de-pix.vercel.app
```

**Resultado esperado:**
- Status: `200 OK`
- HTML da aplicação React

### 2. Testar API Health

```bash
# Substitua pela URL real do Railway
curl https://seu-backend.up.railway.app/api/health
```

**Resultado esperado:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T...",
  "database": "connected",
  "environment": "production"
}
```

### 3. Testar no Browser

1. Acesse: `https://vai-de-pix.vercel.app`
2. Abra Console (F12)
3. Verifique:
   - ✅ Sem erros de CORS
   - ✅ Sem erros de conexão
   - ✅ API respondendo

### 4. Testar Login/Registro

1. Tente fazer registro
2. Tente fazer login
3. Verifique se funciona

---

## 📋 CHECKLIST FINAL

### Vercel
- [ ] Projeto criado
- [ ] Framework: `Vite`
- [ ] Root Directory: (vazio)
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] `VITE_API_URL` configurada com URL do Railway
- [ ] Deploy concluído com sucesso
- [ ] Frontend acessível

### Railway
- [ ] Backend rodando
- [ ] `DATABASE_URL` configurada
- [ ] `ENVIRONMENT=production`
- [ ] `FRONTEND_URL` apontando para Vercel
- [ ] CORS permitindo `.vercel.app`
- [ ] API `/api/health` respondendo

### Testes
- [ ] Frontend carrega
- [ ] API health check funciona
- [ ] Sem erros de CORS
- [ ] Login/registro funcionam

---

## 🎉 RESULTADO ESPERADO

Após seguir todos os passos:

✅ **Frontend:** `https://vai-de-pix.vercel.app`  
✅ **Backend:** `https://seu-backend.up.railway.app`  
✅ **API Health:** `https://seu-backend.up.railway.app/api/health`  
✅ **Tudo funcionando perfeitamente!**

---

**🚀 VAI DE PIX PRONTO PARA O BRASIL!**

