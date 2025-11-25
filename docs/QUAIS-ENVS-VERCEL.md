# ✅ QUAIS VARIÁVEIS COLOCAR NO VERCEL

## 📋 LISTA COMPLETA - COPIE E COLE NO VERCEL

### 🔴 OBRIGATÓRIAS (6 variáveis)

| Variável | Valor | Ambientes |
|----------|-------|-----------|
| `DATABASE_URL` | `postgresql://postgres:OkqhtgBPqgGnlMHVmBtGhapAMNhZtWDc@tramway.proxy.rlwy.net:52632/railway` | ✅ Production, Preview, Development |
| `SECRET_KEY` | `j_vkLtaI369fMnQgjP6Qpv0G-UTJ3KJFD8KoO-Ut-1c` | ✅ Production, Preview, Development |
| `ALGORITHM` | `HS256` | ✅ Production, Preview, Development |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | ✅ Production, Preview, Development |
| `FRONTEND_URL` | `https://vai-de-ewqbjdazj-akawalles-projects.vercel.app` | ✅ Production, Preview, Development |
| `VITE_API_URL` | `https://vai-de-ewqbjdazj-akawalles-projects.vercel.app/api` | ✅ Production, Preview, Development |

**✅ URL DE PRODUÇÃO ATUAL:** `https://vai-de-ewqbjdazj-akawalles-projects.vercel.app`

---

### 🟡 OPCIONAIS MAS RECOMENDADAS (5 variáveis)

| Variável | Valor | Ambientes |
|----------|-------|-----------|
| `ENVIRONMENT` | `production` | ✅ Production |
| `LOG_LEVEL` | `INFO` | ✅ Production, Preview, Development |
| `FRONTEND_URL_PRODUCTION` | `https://vai-de-ewqbjdazj-akawalles-projects.vercel.app` | ✅ Production |
| `ENABLE_RECURRING_JOBS` | `false` | ✅ Production |
| `PYTHON_VERSION` | `3.11` | ✅ Production |

---

### 🟢 FRONTEND (3 variáveis)

| Variável | Valor | Ambientes |
|----------|-------|-----------|
| `VITE_APP_NAME` | `VAI DE PIX` | ✅ Production, Preview, Development |
| `VITE_APP_VERSION` | `1.1.1` | ✅ Production, Preview, Development |
| `VITE_DEBUG` | `false` ⚠️ | ✅ Production (use `true` apenas em Development) |

**⚠️ ATENÇÃO**: `VITE_DEBUG=false` em Production, `true` apenas em Development!

---

## ❌ NÃO COLOCAR NO VERCEL

Estas variáveis são apenas para desenvolvimento local:

- ❌ `PORT=8000` (serverless não usa porta fixa)
- ❌ `HOST=0.0.0.0` (serverless não usa host fixo)
- ❌ `DEBUG=True` (use `LOG_LEVEL=INFO` em produção)

---

## 📝 RESUMO: 14 VARIÁVEIS PARA O VERCEL

### Copie e cole estas no Vercel:

```env
# ============================================
# OBRIGATÓRIAS (6)
# ============================================
DATABASE_URL=postgresql://postgres:OkqhtgBPqgGnlMHVmBtGhapAMNhZtWDc@tramway.proxy.rlwy.net:52632/railway
SECRET_KEY=j_vkLtaI369fMnQgjP6Qpv0G-UTJ3KJFD8KoO-Ut-1c
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_URL=https://vai-de-ewqbjdazj-akawalles-projects.vercel.app
VITE_API_URL=https://vai-de-ewqbjdazj-akawalles-projects.vercel.app/api

# ============================================
# OPCIONAIS MAS RECOMENDADAS (5)
# ============================================
ENVIRONMENT=production
LOG_LEVEL=INFO
FRONTEND_URL_PRODUCTION=https://vai-de-ewqbjdazj-akawalles-projects.vercel.app
ENABLE_RECURRING_JOBS=false
PYTHON_VERSION=3.11

# ============================================
# FRONTEND (3)
# ============================================
VITE_APP_NAME=VAI DE PIX
VITE_APP_VERSION=1.1.1
VITE_DEBUG=false
```

---

## 🎯 PASSO A PASSO

1. **Acesse**: https://vercel.com/dashboard
2. **Selecione** seu projeto
3. **Vá em**: Settings → Environment Variables
4. **Para cada variável acima**:
   - Clique em **"+ Add"**
   - Cole o **Nome** da variável
   - Cole o **Valor** (use a URL de produção atual: `https://vai-de-ewqbjdazj-akawalles-projects.vercel.app`)
   - Marque os **Ambientes**: Production, Preview, Development
   - Clique em **Save**
5. **Após adicionar todas**, faça um novo deploy

---

## 🔍 URL DE PRODUÇÃO ATUAL

**✅ URL Configurada:**
- **Frontend:** `https://vai-de-ewqbjdazj-akawalles-projects.vercel.app`
- **API:** `https://vai-de-ewqbjdazj-akawalles-projects.vercel.app/api`

**Para verificar/atualizar:**
1. Dashboard Vercel → Seu Projeto
2. Vá em **Settings** → **Domains**
3. Copie a URL que aparece
4. Use essa URL em:
   - `FRONTEND_URL=https://sua-url.vercel.app`
   - `VITE_API_URL=https://sua-url.vercel.app/api`
   - `FRONTEND_URL_PRODUCTION=https://sua-url.vercel.app`

---

## ✅ CHECKLIST FINAL

- [ ] `DATABASE_URL` configurada
- [ ] `SECRET_KEY` configurada
- [ ] `ALGORITHM` configurada
- [ ] `ACCESS_TOKEN_EXPIRE_MINUTES` configurada
- [ ] `FRONTEND_URL` configurada (com URL real!)
- [ ] `VITE_API_URL` configurada (com URL real!)
- [ ] `ENVIRONMENT=production` configurada
- [ ] `LOG_LEVEL=INFO` configurada
- [ ] `VITE_APP_NAME` configurada
- [ ] `VITE_APP_VERSION` configurada
- [ ] `VITE_DEBUG=false` em Production
- [ ] Todas marcadas para Production, Preview, Development
- [ ] Novo deploy realizado

---

**Pronto!** Agora seu projeto está configurado no Vercel! 🚀

