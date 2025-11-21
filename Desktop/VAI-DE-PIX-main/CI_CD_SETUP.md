# 🚀 CI/CD Setup Completo - VAI DE PIX

## ✅ Configuração Implementada

### 1. GitHub Actions Workflow
**Arquivo:** `.github/workflows/ci-cd.yml`

**Funcionalidades:**
- ✅ Lint com Ruff + Black
- ✅ Testes unitários + E2E
- ✅ Build Docker image
- ✅ Deploy automático para Railway
- ✅ Status badge no README

### 2. Dockerfile Otimizado
**Arquivo:** `backend/Dockerfile`

**Características:**
- ✅ Multi-stage build (otimizado)
- ✅ Python 3.11-slim
- ✅ Usuário não-root
- ✅ Health check configurado
- ✅ Cache de dependências

### 3. Railway Configuration
**Arquivo:** `railway.json` e `backend/railway.json`

**Configuração:**
- ✅ Dockerfile builder
- ✅ Health check path
- ✅ Restart policy

### 4. Docker Compose
**Arquivo:** `docker-compose.yml`

**Serviços:**
- ✅ PostgreSQL 15
- ✅ Redis 7
- ✅ Backend FastAPI
- ✅ Frontend React (opcional)

### 5. Variáveis de Ambiente
**Arquivo:** `backend/.env.example`

**Todas as variáveis documentadas:**
- DATABASE_URL
- SECRET_KEY
- REDIS_URL
- ENVIRONMENT
- E mais...

## 🔧 Configuração Necessária

### Secrets do GitHub

Configure em `Settings > Secrets and variables > Actions`:

1. **DOCKER_USERNAME** (opcional)
   - Seu usuário Docker Hub
   - Deixe vazio se não usar Docker Hub

2. **DOCKER_PASSWORD** (opcional)
   - Token do Docker Hub
   - Deixe vazio se não usar Docker Hub

3. **RAILWAY_TOKEN** (obrigatório)
   - Obter em: railway.app/settings
   - Token de autenticação Railway

4. **RAILWAY_SERVICE_ID** (obrigatório)
   - ID do serviço na Railway
   - Encontrado em: Settings do serviço

5. **RAILWAY_DOMAIN** (obrigatório)
   - Domínio do deploy
   - Ex: `vai-de-pix.up.railway.app`

### Variáveis na Railway

Configure no dashboard da Railway:

- `SECRET_KEY` - Chave forte (32+ caracteres)
- `ENVIRONMENT=production`
- `FRONTEND_URL` - URL do frontend
- `ENABLE_RECURRING_JOBS=true`
- `LOG_LEVEL=INFO`
- `DATABASE_URL` - Railway injeta automaticamente

## 🚀 Como Usar

### Deploy Automático

1. **Configure secrets no GitHub**
2. **Configure variáveis na Railway**
3. **Faça push para main:**

```bash
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
```

**O que acontece:**
1. ✅ GitHub Actions roda automaticamente
2. ✅ Testes são executados
3. ✅ Docker image é construída
4. ✅ Deploy para Railway acontece
5. ✅ Aplicação fica online

### Desenvolvimento Local

```bash
# Com Docker Compose
docker-compose up -d

# Sem Docker
cd backend
python -m venv venv
source venv/bin/activate  # ou venv\Scripts\activate no Windows
pip install -r requirements.txt
cp .env.example .env
# Edite .env
python main.py
```

## 📊 Status Badge

Atualize o badge no README.md:

```markdown
![CI/CD](https://github.com/SEU_USUARIO/SEU_REPO/workflows/CI/CD%20Pipeline/badge.svg)
```

Substitua:
- `SEU_USUARIO` - Seu usuário GitHub
- `SEU_REPO` - Nome do repositório

## 🔍 Troubleshooting

### Deploy falha
- Verifique logs do GitHub Actions
- Verifique variáveis na Railway
- Verifique `RAILWAY_TOKEN` e `RAILWAY_SERVICE_ID`

### Testes falham
- Rode localmente: `pytest tests/ -v`
- Verifique DATABASE_URL no CI
- Verifique SECRET_KEY (mínimo 32 caracteres)

### Docker build falha
- Verifique Dockerfile
- Verifique .dockerignore
- Verifique requirements.txt

---

**💰 VAI DE PIX - CI/CD 100% configurado!**

