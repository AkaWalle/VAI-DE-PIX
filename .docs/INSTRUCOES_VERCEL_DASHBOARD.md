# 📋 INSTRUÇÕES EXATAS - VERCEL DASHBOARD

## 🎯 PASSO A PASSO PARA COLAR NO DASHBOARD

### 1. Acessar Vercel
👉 **https://vercel.com/dashboard**

### 2. Criar Novo Projeto
- Clique em **"+ Add New..."** (canto superior direito)
- Selecione **"Project"**

### 3. Importar Repositório
- Na lista, encontre: **AkaWalle/VAI-DE-PIX**
- Clique em **"Import"**

### 4. Configurar Durante Importação

#### Framework Preset
- Selecione: **Vite**

#### Root Directory
- **DEIXE VAZIO** (não digite nada)

#### Build Command
- Digite: `npm run build`

#### Output Directory
- Digite: `dist`

#### Install Command
- Digite: `npm install`

#### Environment Variables
Clique em **"Add Environment Variable"** e adicione:

**Name:** `VITE_API_URL`  
**Value:** `https://seu-backend.up.railway.app/api`  
*(Substitua `seu-backend.up.railway.app` pela URL real do seu backend no Railway)*

**Environment:** Marque todas:
- ✅ Production
- ✅ Preview  
- ✅ Development

### 5. Deploy
- Clique em **"Deploy"**
- Aguarde 2-5 minutos

---

## 🔗 COMO OBTER URL DO RAILWAY

1. Acesse: **https://railway.app**
2. Selecione seu projeto
3. Clique no serviço do **backend**
4. Vá em **"Settings"** → **"Networking"**
5. Copie a **URL pública** (formato: `https://seu-backend.up.railway.app`)
6. Adicione `/api` no final para usar no Vercel

**Exemplo:**
- URL Railway: `https://vai-de-pix-production.up.railway.app`
- URL para Vercel: `https://vai-de-pix-production.up.railway.app/api`

---

## ✅ CHECKLIST

- [ ] Framework Preset: **Vite**
- [ ] Root Directory: **(vazio)**
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Install Command: `npm install`
- [ ] Environment Variable: `VITE_API_URL` configurada
- [ ] Deploy iniciado

---

**🚀 PRONTO! Aguarde o deploy concluir.**

