# 🔧 FIX: Erro "Could not read package.json" no Vercel

## ❌ Erro Atual

```
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/vercel/path0/package.json'
```

## 🔍 Causa

O Vercel está procurando o `package.json` no caminho errado. Isso acontece quando:
- **Root Directory** está configurado incorretamente no dashboard
- O projeto está na raiz mas o Vercel está olhando em subpasta

## ✅ SOLUÇÃO RÁPIDA

### 1. Verificar Root Directory no Vercel Dashboard

1. Acesse: **https://vercel.com/dashboard**
2. Selecione o projeto **VAI-DE-PIX**
3. Vá em **Settings** → **General**
4. Role até **Root Directory**
5. **DEVE ESTAR VAZIO** ou **"."** (ponto)
6. Se estiver com qualquer valor (ex: `frontend/`, `src/`, etc.), **APAGUE** e deixe vazio
7. Clique em **Save**

### 2. Verificar Configuração do Projeto

No mesmo painel **Settings** → **General**, verifique:

- **Framework Preset:** `Vite` (ou `Other`)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`
- **Root Directory:** (vazio)

### 3. Fazer Novo Deploy

Após corrigir, faça um novo deploy:

**Opção A: Via Dashboard**
1. Vá em **Deployments**
2. Clique nos **3 pontos** do último deploy
3. Selecione **Redeploy**

**Opção B: Via Git Push**
```bash
# Fazer um commit vazio para trigger novo deploy
git commit --allow-empty -m "fix: trigger redeploy Vercel"
git push origin feature/chat-ia
```

## 🔍 Verificar Estrutura do Projeto

O Vercel espera encontrar na raiz:

```
VAI-DE-PIX-main/
├── package.json          ✅ DEVE ESTAR AQUI
├── package-lock.json     ✅
├── vite.config.ts        ✅
├── index.html            ✅
├── vercel.json           ✅
└── src/                  ✅
```

## 📋 Checklist de Verificação

- [ ] Root Directory está vazio no dashboard Vercel
- [ ] `package.json` está na raiz do projeto
- [ ] `vercel.json` está na raiz
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Framework: `Vite` detectado

## 🚀 Se Ainda Não Funcionar

### Opção 1: Deletar e Reimportar Projeto

1. No Vercel Dashboard, vá em **Settings** → **General**
2. Role até o final e clique em **Delete Project**
3. Confirme a deleção
4. Clique em **"+ Add New..."** → **"Project"**
5. Selecione o repositório novamente
6. **NÃO configure Root Directory** (deixe vazio)
7. Configure apenas:
   - Build Command: `npm run build`
   - Output Directory: `dist`
8. Clique em **Deploy**

### Opção 2: Usar Vercel CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (na raiz do projeto)
vercel --prod
```

## ✅ Resultado Esperado

Após corrigir, o build deve funcionar:

```
✓ Cloning completed
✓ Running "install" command: npm install
✓ Running "build" command: npm run build
✓ Build completed
✓ Deploying to production
```

---

**Última atualização:** 2025-01-27

