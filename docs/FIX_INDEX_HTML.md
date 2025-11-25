# 🔧 FIX: Erro "Could not resolve entry module index.html"

## ❌ ERRO

```
error during build:
Could not resolve entry module "index.html".
```

## 🔍 CAUSA

O Vite não está encontrando o arquivo `index.html` na raiz do projeto durante o build no Vercel.

## ✅ SOLUÇÃO

### 1. Verificar se index.html está na raiz

```bash
# Deve retornar True
Test-Path "index.html"
```

### 2. Verificar se está commitado

```bash
# Deve mostrar index.html
git ls-files | grep "^index.html$"
```

### 3. Se não estiver commitado

```bash
git add index.html
git commit -m "fix: garantir que index.html esteja commitado na raiz"
git push origin main
```

### 4. Verificar vite.config.ts

O `vite.config.ts` deve ter:

```typescript
export default defineConfig({
  root: path.resolve(__dirname), // Deve apontar para a raiz
  // ...
})
```

## 📋 CHECKLIST

- [ ] `index.html` está na raiz do projeto
- [ ] `index.html` está commitado no git
- [ ] `vite.config.ts` aponta para a raiz
- [ ] Build local funciona: `npm run build`

## 🎯 RESULTADO ESPERADO

Após corrigir, o build deve funcionar:

```
✓ 2638 modules transformed.
✓ built in 16.31s
✓ Build completed
```

---

**✅ Fix aplicado! O deploy deve funcionar agora.**

