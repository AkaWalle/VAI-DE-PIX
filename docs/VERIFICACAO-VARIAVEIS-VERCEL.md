# 🔍 Verificação de Variáveis de Ambiente no Vercel

## 📋 Checklist Completo

**Acesse**: https://vercel.com/dashboard → Seu Projeto → **Settings** → **Environment Variables**

---

## ✅ Variáveis Obrigatórias para o Backend (API)

### 1. **DATABASE_URL** ⚠️ CRÍTICA

- **Valor**: Connection string PostgreSQL completa
- **Formato**: `postgresql://user:password@host:5432/database?sslmode=require`
- **Onde obter**:
  - **Neon**: Dashboard → Connection String
  - **Railway**: Database → Connect → PostgreSQL URL
  - **Supabase**: Settings → Database → Connection String
  - **Vercel Postgres**: Storage → Database → Connection String
- **Ambientes**: ✅ Production, ✅ Preview, ✅ Development
- **⚠️ IMPORTANTE**: Deve ser PostgreSQL, não SQLite!

### 2. **SECRET_KEY** ⚠️ CRÍTICA

- **Valor**: Chave secreta aleatória (mínimo 32 caracteres)
- **Como gerar**:
  ```bash
  # Linux/Mac
  openssl rand -hex 32
  
  # Python
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  
  # PowerShell
  -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
  ```
- **Exemplo**: `zv28_yc2D57bWjWBR3zZUW5tK60Os-HgGzHhrtquHSI`
- **⚠️ IMPORTANTE**: NÃO use a chave de exemplo! Gere uma nova!
- **Ambientes**: ✅ Production, ✅ Preview, ✅ Development

### 3. **ALGORITHM**

- **Valor**: `HS256`
- **Ambientes**: ✅ Production, ✅ Preview, ✅ Development

### 4. **ACCESS_TOKEN_EXPIRE_MINUTES**

- **Valor**: `30`
- **Ambientes**: ✅ Production, ✅ Preview, ✅ Development

### 5. **FRONTEND_URL** ⚠️ IMPORTANTE

- **Valor**: URL completa do seu frontend no Vercel
- **Formato**: `https://seu-projeto.vercel.app`
- **⚠️ IMPORTANTE**: Substitua `seu-projeto` pela URL real do seu projeto!
- **Como descobrir**: Dashboard Vercel → Seu Projeto → Domains
- **Ambientes**: ✅ Production, ✅ Preview, ✅ Development

---

## ✅ Variáveis Obrigatórias para o Frontend

### 6. **VITE_API_URL** ⚠️ CRÍTICA

- **Valor**: URL da API (pode ser a mesma do Vercel ou externa)
- **Formato**: `https://seu-projeto.vercel.app/api`
- **⚠️ IMPORTANTE**: 
  - Deve terminar em `/api` (não `/api/api`)
  - Se o backend está no Vercel: `https://seu-projeto.vercel.app/api`
  - Se o backend está no Railway: `https://seu-backend.up.railway.app/api`
- **Ambientes**: ✅ Production, ✅ Preview, ✅ Development

---

## ✅ Variáveis Opcionais (mas recomendadas)

### 7. **ENVIRONMENT**

- **Valor**: `production`
- **Ambientes**: ✅ Production

### 8. **LOG_LEVEL**

- **Valor**: `INFO` ou `DEBUG`
- **Ambientes**: ✅ Production, ✅ Preview, ✅ Development

### 9. **PORT**

- **Valor**: `8000`
- **Nota**: Geralmente não necessário no Vercel (serverless)
- **Ambientes**: ✅ Production (opcional)

### 10. **HOST**

- **Valor**: `0.0.0.0`
- **Nota**: Geralmente não necessário no Vercel (serverless)
- **Ambientes**: ✅ Production (opcional)

### 11. **ENABLE_RECURRING_JOBS**

- **Valor**: `false`
- **Motivo**: Schedulers não funcionam bem em serverless
- **Ambientes**: ✅ Production

### 12. **PYTHON_VERSION**

- **Valor**: `3.9` ou `3.11`
- **Ambientes**: ✅ Production (opcional)

---

## 📝 Resumo Rápido

### Mínimo Necessário (5 variáveis):

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
SECRET_KEY=sua-chave-secreta-aleatoria-32-caracteres
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_URL=https://seu-projeto.vercel.app
VITE_API_URL=https://seu-projeto.vercel.app/api
```

### Configuração Completa Recomendada:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Security
SECRET_KEY=sua-chave-secreta-aleatoria-32-caracteres
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=production
LOG_LEVEL=INFO

# URLs
FRONTEND_URL=https://seu-projeto.vercel.app
VITE_API_URL=https://seu-projeto.vercel.app/api

# Serverless
ENABLE_RECURRING_JOBS=false
PYTHON_VERSION=3.11
```

---

## 🔍 Como Verificar no Vercel

1. **Acesse**: https://vercel.com/dashboard
2. **Selecione** seu projeto
3. **Vá em**: Settings → Environment Variables
4. **Verifique** se todas as variáveis acima estão configuradas
5. **Confirme** que estão marcadas para os ambientes corretos:
   - ✅ Production
   - ✅ Preview (opcional, mas recomendado)
   - ✅ Development (opcional)

---

## ⚠️ Problemas Comuns

### "Database connection failed"

**Soluções:**
1. Verifique se `DATABASE_URL` está correta
2. Verifique se termina com `?sslmode=require`
3. Teste a connection string localmente
4. Verifique se o banco está acessível

### "Invalid SECRET_KEY"

**Soluções:**
1. Gere uma nova chave com o comando acima
2. Certifique-se de que tem pelo menos 32 caracteres
3. Não use caracteres especiais problemáticos

### "CORS error"

**Soluções:**
1. Verifique se `FRONTEND_URL` está correta
2. Deve ser exatamente a URL do seu projeto no Vercel
3. Não inclua `/` no final

### "API not found" ou "404"

**Soluções:**
1. Verifique se `VITE_API_URL` termina em `/api`
2. Verifique se o backend está deployado
3. Teste a URL diretamente no navegador

---

## 🚀 Após Configurar

1. **Salve** todas as variáveis no Vercel
2. **Faça um novo deploy**:
   - Vá em Deployments → Clique nos 3 pontos → Redeploy
   - Ou faça um novo commit e push
3. **Aguarde** o deploy completar (1-3 minutos)
4. **Teste** a aplicação

---

## 📞 Próximos Passos

Após verificar todas as variáveis:

1. ✅ Verifique se o banco de dados está configurado
2. ✅ Execute as migrações (se necessário)
3. ✅ Teste o deploy
4. ✅ Verifique os logs do Vercel

---

**Última atualização**: 2025-01-24

