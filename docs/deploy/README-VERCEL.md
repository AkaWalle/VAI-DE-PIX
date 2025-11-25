# Deploy Backend no Vercel

## Configuração do Backend no Vercel

O backend FastAPI pode ser hospedado no Vercel usando Serverless Functions. Siga os passos abaixo:

### 1. Configurar Banco de Dados

**IMPORTANTE:** O SQLite não funciona no Vercel (arquivos são efêmeros). Você precisa usar PostgreSQL.

#### Opções de Banco de Dados:

1. **Vercel Postgres** (Recomendado - Integração nativa)
   - Acesse: https://vercel.com/dashboard
   - Vá em Storage → Create Database → Postgres
   - Copie a string de conexão

2. **Neon** (Gratuito e fácil)
   - Acesse: https://neon.tech
   - Crie uma conta e projeto
   - Copie a connection string

3. **Supabase** (Gratuito)
   - Acesse: https://supabase.com
   - Crie um projeto
   - Vá em Settings → Database → Connection string

### 2. Configurar Variáveis de Ambiente no Vercel

No dashboard do Vercel, vá em:
- Settings → Environment Variables

Adicione as seguintes variáveis:

```
DATABASE_URL=postgresql://user:password@host:5432/database
SECRET_KEY=sua-chave-secreta-aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_URL=https://seu-dominio.vercel.app
```

### 3. Estrutura de Arquivos

O projeto já está configurado com:
- `api/index.py` - Handler serverless para Vercel
- `vercel.json` - Configuração do Vercel
- `requirements.txt` - Dependências Python

### 4. Deploy

O deploy será automático quando você fizer push para o GitHub, ou você pode fazer manualmente:

```bash
vercel --prod
```

### 5. Executar Migrações

Após o deploy, você precisa executar as migrações do banco de dados. Você pode fazer isso:

1. **Via script local** (conectando ao banco remoto):
   ```bash
   cd backend
   export DATABASE_URL="sua-connection-string"
   alembic upgrade head
   ```

2. **Via Vercel CLI** (criar um script temporário):
   - Crie um endpoint temporário para executar migrações
   - Ou use o Vercel CLI para executar comandos

### 6. Testar a API

Após o deploy, a API estará disponível em:
- `https://seu-projeto.vercel.app/api`
- `https://seu-projeto.vercel.app/api/docs` (Swagger UI)

### 7. Atualizar Frontend

No frontend, atualize a variável de ambiente:
```
VITE_API_URL=https://seu-projeto.vercel.app/api
```

## Limitações do Vercel Serverless

1. **Timeout**: Funções têm timeout de 10s (Hobby) ou 60s (Pro)
2. **Cold Start**: Primeira requisição pode ser mais lenta
3. **Banco de Dados**: Precisa ser externo (PostgreSQL recomendado)

## Alternativas

Se precisar de mais recursos, considere:
- **Railway**: https://railway.app (Backend completo)
- **Render**: https://render.com (Backend completo)
- **Fly.io**: https://fly.io (Backend completo)

