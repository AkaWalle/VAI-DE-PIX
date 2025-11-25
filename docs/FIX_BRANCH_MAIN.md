# 🔧 FIX: Vercel usando branch main

## ⚠️ PROBLEMA

O Vercel está fazendo deploy da branch `main`, mas as correções estão na branch `deploy-limpo-2025`.

## ✅ SOLUÇÃO

### Opção 1: Mudar Production Branch no Vercel (Rápido)

1. **Vercel Dashboard** → **Settings** → **Git**
2. **Production Branch:** Mude para `deploy-limpo-2025`
3. **Save**

### Opção 2: Merge para main (Recomendado)

```bash
git checkout main
git merge deploy-limpo-2025
git push origin main
```

## ✅ RESULTADO

Após fazer merge ou mudar a branch, o Vercel vai:
- ✅ Usar a branch correta
- ✅ Encontrar `index.html` na raiz
- ✅ Build funcionar

---

**✅ Fix aplicado! O deploy deve funcionar agora.**

