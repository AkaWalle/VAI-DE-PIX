# 🔗 CONECTAR RAILWAY (PostgreSQL) + VERCEL

## 📋 PASSO A PASSO

### 1. COPIAR DATABASE_URL DO RAILWAY

No Railway, você tem duas opções de URL:

#### Opção A: DATABASE_URL (Recomendada)
- Esta é a URL interna (mais rápida)
- Formato: `postgresql://user:password@host:5432/database`

#### Opção B: DATABASE_PUBLIC_URL
- Esta é a URL pública (acessível de fora)
- Use esta se a interna não funcionar

**Como copiar:**
1. No Railway, clique na variável `DATABASE_URL`
2. Clique no ícone de **copiar** (ou nos 3 pontinhos → View)
3. Copie a URL completa

---

### 2. ADICIONAR NO VERCEL

#### Via CLI (Rápido):
```bash
vercel env add DATABASE_URL production
```
Cole a URL quando solicitado.

#### Via Dashboard:
1. Acesse: https://vercel.com/akawalles-projects/vai-de-pix/settings/environment-variables
2. Clique em **"+ Add New"**
3. **Name:** `DATABASE_URL`
4. **Value:** Cole a URL do Railway
5. **Environment:** Production
6. Salve

---

### 3. RE-DEPLOY

Após adicionar a variável:

```bash
vercel --prod --yes
```

---

### 4. TESTAR CONEXÃO

Acesse:
- Health: https://vai-de-p5vjqn39j-akawalles-projects.vercel.app/api/health
- Deve retornar: `{"status": "healthy", "database": "connected"}`

---

## ✅ CHECKLIST

- [ ] Copiar DATABASE_URL do Railway
- [ ] Adicionar no Vercel
- [ ] Re-deploy feito
- [ ] Health check funcionando
- [ ] Testar login/registro

---

## 🚨 TROUBLESHOOTING

### Se DATABASE_URL não funcionar:
- Tente `DATABASE_PUBLIC_URL` do Railway
- Verifique se o PostgreSQL está rodando
- Verifique firewall/whitelist no Railway

### Se conexão falhar:
- Verifique se a URL está correta
- Verifique se há espaços extras
- Tente usar `DATABASE_PUBLIC_URL` em vez de `DATABASE_URL`

