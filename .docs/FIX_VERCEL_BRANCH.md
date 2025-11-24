# 🔧 FIX: Vercel usando branch errada

## ⚠️ PROBLEMA

O Vercel está fazendo deploy da branch `main`, mas o repositório usa `master` como branch principal.

**Erro:** `Could not resolve entry module "index.html"`

## ✅ SOLUÇÃO

### Opção 1: Mudar Production Branch no Vercel (RECOMENDADO)

1. **Vercel Dashboard** → **Settings** → **Git**
2. **Production Branch:** Mude de `main` para `master` (ou `deploy-limpo-2025`)
3. **Save**
4. Aguarde novo deploy automático

### Opção 2: Criar branch main (Alternativa)

```bash
git checkout -b main
git push origin main
```

Depois configure Vercel para usar `main`.

## ✅ RESULTADO ESPERADO

Após corrigir a branch, o Vercel vai:
- ✅ Usar a branch correta
- ✅ Encontrar `index.html` na raiz
- ✅ Build funcionar: `✓ built in 16.31s`

---

**✅ Ação necessária: Mudar Production Branch no Vercel Dashboard!**

