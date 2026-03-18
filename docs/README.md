# Documentação — Vai de Pix

**Vai de Pix** é um sistema de controle financeiro pessoal: transações, contas, caixinhas (envelopes), metas, despesas compartilhadas e sincronização de dados entre dispositivo e servidor.

## Pré-requisitos

- Node.js 18+
- Python 3.10+
- PostgreSQL 14+ (ou SQLite apenas para desenvolvimento local)
- npm ou yarn

## Rodar localmente

1. Clonar o repositório e entrar na pasta do projeto.
2. **Backend:** `cd backend && python -m venv .venv`
3. **Backend:** Ativar o venv e instalar dependências — `.venv\Scripts\activate` (Windows) ou `source .venv/bin/activate` (Linux/macOS), depois `pip install -r requirements.txt`
4. **Backend:** Copiar `backend/.env.example` para `backend/.env` e preencher as variáveis obrigatórias.
5. **Backend:** Rodar migrations — `alembic upgrade head` (dentro de `backend/`).
6. **Backend:** Subir a API — `python main.py` (servidor em http://localhost:8000).
7. **Frontend:** Na raiz do projeto — `npm install`, copiar `env.local.example` para `.env.local`, depois `npm run dev` (app em http://localhost:5000).

## Variáveis de ambiente obrigatórias

### Backend (`backend/.env`)

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | URL do banco (ex.: `postgresql://user:senha@host:5432/db`). Em dev pode ser `sqlite:///./vai_de_pix.db`. Em produção deve ser PostgreSQL. |
| `SECRET_KEY` | Chave secreta para assinatura dos tokens JWT (trocar em produção). |
| `FRONTEND_URL` | URL do frontend para CORS (ex.: `http://localhost:5000`). |

### Frontend (`.env.local`)

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL base da API (ex.: `http://localhost:8000/api`). |

## Outros documentos

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Camadas do sistema, fluxos e decisões técnicas
- [DATABASE.md](./DATABASE.md) — Tabelas, campos, índices e migrations
- [API.md](./API.md) — Autenticação e endpoints por domínio
- [FRONTEND.md](./FRONTEND.md) — Estrutura do frontend, estado e padrões
- [INTEGRATIONS.md](./INTEGRATIONS.md) — Integrações externas e configuração
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Branches, commits, testes e PR
