# 🔗 ADICIONAR DATABASE_URL NO VERCEL

## ✅ Variáveis já configuradas:
- ✅ SECRET_KEY
- ✅ ENVIRONMENT
- ✅ LOG_LEVEL
- ✅ FRONTEND_URL
- ✅ FRONTEND_URL_PRODUCTION
- ✅ ENABLE_RECURRING_JOBS

## ⚠️ FALTA: DATABASE_URL

### Opção 1: Via CLI (Recomendado)

```bash
vercel env add DATABASE_URL production
```

Quando solicitado, cole a URL do PostgreSQL:
- Railway: `postgresql://user:pass@host:5432/db`
- Supabase: `postgresql://user:pass@host:5432/db`
- Neon: `postgresql://user:pass@host:5432/db`

### Opção 2: Via Dashboard

1. Acesse: https://vercel.com/akawalles-projects/vai-de-pix/settings/environment-variables
2. Clique em **"+ Add New"**
3. **Name:** `DATABASE_URL`
4. **Value:** Cole sua URL do PostgreSQL
5. **Environment:** Production
6. Salve

### Opção 3: Criar PostgreSQL Agora

#### Railway (Gratuito):
1. https://railway.app
2. New Project → Database → PostgreSQL
3. Copiar Internal Database URL

#### Supabase (Gratuito):
1. https://supabase.com
2. New Project
3. Settings → Database → Connection String

#### Neon (Gratuito):
1. https://neon.tech
2. Create Project
3. Copiar Connection String

---

## 🚀 Após adicionar DATABASE_URL:

```bash
vercel --prod --yes
```

---

## ✅ Pronto!

Após adicionar DATABASE_URL e fazer re-deploy, seu app estará 100% funcional!

