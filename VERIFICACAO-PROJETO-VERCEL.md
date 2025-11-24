# 🔍 Verificação Completa do Projeto no Vercel

## 📋 Checklist de Verificação

Use este checklist para verificar se tudo está configurado corretamente para o projeto funcionar no Vercel.

---

## ✅ 1. Variáveis de Ambiente no Vercel

**Acesse**: https://vercel.com/dashboard → Seu Projeto → **Settings** → **Environment Variables**

Verifique se TODAS estas variáveis estão configuradas:

### Variáveis Obrigatórias:

- [ ] **`DATABASE_URL`**
  - Valor: `postgresql://user:password@host:5432/database?sslmode=require`
  - ⚠️ Deve ser uma connection string PostgreSQL válida (não SQLite!)
  - Ambientes: ✅ Production, ✅ Preview, ✅ Development

- [ ] **`SECRET_KEY`**
  - Valor: Uma chave aleatória (ex: `openssl rand -hex 32`)
  - ⚠️ NÃO use a mesma chave de exemplo!
  - Ambientes: ✅ Production, ✅ Preview, ✅ Development

- [ ] **`ALGORITHM`**
  - Valor: `HS256`
  - Ambientes: ✅ Production, ✅ Preview, ✅ Development

- [ ] **`ACCESS_TOKEN_EXPIRE_MINUTES`**
  - Valor: `30`
  - Ambientes: ✅ Production, ✅ Preview, ✅ Development

- [ ] **`FRONTEND_URL`**
  - Valor: `https://seu-projeto.vercel.app` (substitua pela URL real!)
  - ⚠️ IMPORTANTE: Substitua `seu-projeto.vercel.app` pela URL real do seu projeto!
  - Ambientes: ✅ Production, ✅ Preview, ✅ Development

- [ ] **`VITE_API_URL`**
  - Valor: `https://seu-projeto.vercel.app/api` (substitua pela URL real!)
  - ⚠️ IMPORTANTE: Substitua `seu-projeto.vercel.app` pela URL real do seu projeto!
  - ⚠️ Deve terminar em `/api` (não `/api/api`)
  - Ambientes: ✅ Production, ✅ Preview, ✅ Development

---

## ✅ 2. Banco de Dados PostgreSQL

- [ ] **Banco PostgreSQL criado** (Neon, Vercel Postgres ou Supabase)
- [ ] **Connection string copiada** e configurada em `DATABASE_URL`
- [ ] **Migrações executadas** (tabelas criadas no banco)
  - Para executar: `alembic upgrade head` (localmente, conectando ao banco remoto)

**Como verificar se as migrações foram executadas:**
1. Acesse o dashboard do seu banco (Neon/Vercel Postgres)
2. Verifique se as tabelas existem: `users`, `transactions`, `goals`, `envelopes`, `categories`, `accounts`, etc.

---

## ✅ 3. Configuração do Vercel (Build Settings)

**Acesse**: https://vercel.com/dashboard → Seu Projeto → **Settings** → **General**

### Build & Development Settings:

- [ ] **Framework Preset**: `Vite` ou `Other` (não importa, mas deve estar configurado)
- [ ] **Root Directory**: Deve estar **vazio** (se `package.json` está na raiz)
- [ ] **Build Command**: `npm run build`
- [ ] **Output Directory**: `dist`
- [ ] **Install Command**: Deve estar **vazio** (deixar em branco para detecção automática)

---

## ✅ 4. Configuração do vercel.json

Verifique se o arquivo `vercel.json` na raiz do projeto está correto:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.py"
    },
    {
      "source": "/((?!api).*)",
      "destination": "/index.html"
    }
  ],
  "functions": {
    "api/**/*.py": {
      "runtime": "python3.9",
      "includeFiles": "backend/**"
    }
  }
}
```

---

## ✅ 5. Arquivos Necessários

Verifique se estes arquivos existem:

- [ ] `package.json` (na raiz)
- [ ] `vercel.json` (na raiz)
- [ ] `api/index.py` (handler serverless)
- [ ] `api/requirements.txt` (dependências Python)
- [ ] `backend/` (diretório com o código Python)
- [ ] `src/` (diretório com o código React)

---

## ✅ 6. Deploy e Build

- [ ] **Deploy realizado** no Vercel
- [ ] **Build bem-sucedido** (sem erros nos logs)
- [ ] **Frontend acessível** em `https://seu-projeto.vercel.app`
- [ ] **API acessível** em `https://seu-projeto.vercel.app/api`

---

## ✅ 7. Testes Pós-Deploy

Após o deploy, teste estas URLs:

- [ ] **Frontend**: `https://seu-projeto.vercel.app`
  - Deve carregar a interface React

- [ ] **API Health**: `https://seu-projeto.vercel.app/api/health`
  - Deve retornar: `{"status": "healthy", "database": "connected"}`

- [ ] **API Docs**: `https://seu-projeto.vercel.app/api/docs`
  - Deve carregar a documentação Swagger do FastAPI

- [ ] **API Root**: `https://seu-projeto.vercel.app/api`
  - Deve retornar informações da API

---

## 🔍 8. Verificação de Problemas Comuns

### Problema: "Database connection failed"

**Soluções:**
1. Verifique se `DATABASE_URL` está correta no Vercel
2. Verifique se o banco de dados está acessível
3. Verifique se as migrações foram executadas
4. Verifique se a connection string tem `?sslmode=require` no final

### Problema: "No module named 'psycopg2'"

**Solução:**
- Verifique se `psycopg2-binary==2.9.9` está em `api/requirements.txt`

### Problema: "Table does not exist"

**Solução:**
- Execute as migrações novamente:
  ```powershell
  $env:DATABASE_URL="sua-connection-string"
  cd backend
  ..\venv\Scripts\alembic.exe upgrade head
  ```

### Problema: Frontend não carrega

**Soluções:**
1. Verifique se `VITE_API_URL` está configurada no Vercel
2. Verifique se o build foi bem-sucedido
3. Verifique se `dist/` foi gerado corretamente
4. Faça um novo deploy após adicionar `VITE_API_URL`

### Problema: Erro de CORS

**Soluções:**
1. Verifique se `FRONTEND_URL` está configurada corretamente no Vercel
2. Verifique se a URL do frontend corresponde à URL real do projeto
3. Verifique se o CORS está configurado em `api/index.py`

### Problema: Build falha

**Soluções:**
1. Verifique os logs do build no Vercel
2. Verifique se `package.json` está na raiz
3. Verifique se todas as dependências estão instaladas
4. Limpe o cache do Vercel e faça um novo deploy

---

## 🚀 9. Próximos Passos Após Verificação

Se tudo estiver verificado:

1. **Faça um novo deploy** (se necessário):
   ```powershell
   git add .
   git commit -m "fix: atualizar configurações do Vercel"
   git push
   ```

2. **Aguarde o deploy** no Vercel (geralmente 1-2 minutos)

3. **Teste todas as funcionalidades**:
   - Criar conta
   - Fazer login
   - Criar transação
   - Criar meta
   - Criar envelope
   - etc.

---

## 📝 Resumo das URLs Importantes

- **Dashboard do Vercel**: https://vercel.com/dashboard
- **Environment Variables**: https://vercel.com/dashboard → Seu Projeto → Settings → Environment Variables
- **Deployments**: https://vercel.com/dashboard → Seu Projeto → Deployments
- **Logs**: https://vercel.com/dashboard → Seu Projeto → Deployments → Clique no deploy → Logs

---

## 🎉 Pronto!

Se todos os itens acima estiverem verificados, seu projeto deve estar funcionando no Vercel!

Se ainda houver problemas, verifique os logs do deploy no dashboard do Vercel para identificar o erro específico.

