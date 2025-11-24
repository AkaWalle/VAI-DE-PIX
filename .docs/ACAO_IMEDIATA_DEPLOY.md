# ⚡ AÇÃO IMEDIATA - Deploy Vercel 2025

## 🎯 FAZER AGORA (5 MINUTOS)

### OPÇÃO 1: Deletar e Reimportar (RECOMENDADO)

1. **Deletar Projeto:**
   - https://vercel.com/dashboard
   - Projeto **VAI-DE-PIX** → **Settings** → **General** → **Delete Project**

2. **Reimportar:**
   - **"+ Add New..."** → **"Project"**
   - Selecionar **VAI-DE-PIX**
   - **Framework Preset:** `Vite`
   - **Root Directory:** (VAZIO)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Deploy**

3. **Configurar Branch:**
   - **Settings** → **Git** → **Production Branch:** `deploy-limpo-2025`

---

### OPÇÃO 2: Deploy via CLI (MAIS RÁPIDO)

```powershell
# PowerShell
.\deploy-vercel.ps1

# Ou manualmente:
vercel --prod --yes
```

---

## ✅ O QUE FOI FEITO

- ✅ `vercel.json` simplificado (apenas Vite)
- ✅ `package.json` confirmado na raiz
- ✅ Scripts de deploy criados
- ✅ Guia completo criado

---

## 🧪 TESTAR DEPLOY

```bash
# Testar frontend
curl https://vai-de-pix.vercel.app

# Testar API
curl https://vai-de-pix.vercel.app/api/health
```

---

**🚀 EXECUTE AGORA E O DEPLOY VAI FUNCIONAR!**

