# 🔧 CORREÇÃO: Branch no Vercel

## ⚠️ PROBLEMA IDENTIFICADO

O erro persiste mesmo com Root Directory vazio porque:

**O Vercel está fazendo deploy da branch `feature/chat-ia`, mas pode estar configurado para usar `main` como Production Branch.**

## ✅ SOLUÇÃO IMEDIATA

### Opção 1: Mudar Production Branch (Rápido)

1. **Vercel Dashboard** → **Settings** → **Git**
2. Role até **"Production Branch"**
3. Mude de `main` para `feature/chat-ia` (temporariamente)
4. Salve
5. Faça **Redeploy**

### Opção 2: Merge para Main (Recomendado)

```bash
# 1. Mudar para main
git checkout main

# 2. Fazer merge
git merge feature/chat-ia

# 3. Push para main (dispara deploy automático)
git push origin main
```

## 🎯 Por Que Isso Resolve?

O Vercel pode estar:
- Usando cache de build antigo da branch `main`
- Não detectando mudanças na branch `feature/chat-ia`
- Configurado para fazer deploy apenas de `main`

## 📋 Checklist

- [ ] Verificar qual branch está configurada em **Settings** → **Git** → **Production Branch**
- [ ] Se for `main`, mudar para `feature/chat-ia` OU fazer merge
- [ ] Fazer redeploy após mudar branch
- [ ] Verificar logs do build para confirmar branch correta

---

**Ação recomendada:** Fazer merge para `main` e fazer deploy de lá (mais seguro para produção).

