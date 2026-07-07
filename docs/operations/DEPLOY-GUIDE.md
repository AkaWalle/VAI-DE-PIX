# Guia de Deploy - VAI DE PIX

**Versão:** 1.0  
**Data:** 07/07/2026  
**Público:** DevOps, SRE, Desenvolvedores

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Ambientes](#ambientes)
3. [Deploy Backend](#deploy-backend)
4. [Deploy Frontend](#deploy-frontend)
5. [Variáveis de Ambiente](#variáveis-de-ambiente)
6. [Database Migrations](#database-migrations)
7. [Rollback](#rollback)
8. [Monitoramento](#monitoramento)
9. [Troubleshooting](#troubleshooting)

---

## 🔧 Pré-requisitos

### Software Necessário

| Tool | Versão Mínima | Instalação |
|------|---------------|------------|
| Python | 3.11+ | `apt install python3.11` |
| Node.js | 18+ | `nvm install 18` |
| PostgreSQL | 14+ | `apt install postgresql-14` |
| Redis | 6+ | `apt install redis-server` |
| nginx | 1.18+ | `apt install nginx` |

### Acessos Necessários

- ✅ SSH ao servidor de produção
- ✅ Acesso ao banco PostgreSQL
- ✅ Credenciais AWS/Vercel (para deploy automatizado)
- ✅ Secrets no repositório GitHub
- ✅ Permissões no domínio (DNS)

---

## 🌍 Ambientes

### Development
- **URL:** http://localhost:5000 (frontend) / http://localhost:8000 (backend)
- **Database:** Local PostgreSQL
- **Secrets:** `.env.local` e `backend/.env`
- **Logging:** Console colorido

### Staging
- **URL:** https://staging.vaidepix.com
- **Database:** Neon PostgreSQL (staging)
- **Secrets:** GitHub Secrets (prefixo `STAGING_`)
- **Logging:** JSON estruturado

### Production
- **URL:** https://vaidepix.com
- **Database:** Neon PostgreSQL (production)
- **Secrets:** GitHub Secrets (prefixo `PROD_`)
- **Logging:** JSON estruturado + Sentry

---

## 🚀 Deploy Backend

### Método 1: Deploy Manual (SSH)

```bash
# 1. SSH no servidor
ssh deploy@api.vaidepix.com

# 2. Navegar ao diretório do app
cd /var/www/vai-de-pix/backend

# 3. Pull das mudanças
git pull origin main

# 4. Ativar virtual environment
source venv/bin/activate

# 5. Instalar/atualizar dependências
pip install -r requirements.txt

# 6. Rodar migrations
alembic upgrade head

# 7. Restart do serviço
sudo systemctl restart vai-de-pix-api

# 8. Verificar status
sudo systemctl status vai-de-pix-api
curl https://api.vaidepix.com/health
```

### Método 2: Deploy via CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Run tests
        run: |
          cd backend
          pip install -r requirements.txt
          pytest tests/
      
      - name: Deploy to production
        env:
          SSH_KEY: ${{ secrets.DEPLOY_SSH_KEY }}
        run: |
          eval $(ssh-agent -s)
          ssh-add <(echo "$SSH_KEY")
          ssh deploy@api.vaidepix.com 'bash /var/www/scripts/deploy-backend.sh'
```

### Método 3: Deploy Docker

```bash
# 1. Build da imagem
docker build -t vai-de-pix-backend:latest -f backend/Dockerfile .

# 2. Tag para registry
docker tag vai-de-pix-backend:latest registry.vaidepix.com/backend:latest

# 3. Push para registry
docker push registry.vaidepix.com/backend:latest

# 4. Deploy no servidor
ssh deploy@api.vaidepix.com
docker pull registry.vaidepix.com/backend:latest
docker-compose up -d backend

# 5. Verificar
docker-compose logs -f backend
curl https://api.vaidepix.com/health
```

---

## 🎨 Deploy Frontend

### Método 1: Vercel (Recomendado)

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Link ao projeto
vercel link

# 4. Deploy para produção
vercel --prod

# Output:
# ✅ Production: https://vaidepix.com [1m 23s]
```

### Método 2: Build Manual + nginx

```bash
# 1. Build do frontend
npm run build

# 2. Upload para servidor
scp -r dist/* deploy@web.vaidepix.com:/var/www/vai-de-pix/

# 3. Reload nginx
ssh deploy@web.vaidepix.com 'sudo systemctl reload nginx'

# 4. Verificar
curl https://vaidepix.com
```

### Método 3: GitHub Actions

```yaml
# .github/workflows/deploy-frontend.yml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'package.json'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install and Build
        run: |
          npm ci
          npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 🔐 Variáveis de Ambiente

### Backend (`backend/.env`)

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/vai_de_pix

# Security
SECRET_KEY=<min 32 chars, use: openssl rand -hex 32>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=production  # production | staging | development
FRONTEND_URL=https://vaidepix.com

# Features
ENABLE_STRUCTURED_LOGS=1
SENTRY_DSN=https://...@sentry.io/...

# Optional
REDIS_URL=redis://localhost:6379
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@vaidepix.com
SMTP_PASSWORD=<app password>
```

### Frontend (`.env.local`)

```bash
# API
VITE_API_URL=https://api.vaidepix.com/api

# Features
VITE_SENTRY_DSN=https://...@sentry.io/...

# Analytics (opcional)
VITE_GA_ID=G-XXXXXXXXXX
```

### Secrets no GitHub

```bash
# Adicionar secrets
gh secret set PROD_DATABASE_URL -b "postgresql://..."
gh secret set PROD_SECRET_KEY -b "..."
gh secret set DEPLOY_SSH_KEY < ~/.ssh/deploy_key
gh secret set VERCEL_TOKEN -b "..."
```

---

## 🗃️ Database Migrations

### Criar Migration

```bash
cd backend

# Auto-gerar migration (detect changes)
alembic revision --autogenerate -m "add_user_avatar_column"

# Migration manual
alembic revision -m "custom_migration"
```

### Aplicar Migrations

```bash
# Ver migrations pendentes
alembic current
alembic heads

# Aplicar todas
alembic upgrade head

# Aplicar específica
alembic upgrade +1  # próxima
alembic upgrade abc123  # específica

# Rollback
alembic downgrade -1  # anterior
alembic downgrade base  # todas
```

### Migrations em Produção

```bash
# 1. Backup do banco
pg_dump vai_de_pix > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Aplicar migration
alembic upgrade head

# 3. Verificar
psql vai_de_pix -c "\d"  # Listar tabelas
psql vai_de_pix -c "SELECT version_num FROM alembic_version;"

# 4. Se falhar, rollback
alembic downgrade -1
psql vai_de_pix < backup_20260707_143000.sql
```

---

## ⏪ Rollback

### Rollback Backend

```bash
# 1. Identificar versão anterior
git log --oneline -10

# 2. Rollback do código
git revert <commit-hash>
# ou
git checkout <previous-commit>

# 3. Rollback de migrations (se necessário)
alembic downgrade -1

# 4. Restart do serviço
sudo systemctl restart vai-de-pix-api

# 5. Verificar
curl https://api.vaidepix.com/health
```

### Rollback Frontend (Vercel)

```bash
# 1. Listar deployments
vercel ls

# 2. Rollback para deployment anterior
vercel rollback <deployment-url>

# Ou via UI:
# https://vercel.com/dashboard → Deployments → Rollback
```

### Rollback Database

```bash
# 1. Restaurar backup
psql vai_de_pix < backup_20260707_143000.sql

# 2. Verificar integridade
psql vai_de_pix -c "SELECT COUNT(*) FROM users;"
psql vai_de_pix -c "SELECT version_num FROM alembic_version;"

# 3. Restart API
sudo systemctl restart vai-de-pix-api
```

---

## 📊 Monitoramento

### Health Checks

```bash
# Backend health
curl https://api.vaidepix.com/health
# Expected: {"status":"healthy","timestamp":"...","database":"connected"}

# Frontend health
curl -I https://vaidepix.com
# Expected: HTTP/2 200

# Database health
psql vai_de_pix -c "SELECT 1;"
```

### Logs

```bash
# Backend logs (systemd)
sudo journalctl -u vai-de-pix-api -f

# Backend logs (Docker)
docker-compose logs -f backend

# nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Application logs
tail -f /var/log/vai-de-pix/app.log | jq .
```

### Métricas

```bash
# Prometheus metrics
curl https://api.vaidepix.com/metrics

# Application metrics
curl https://api.vaidepix.com/api/metrics/auth
```

### Alerts (Sentry)

```bash
# Verificar Sentry está recebendo eventos
# https://sentry.io/vai-de-pix/issues/

# Testar envio de erro
curl -X POST https://api.vaidepix.com/api/test-error
```

---

## 🔧 Troubleshooting

### Problema: API não responde

```bash
# 1. Verificar serviço
sudo systemctl status vai-de-pix-api

# 2. Verificar logs
sudo journalctl -u vai-de-pix-api -n 100

# 3. Verificar porta
sudo netstat -tulpn | grep 8000

# 4. Verificar processos
ps aux | grep uvicorn

# 5. Restart forçado
sudo systemctl restart vai-de-pix-api
```

### Problema: Database connection failed

```bash
# 1. Verificar PostgreSQL
sudo systemctl status postgresql

# 2. Verificar conexões
psql vai_de_pix -c "SELECT COUNT(*) FROM pg_stat_activity;"

# 3. Testar conexão
psql "postgresql://user:pass@localhost:5432/vai_de_pix"

# 4. Verificar max_connections
psql vai_de_pix -c "SHOW max_connections;"
psql vai_de_pix -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';"
```

### Problema: Migrations falharam

```bash
# 1. Ver estado atual
alembic current

# 2. Ver histórico
alembic history

# 3. Forçar stamp (última opção)
alembic stamp head

# 4. Rollback manual
alembic downgrade -1
```

### Problema: Frontend não carrega

```bash
# 1. Verificar build
npm run build
# Ver erros

# 2. Verificar variáveis de ambiente
cat .env.local

# 3. Verificar API_URL
curl $VITE_API_URL/health

# 4. Limpar cache
rm -rf node_modules/.vite
npm run build
```

### Problema: Alto uso de CPU/Memória

```bash
# 1. Identificar processo
top
htop

# 2. Ver queries lentas (PostgreSQL)
psql vai_de_pix -c "SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 10;"

# 3. Matar query lenta
psql vai_de_pix -c "SELECT pg_terminate_backend(PID);"

# 4. Restart do serviço
sudo systemctl restart vai-de-pix-api
```

---

## 📝 Checklist de Deploy

### Pré-Deploy

- [ ] Código revisado e aprovado (PR merged)
- [ ] Testes passando (CI verde)
- [ ] Migrations testadas em staging
- [ ] Variáveis de ambiente atualizadas
- [ ] Backup do banco criado
- [ ] Anúncio em Slack (#deploys)

### Durante Deploy

- [ ] Deploy backend
- [ ] Aplicar migrations
- [ ] Verificar health check
- [ ] Deploy frontend
- [ ] Verificar frontend carrega
- [ ] Smoke tests

### Pós-Deploy

- [ ] Monitorar logs por 15min
- [ ] Verificar Sentry (sem erros novos)
- [ ] Verificar métricas (latência, error rate)
- [ ] Atualizar CHANGELOG.md
- [ ] Anúncio em Slack (deploy concluído)
- [ ] Fechar ticket/issue

---

## 🚨 Contatos de Emergência

| Função | Contato | Horário |
|--------|---------|---------|
| **On-Call Lead** | +55 11 9xxxx-xxxx | 24/7 |
| **DevOps** | devops@vaidepix.com | 9h-18h |
| **Database Admin** | dba@vaidepix.com | 9h-18h |
| **Security** | security@vaidepix.com | 24/7 |

---

## 📚 Referências

- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Vercel Docs](https://vercel.com/docs)
- [Alembic Docs](https://alembic.sqlalchemy.org/)
- [PostgreSQL Backup](https://www.postgresql.org/docs/current/backup.html)

---

**Última Atualização:** 07/07/2026  
**Mantenedor:** DevOps Team
