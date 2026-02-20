# Arquivos do projeto: Vercel e Neon

Referência dos arquivos do repositório usados no deploy **Vercel** e no banco **Neon**. Use esta lista ao clonar em outro PC ou para conferir o que precisa estar versionado.

---

## Lista de arquivos (caminhos no repositório)

| Arquivo | Uso |
|---------|-----|
| `vercel.json` | Configuração do deploy: build, output, rewrites (/api → serverless). |
| `api/index.py` | **Entrypoint** da função serverless na Vercel; carrega o FastAPI e expõe ASGI. |
| `backend/database.py` | Conexão ao banco; usa `DATABASE_URL` e `VERCEL`; pool restrito em produção (Neon serverless). |
| `scripts/run-migrations-neon.py` | Roda `alembic upgrade head` no Neon (usa `.env` da raiz com `DATABASE_URL`). |
| `scripts/vercel-build.sh` | Script de build (npm install + npm run build) para Vercel. |
| `env.local.example` | **Modelo** de variáveis (front + API); não contém segredos. |
| `backend/.env.example` | Modelo de variáveis do backend (se existir). |
| `docs/deploy/VERCEL-NEON-DEPLOY.md` | Passo a passo completo: deploy Vercel + Neon e variáveis. |

**Não versionar (só local / Vercel Dashboard):**

- `.env` — contém `DATABASE_URL` e outros segredos. No outro PC: criar novo `.env` com a URL do Neon (Dashboard Neon → Connection string) e variáveis do `env.local.example`.
- Variáveis sensíveis: configurar no **Vercel → Project → Settings → Environment Variables**.

---

## Conteúdo de referência (copiar se precisar)

### `vercel.json`

```json
{"version":2,"env":{"PYO3_USE_ABI3_FORWARD_COMPATIBILITY":"1"},"buildCommand":"npm run build","outputDirectory":"dist","rewrites":[{"source":"/api/(.*)","destination":"/api/index"},{"source":"/(.*)","destination":"/index.html"}]}
```

### Variáveis de ambiente (template)

Configure no **Vercel Dashboard** (Production / Preview) e, localmente, em `.env` na **raiz** do projeto:

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | Connection string do Neon (PostgreSQL). Use a URL **pooled** (com `-pooler` no host). Ex.: `postgresql://user:pass@ep-xxx-pooler.regiao.aws.neon.tech/neondb?sslmode=require` |
| `SECRET_KEY` | Sim | Chave para JWT (mín. 32 caracteres). Ex.: `openssl rand -hex 32` |
| `ENVIRONMENT` | Recomendado | `production` em produção |
| `VITE_API_URL` | Sim (build) | URL da API. Na Vercel: `https://SEU-PROJETO.vercel.app/api` |
| `VERCEL` | Automática na Vercel | Definida pela Vercel (`1` em runtime) |

### Rodar migrations no Neon (outro PC)

1. Na raiz do projeto, crie `.env` com:
   ```bash
   DATABASE_URL=postgresql://...sua-url-neon-pooled...?sslmode=require
   ```
2. Instale dependências e rode:
   ```bash
   pip install -r requirements.txt
   python scripts/run-migrations-neon.py
   ```

Ou manualmente:
```bash
cd backend
alembic upgrade head
```

---

## Onde fica cada coisa

- **Vercel:** deploy do frontend (build `npm run build` → `dist`) + função serverless `api/index.py` (rewrite `/api/*` → `/api/index`).
- **Neon:** banco PostgreSQL; a app conecta via `DATABASE_URL` (definida no Vercel ou no `.env` local).
- **Cursor/IDE:** não guarda config da Vercel/Neon; tudo que importa está no repositório (estes arquivos + código). No outro PC: clonar o repo, criar `.env` com a URL do Neon e variáveis, e configurar as env no dashboard da Vercel para deploy.

Para o passo a passo completo de deploy, use **`docs/deploy/VERCEL-NEON-DEPLOY.md`**.
