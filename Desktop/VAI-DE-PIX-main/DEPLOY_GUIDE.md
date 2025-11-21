# 🚀 GUIA DE DEPLOY - VAI DE PIX

## 📋 Visão Geral

Este guia explica como fazer deploy automático do VAI DE PIX usando GitHub Actions + Railway.

## 🔧 Configuração Inicial

### 1. Secrets do GitHub

Configure os seguintes secrets em `Settings > Secrets and variables > Actions`:

#### Obrigatórios:
- `DOCKER_USERNAME` - Seu usuário Docker Hub (opcional se não usar Docker Hub)
- `DOCKER_PASSWORD` - Token do Docker Hub (opcional)
- `RAILWAY_TOKEN` - Token da Railway (obter em railway.app/settings)
- `RAILWAY_SERVICE_ID` - ID do serviço Railway
- `RAILWAY_DOMAIN` - Domínio do deploy (ex: vai-de-pix.up.railway.app)

### 2. Configuração na Railway

1. **Criar projeto na Railway:**
   - Acesse [railway.app](https://railway.app)
   - Crie novo projeto
   - Adicione serviço PostgreSQL
   - Adicione serviço para aplicação

2. **Configurar variáveis de ambiente na Railway:**
   - `SECRET_KEY` - Gere uma chave forte (mínimo 32 caracteres)
   - `DATABASE_URL` - Railway injeta automaticamente
   - `ENVIRONMENT=production`
   - `FRONTEND_URL` - URL do seu frontend
   - `ENABLE_RECURRING_JOBS=true`
   - `LOG_LEVEL=INFO`

3. **Obter Service ID:**
   - No dashboard da Railway, vá em Settings do serviço
   - Copie o Service ID

## 🚀 Deploy Automático

### Push para main
```bash
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
```

**O que acontece automaticamente:**
1. ✅ GitHub Actions roda testes
2. ✅ Build Docker image
3. ✅ Deploy para Railway
4. ✅ Aplicação fica online

## 📊 Monitoramento

### Verificar status do deploy:
- GitHub Actions: `Actions` tab no repositório
- Railway Dashboard: railway.app

### Logs:
```bash
# Via Railway CLI
railway logs

# Ou no dashboard da Railway
```

## 🔍 Troubleshooting

### Deploy falha nos testes
- Verifique logs do GitHub Actions
- Corrija erros de lint/teste
- Faça novo push

### Deploy falha na Railway
- Verifique variáveis de ambiente
- Verifique logs na Railway
- Verifique `RAILWAY_TOKEN` e `RAILWAY_SERVICE_ID`

### Aplicação não inicia
- Verifique `SECRET_KEY` (deve ter 32+ caracteres)
- Verifique `DATABASE_URL`
- Verifique logs: `railway logs`

## 🐳 Docker Local

### Build local
```bash
cd backend
docker build -t vai-de-pix:latest .
```

### Run local
```bash
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://... \
  -e SECRET_KEY=... \
  --env-file .env \
  vai-de-pix:latest
```

## 📝 Checklist de Deploy

Antes de fazer push para main:

- [ ] Todos os testes passam localmente
- [ ] `SECRET_KEY` configurado na Railway
- [ ] `DATABASE_URL` configurado (Railway injeta automaticamente)
- [ ] `FRONTEND_URL` configurado para produção
- [ ] Secrets do GitHub configurados
- [ ] Railway Service ID configurado

---

**💰 VAI DE PIX - Deploy automático configurado!**

