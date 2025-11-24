# ✅ FIX VERCEL DEPLOY - MONOREPO 2025

## 🔧 Problema Resolvido
- ❌ Erro: `ENOENT: no such file or directory, open '/vercel/path0/package.json'`
- ✅ Solução: `vercel.json` configurado corretamente para monorepo

## 📋 Estrutura do Projeto
```
/
├── package.json          ← Frontend (React/Vite) na raiz
├── vite.config.ts        ← Config do Vite na raiz
├── index.html            ← HTML na raiz
├── src/                  ← Código fonte do frontend
├── dist/                 ← Build output (gerado)
├── api/
│   ├── index.py          ← Serverless Function (FastAPI)
│   └── requirements.txt  ← Dependências Python
├── backend/              ← Código do backend Python
└── vercel.json           ← Configuração Vercel ✅
```

## 🚀 Configuração Aplicada

### vercel.json
- ✅ Build do frontend na raiz (`npm run build`)
- ✅ Output: `dist/` (Vite padrão)
- ✅ Serverless Function: `api/index.py` (detectado automaticamente)
- ✅ Routes: `/api/*` → serverless, resto → frontend

## 📝 AÇÃO NECESSÁRIA NO DASHBOARD VERCEL

**IMPORTANTE:** Verifique o Root Directory no dashboard:

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **General**
4. Verifique **Root Directory**
5. **DEVE ESTAR VAZIO ou "." (raiz)**
6. Se estiver configurado para uma subpasta (ex: `frontend/`), **REMOVA** ou deixe vazio

## 🎯 Comandos para Deploy

```bash
# 1. Commit das mudanças
git add vercel.json
git commit -m "fix: configuração Vercel para monorepo 2025"

# 2. Push para trigger deploy
git push origin main
```

## ✅ O que foi corrigido

1. **vercel.json atualizado** com configuração 2025:
   - Build do frontend na raiz
   - Routes corretas para API e frontend
   - Headers de cache otimizados

2. **Estrutura verificada**:
   - ✅ `package.json` na raiz
   - ✅ `vite.config.ts` na raiz
   - ✅ `api/index.py` configurado
   - ✅ `backend/` acessível pela serverless function

## 🔍 Verificação Pós-Deploy

Após o deploy, verifique:
- ✅ Frontend carrega em `/`
- ✅ API responde em `/api/health` ou `/api/docs`
- ✅ Sem erros de `package.json` no build

## 📚 Referências

- Vercel Monorepo: https://vercel.com/docs/monorepos
- Vercel Serverless Functions: https://vercel.com/docs/functions
- Vite + Vercel: https://vercel.com/docs/frameworks/vite

