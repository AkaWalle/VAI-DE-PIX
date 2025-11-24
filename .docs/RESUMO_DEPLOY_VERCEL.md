# ⚡ RESUMO RÁPIDO - DEPLOY NO VERCEL

## ✅ ARQUIVOS CRIADOS

1. ✅ `api/index.py` - Serverless Function adapter (FastAPI → Vercel)
2. ✅ `requirements.txt` - Dependências Python na raiz
3. ✅ `vercel.json` - Configuração completa do Vercel
4. ✅ `.vercelignore` - Arquivos ignorados

---

## 🚀 5 MINUTOS PARA DEPLOY

### 1. COMMIT (30 segundos)
```bash
git add .
git commit -m "feat: deploy Vercel"
git push origin main
```

### 2. IMPORTAR NO VERCEL (1 minuto)
1. https://vercel.com → Login GitHub
2. "+ Add New" → "Project"
3. Selecionar "VAI-DE-PIX"
4. "Import"

### 3. CONFIGURAR VARIÁVEIS (2 minutos)
Adicionar em **Environment Variables**:

```env
DATABASE_URL=postgresql://... (do Railway/Supabase/Neon)
SECRET_KEY=gerar-com-python (32+ caracteres)
ENVIRONMENT=production
FRONTEND_URL=https://vai-de-pix.vercel.app (atualizar depois)
```

### 4. DEPLOY (1 minuto)
1. Clicar "Deploy"
2. Aguardar 2-5 minutos
3. ✅ **PRONTO!**

---

## 🔗 LINK FINAL

Após deploy, você terá:
- **Frontend:** `https://vai-de-pix-xxxxx.vercel.app`
- **API:** `https://vai-de-pix-xxxxx.vercel.app/api`
- **Docs:** `https://vai-de-pix-xxxxx.vercel.app/api/docs`

---

## ⚠️ IMPORTANTE

1. **PostgreSQL Externo:** Vercel não fornece DB. Use:
   - Railway (gratuito)
   - Supabase (gratuito)
   - Neon (gratuito)

2. **Migrations:** Execute localmente:
   ```bash
   cd backend
   alembic upgrade head
   ```

3. **Scheduler:** Desabilitado no serverless (normal)

---

## 📋 CHECKLIST

- [ ] Commit e push
- [ ] Importar no Vercel
- [ ] Variáveis configuradas
- [ ] PostgreSQL externo configurado
- [ ] Deploy feito
- [ ] Testar `/api/health`
- [ ] Testar frontend

---

**Guia completo:** Veja `DEPLOY_VERCEL_AGORA.md`

