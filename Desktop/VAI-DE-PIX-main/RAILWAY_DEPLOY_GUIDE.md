# 🚂 GUIA COMPLETO DE DEPLOY NO RAILWAY - VAI DE PIX

## ✅ STATUS: PROJETO 100% PRONTO PARA RAILWAY

Seu projeto já está **totalmente configurado** para deploy no Railway! 🎉

## 📋 O QUE JÁ ESTÁ PRONTO

✅ **Dockerfile otimizado** (`backend/Dockerfile`)
- Multi-stage build
- Usuário não-root
- Health check configurado
- Imagem leve (~200MB)

✅ **railway.json** configurado
- Build com Dockerfile
- Comando de start correto
- Health check path

✅ **production_server.py** pronto
- Serve API + Frontend
- CORS configurado
- Logging estruturado

✅ **CI/CD configurado** (deploy automático)

## 🚀 PASSO A PASSO PARA DEPLOY

### 1. Criar Conta no Railway

1. Acesse: https://railway.app
2. Faça login com GitHub
3. Aceite os termos

### 2. Criar Novo Projeto

1. Clique em **"New Project"**
2. Selecione **"Deploy from GitHub repo"**
3. Escolha o repositório `VAI-DE-PIX`
4. Selecione a branch `main` (ou `feature/chat-ia`)

### 3. Configurar Banco de Dados PostgreSQL

1. No projeto Railway, clique em **"+ New"**
2. Selecione **"Database"** → **"PostgreSQL"**
3. Railway criará automaticamente:
   - Variável `DATABASE_URL` (conexão automática)
   - Banco de dados PostgreSQL 15

### 4. Configurar Variáveis de Ambiente

No serviço do backend, vá em **"Variables"** e adicione:

#### 🔐 OBRIGATÓRIAS:
```env
# Database (gerado automaticamente pelo Railway PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Security
SECRET_KEY=sua-chave-super-secreta-minimo-32-caracteres-aleatorios-aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=production
LOG_LEVEL=INFO

# Server
PORT=8000
HOST=0.0.0.0

# Frontend URL (substitua pelo domínio do Railway)
FRONTEND_URL=https://seu-projeto.up.railway.app
FRONTEND_URL_PRODUCTION=https://seu-projeto.up.railway.app

# Redis (opcional - para cache e jobs)
REDIS_URL=redis://default:senha@redis:6379/0

# Enable Recurring Jobs
ENABLE_RECURRING_JOBS=true
```

#### 🔑 GERAR SECRET_KEY SEGURO:
```bash
# No terminal:
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 5. Configurar Build Settings

O Railway detectará automaticamente o `railway.json`, mas você pode verificar:

1. Vá em **"Settings"** → **"Build & Deploy"**
2. Verifique:
   - **Root Directory**: `/backend` (ou deixe vazio se railway.json está na raiz)
   - **Build Command**: (vazio - usa Dockerfile)
   - **Start Command**: `python production_server.py`

### 6. Executar Migrations

Após o primeiro deploy, execute as migrations:

1. No Railway, vá em **"Deployments"**
2. Clique nos **3 pontos** do último deploy
3. Selecione **"Open in Shell"**
4. Execute:
```bash
cd backend
alembic upgrade head
```

**OU** adicione no `railway.json`:
```json
{
  "deploy": {
    "startCommand": "alembic upgrade head && python production_server.py"
  }
}
```

### 7. Verificar Deploy

1. Aguarde o build completar (2-5 minutos)
2. Railway gerará um domínio: `seu-projeto.up.railway.app`
3. Acesse: `https://seu-projeto.up.railway.app/api/health`
4. Deve retornar: `{"status": "healthy", ...}`

### 8. Configurar Domínio Customizado (Opcional)

1. Vá em **"Settings"** → **"Networking"**
2. Clique em **"Generate Domain"** ou adicione domínio customizado
3. Configure DNS apontando para o Railway

## 🔧 TROUBLESHOOTING

### ❌ Erro: "Database connection failed"
**Solução:**
- Verifique se `DATABASE_URL` está configurada
- Verifique se o serviço PostgreSQL está rodando
- Execute migrations: `alembic upgrade head`

### ❌ Erro: "Port already in use"
**Solução:**
- Railway usa a variável `PORT` automaticamente
- Não precisa configurar porta manualmente

### ❌ Erro: "Module not found"
**Solução:**
- Verifique se `requirements.txt` está completo
- Verifique se o Dockerfile copia todos os arquivos

### ❌ Frontend não carrega
**Solução:**
- Verifique se o build do frontend foi executado
- Adicione script de build no CI/CD ou Railway:
```json
{
  "build": {
    "buildCommand": "cd frontend && npm install && npm run build"
  }
}
```

## 📊 MONITORAMENTO

### Logs em Tempo Real
1. No Railway, vá em **"Deployments"**
2. Clique no deploy ativo
3. Veja logs em tempo real

### Métricas
- CPU, RAM, Network
- Requests por segundo
- Tempo de resposta

## 🚀 DEPLOY AUTOMÁTICO (CI/CD)

Seu CI/CD já está configurado! Após configurar secrets no GitHub:

1. **GitHub Secrets necessários:**
   - `RAILWAY_TOKEN` - Token do Railway CLI
   - `RAILWAY_SERVICE_ID` - ID do serviço no Railway
   - `RAILWAY_DOMAIN` - Domínio do projeto

2. **Obter Railway Token:**
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Gerar token
railway token
```

3. **Obter Service ID:**
   - No Railway, vá em **"Settings"** → **"General"**
   - Copie o **Service ID**

4. **Push para main:**
```bash
git push origin main
```

O CI/CD fará deploy automático! 🎉

## 💰 CUSTOS

**Railway Free Tier:**
- $5 créditos grátis/mês
- ~500 horas de runtime
- PostgreSQL incluído
- Domínio `.railway.app` grátis

**Para produção:**
- Hobby: $5/mês
- Pro: $20/mês

## ✅ CHECKLIST FINAL

- [ ] Conta Railway criada
- [ ] Projeto criado e conectado ao GitHub
- [ ] PostgreSQL adicionado
- [ ] Variáveis de ambiente configuradas
- [ ] SECRET_KEY gerada e configurada
- [ ] Migrations executadas
- [ ] Deploy bem-sucedido
- [ ] Health check retornando 200
- [ ] Frontend acessível
- [ ] API funcionando (`/api/docs`)

## 🎉 PRONTO!

Seu VAI DE PIX está no ar! 🚀

**URLs importantes:**
- Frontend: `https://seu-projeto.up.railway.app`
- API: `https://seu-projeto.up.railway.app/api`
- Docs: `https://seu-projeto.up.railway.app/api/docs`
- Health: `https://seu-projeto.up.railway.app/api/health`

---

**Dúvidas?** Consulte: https://docs.railway.app

