# 🔧 FIX CRÍTICO: Root Directory no Vercel Dashboard

## ⚠️ PROBLEMA

O erro `Could not read package.json` acontece porque o **Root Directory** está configurado incorretamente no dashboard do Vercel.

## ✅ SOLUÇÃO (FAZER AGORA)

### Passo 1: Acessar Dashboard Vercel

1. Acesse: **https://vercel.com/dashboard**
2. Faça login
3. Selecione o projeto **VAI-DE-PIX**

### Passo 2: Corrigir Root Directory

1. Clique em **Settings** (no menu lateral)
2. Clique em **General**
3. Role até a seção **Root Directory**
4. **VERIFIQUE O VALOR ATUAL:**
   - Se estiver **VAZIO** ou **"."** → ✅ Correto
   - Se tiver **QUALQUER VALOR** (ex: `frontend/`, `src/`, `app/`) → ❌ ERRADO

5. **SE ESTIVER ERRADO:**
   - Clique no campo **Root Directory**
   - **APAGUE TUDO** (deixe completamente vazio)
   - Clique em **Save**

### Passo 3: Verificar Outras Configurações

No mesmo painel **General**, verifique:

- ✅ **Framework Preset:** `Vite` (ou `Other`)
- ✅ **Build Command:** `npm run build`
- ✅ **Output Directory:** `dist`
- ✅ **Install Command:** `npm install`
- ✅ **Root Directory:** (vazio)

### Passo 4: Fazer Redeploy

Após corrigir:

1. Vá em **Deployments** (menu lateral)
2. Encontre o último deploy (com erro)
3. Clique nos **3 pontos** (⋯) ao lado
4. Selecione **Redeploy**
5. Aguarde o build

## 🎯 Resultado Esperado

Após corrigir, você verá:

```
✓ Cloning completed
✓ Running "install" command: npm install
✓ Installing dependencies...
✓ Running "build" command: npm run build
✓ Build completed
✓ Deploying to production
```

## 📋 Checklist

- [ ] Root Directory está **VAZIO** no dashboard
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Framework: `Vite`
- [ ] Redeploy feito
- [ ] Build passou com sucesso

## 🚨 Se Ainda Não Funcionar

### Opção 1: Deletar e Reimportar

1. **Settings** → **General** → Role até o final
2. Clique em **Delete Project**
3. Confirme
4. **"+ Add New..."** → **"Project"**
5. Selecione o repositório
6. **NÃO configure Root Directory** (deixe vazio)
7. Configure apenas:
   - Build Command: `npm run build`
   - Output Directory: `dist`
8. Clique em **Deploy**

### Opção 2: Usar Vercel CLI

```bash
# Instalar CLI
npm i -g vercel

# Login
vercel login

# Deploy (na raiz do projeto)
vercel --prod
```

---

**IMPORTANTE:** O problema está no **dashboard do Vercel**, não no código. O código está correto, mas o Vercel precisa saber que o `package.json` está na **raiz** do projeto.

