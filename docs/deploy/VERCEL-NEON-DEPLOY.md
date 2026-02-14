# Deploy Vercel + Neon Postgres (Vai de Pix)

Alterações feitas **apenas** para compatibilidade com Vercel serverless e Neon. Nenhuma refatoração, mudança de arquitetura ou lógica de negócio.

---

## 1. O que foi alterado

### 1.1 `backend/database.py`
- **Motivo:** Em ambiente serverless (Vercel) cada invocação não deve manter um pool grande de conexões; o Neon tem limite de conexões.
- **Alteração:** Quando `is_production` (VERCEL=1 ou ENVIRONMENT=production), o engine PostgreSQL passa a usar:
  - `pool_pre_ping=True` — testa a conexão antes de usar
  - `pool_size=1` — uma conexão por instância
  - `max_overflow=0` — sem conexões extras
- **Comportamento local:** Inalterado (continua sem pool restrito em desenvolvimento).

### 1.2 `api/index.py`
- **Motivo:** O frontend envia o header `Idempotency-Key` em POST de transações/metas; o CORS precisa permitir esse header.
- **Alteração:** Inclusão de `Idempotency-Key` em `Access-Control-Allow-Headers` (nas duas respostas que definem esse header).

### 1.3 Arquivos não alterados
- `vercel.json` — já configurado (build, output, functions, rewrites)
- `package.json` — sem mudanças
- Migrations, modelos, routers, regras de negócio — sem mudanças

---

## 2. Variáveis de ambiente necessárias (Vercel)

Configurar no **Vercel → Project → Settings → Environment Variables** (Production e Preview, se quiser):

| Variável        | Obrigatória | Descrição |
|-----------------|-------------|-----------|
| `DATABASE_URL` | Sim         | String de conexão do Neon (Postgres). Use a URL **pooled** do Neon (recomendado para serverless). Ex.: `postgresql://user:pass@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require` |
| `SECRET_KEY`   | Sim         | Chave secreta para JWT (mín. 32 caracteres). Ex.: `openssl rand -hex 32` |
| `ENVIRONMENT`  | Recomendado | `production` em produção |
| `VITE_API_URL` | Sim (build) | URL da API no front. Em deploy na Vercel use a própria URL do projeto: `https://SEU-PROJETO.vercel.app/api` |

**Neon:** No dashboard do Neon, use a connection string do **pooled connection** (geralmente com `-pooler` no host). Assim o serverless usa o pooler e não estoura o limite de conexões.

---

## 3. Passo a passo para deploy na Vercel

1. **Criar projeto no Neon**
   - [neon.tech](https://neon.tech) → criar banco
   - Copiar a **connection string** (pooled, com `?sslmode=require` se aparecer)

2. **Aplicar migrations no Neon (uma vez)**
   - Crie um arquivo **`.env`** na **raiz** do projeto com a mesma URL do Neon (pooled):
     ```
     DATABASE_URL=postgresql://usuario:senha@ep-xxx-pooler.regiao.aws.neon.tech/neondb?sslmode=require
     ```
   - Rode as migrations (na raiz do projeto):
     ```bash
     pip install -r requirements.txt
     python scripts/run-migrations-neon.py
     ```
   - Ou manualmente:
     ```bash
     cd backend
     alembic upgrade head
     ```
   - Depois confira no Neon (SQL Editor): `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`

3. **Conectar repositório na Vercel**
   - [vercel.com](https://vercel.com) → New Project → importar o repositório do projeto

4. **Configurar variáveis no projeto Vercel**
   - Settings → Environment Variables:
     - `DATABASE_URL` = string do Neon (pooled)
     - `SECRET_KEY` = chave forte (ex.: `openssl rand -hex 32`)
     - `ENVIRONMENT` = `production`
     - `VITE_API_URL` = `https://<seu-dominio-vercel>.vercel.app/api` (trocar pelo domínio real do deploy)

5. **Build**
   - Build Command: `npm run build` (já é o padrão no `vercel.json`)
   - Output Directory: `dist`
   - O `vercel.json` já define a serverless function `api/index.py` com `includeFiles: backend/**`

6. **Deploy**
   - Deploy a partir da branch (ex.: `main`). O build do frontend e a função serverless serão publicados.

7. **Após o primeiro deploy**
   - Ajustar `VITE_API_URL` se o domínio final for outro (ex.: custom domain) e fazer um novo deploy para o frontend usar a API correta.

---

## 4. Confirmação

- Nenhum código de negócio foi modificado.
- Arquitetura (FastAPI no serverless, Mangum, rewrites) mantida.
- Apenas conexão do banco (pool em produção) e CORS (header Idempotency-Key) foram ajustados para deploy na Vercel com Neon.
