# 🚀 INSTRUÇÕES PARA SUBIR NO VERCEL DO ZERO

## ✅ REPOSITÓRIO PRONTO

- ✅ Branch `main` criada e limpa
- ✅ Estrutura perfeita na raiz
- ✅ `vercel.json` configurado
- ✅ Sem histórico antigo

---

## 📋 PASSO A PASSO - VERCEL DASHBOARD

### 1. Acessar Vercel

👉 **https://vercel.com/dashboard**

### 2. Criar Novo Projeto

1. Clique em **"+ Add New..."** (canto superior direito)
2. Selecione **"Project"**

### 3. Importar Repositório

1. Na lista de repositórios, encontre **"AkaWalle/VAI-DE-PIX"**
2. Clique em **"Import"**

### 4. Configurar Durante Importação

#### 4.1. Framework Preset
- Selecione: **"Vite"**
- Se não aparecer, selecione **"Other"**

#### 4.2. Root Directory
- **DEIXE COMPLETAMENTE VAZIO**
- Não digite nada

#### 4.3. Build and Output Settings
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

#### 4.4. Environment Variables

Clique em **"Add Environment Variable"** e adicione:

**Name:** `VITE_API_URL`  
**Value:** `https://seu-backend.up.railway.app/api`  
*(Substitua pela URL real do seu backend no Railway)*

**Environment:** Marque todas:
- ✅ Production
- ✅ Preview
- ✅ Development

#### 4.5. Git Settings

- **Production Branch:** `main`
- **Preview Branch:** `main`

#### 4.6. Deploy

1. Clique em **"Deploy"**
2. Aguarde 2-5 minutos
3. ✅ **Frontend no ar!**

---

## 🔗 COMO OBTER URL DO RAILWAY

1. Acesse: **https://railway.app**
2. Selecione seu projeto
3. Clique no serviço do **backend**
4. Vá em **"Settings"** → **"Networking"**
5. Copie a **URL pública** (formato: `https://seu-backend.up.railway.app`)
6. Adicione `/api` no final

**Exemplo:**
- URL Railway: `https://vai-de-pix-production.up.railway.app`
- URL para Vercel: `https://vai-de-pix-production.up.railway.app/api`

---

## ✅ CHECKLIST FINAL

- [ ] Projeto criado no Vercel
- [ ] Framework: **Vite**
- [ ] Root Directory: **(vazio)**
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Production Branch: `main`
- [ ] `VITE_API_URL` configurada com URL do Railway
- [ ] Deploy concluído com sucesso
- [ ] Frontend acessível

---

## 🧪 TESTAR DEPLOY

```bash
# Testar frontend
curl https://vai-de-pix.vercel.app

# Testar backend
curl https://seu-backend.up.railway.app/api/health
```

---

## 🎯 RESULTADO ESPERADO

Após seguir todos os passos:

✅ **Frontend:** `https://vai-de-pix.vercel.app`  
✅ **Backend:** `https://seu-backend.up.railway.app`  
✅ **API Health:** `https://seu-backend.up.railway.app/api/health`  
✅ **Tudo funcionando perfeitamente!**

---

**🚀 VAI DE PIX PRONTO PARA O BRASIL!**

