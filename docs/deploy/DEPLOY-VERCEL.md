# 🚀 Guia Completo de Deploy no Vercel (Frontend + Backend)

Este guia vai te ajudar a fazer o deploy completo do VAI DE PIX no Vercel, incluindo frontend e backend.

## 📋 Pré-requisitos

1. Conta no Vercel (gratuita): https://vercel.com
2. Conta no Neon (banco PostgreSQL gratuito): https://neon.tech
3. Git configurado e projeto no GitHub

## 🔧 Passo 1: Criar Banco de Dados PostgreSQL

### Opção A: Neon (Recomendado - Gratuito)

1. Acesse: https://neon.tech
2. Crie uma conta (pode usar GitHub)
3. Clique em "Create Project"
4. Escolha:
   - **Project name**: `vai-de-pix`
   - **Region**: Escolha o mais próximo (ex: `us-east-1`)
   - **PostgreSQL version**: `15` ou `16`
5. Clique em "Create Project"
6. Após criar, copie a **Connection String**:
   - Vá em "Connection Details"
   - Copie a string que começa com `postgresql://...`
   - Exemplo: `postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`

### Opção B: Vercel Postgres (Integração Nativa)

1. Acesse: https://vercel.com/dashboard
2. Vá em **Storage** → **Create Database**
3. Escolha **Postgres**
4. Configure:
   - **Name**: `vai-de-pix-db`
   - **Region**: Escolha o mais próximo
5. Clique em **Create**
6. Vá em **Settings** → **Connection String**
7. Copie a connection string

## 🔐 Passo 2: Configurar Variáveis de Ambiente no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto `vai-de-pix`
3. Vá em **Settings** → **Environment Variables**
4. Adicione as seguintes variáveis:

### Variáveis Obrigatórias:

```
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
SECRET_KEY=uma-chave-secreta-aleatoria-aqui-mude-esta-chave
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_URL=https://vai-de-hkeqh4jav-akawalles-projects.vercel.app
```

**Importante:**
- Substitua `DATABASE_URL` pela connection string do seu banco
- Gere uma `SECRET_KEY` aleatória (pode usar: `openssl rand -hex 32` ou um gerador online)
- Atualize `FRONTEND_URL` com a URL do seu projeto no Vercel

### Variáveis para Frontend:

```
VITE_API_URL=https://vai-de-hkeqh4jav-akawalles-projects.vercel.app/api
```

**Configuração:**
- Marque todas as variáveis para **Production**, **Preview** e **Development**
- Clique em **Save**

## 📦 Passo 3: Executar Migrações do Banco de Dados

### Opção A: Via Script Local

1. Configure a variável de ambiente localmente:
   ```bash
   # Windows PowerShell
   $env:DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
   
   # Linux/Mac
   export DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
   ```

2. Execute o script de migração:
   ```bash
   # Windows
   .\scripts\setup-database.ps1
   
   # Linux/Mac
   chmod +x scripts/setup-database.sh
   ./scripts/setup-database.sh
   ```

### Opção B: Via Vercel CLI

1. Instale o Vercel CLI (se ainda não tiver):
   ```bash
   npm i -g vercel
   ```

2. Execute as migrações via Vercel:
   ```bash
   vercel env pull .env.local
   cd backend
   alembic upgrade head
   ```

### Opção C: Via Script Python Direto

1. Crie um arquivo `.env` na raiz do projeto:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
   SECRET_KEY=sua-chave-secreta
   ```

2. Execute:
   ```bash
   cd backend
   python -m alembic upgrade head
   ```

## 🚀 Passo 4: Fazer Deploy

### Deploy Automático (Recomendado)

1. Faça commit e push das alterações:
   ```bash
   git add .
   git commit -m "feat: configurar backend para Vercel"
   git push
   ```

2. O Vercel fará o deploy automaticamente!

### Deploy Manual

```bash
vercel --prod --yes
```

## ✅ Passo 5: Verificar Deploy

1. Acesse a URL do seu projeto: `https://seu-projeto.vercel.app`
2. Teste a API: `https://seu-projeto.vercel.app/api/health`
3. Acesse a documentação: `https://seu-projeto.vercel.app/api/docs`

## 🔍 Troubleshooting

### Erro: "Module not found"
- Verifique se `api/requirements.txt` está correto
- Verifique se o `vercel.json` está apontando para o arquivo correto

### Erro: "Database connection failed"
- Verifique se `DATABASE_URL` está configurada corretamente
- Verifique se o banco de dados está acessível
- Verifique se as migrações foram executadas

### Erro: "Timeout"
- Verifique se as funções serverless não estão demorando muito
- Considere otimizar queries ou usar cache

### Erro: "CORS"
- Verifique se `FRONTEND_URL` está configurada corretamente
- Verifique se o CORS está permitindo a origem correta

## 📝 Estrutura Final

```
projeto/
├── api/
│   ├── index.py          # Handler serverless
│   └── requirements.txt  # Dependências Python
├── backend/              # Código do backend
├── src/                  # Código do frontend
├── vercel.json          # Configuração do Vercel
└── requirements.txt     # Dependências Python (raiz)
```

## 🎉 Pronto!

Agora seu projeto está rodando completamente no Vercel:
- ✅ Frontend: `https://seu-projeto.vercel.app`
- ✅ Backend API: `https://seu-projeto.vercel.app/api`
- ✅ Documentação: `https://seu-projeto.vercel.app/api/docs`

## 📚 Recursos Úteis

- [Documentação Vercel](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Neon Database](https://neon.tech/docs)
- [FastAPI no Vercel](https://vercel.com/guides/deploying-fastapi-with-vercel)

