# Relatório — Start Staging Local (Completo)

**Data:** 2026-02-04  
**Objetivo:** Subir o sistema localmente para validação com usuários reais (staging-like): PostgreSQL + Backend FastAPI em Docker; Frontend Vite nativo (sem Docker).  
**Regras:** Não alterar código de produção, migrations, schema ou contratos da API; parar em qualquer erro e relatar.

---

## 1. Infraestrutura (Docker + Node)

| Componente | Meio | Porta | Status |
|------------|------|--------|--------|
| PostgreSQL 15 | Docker (`docker-compose.staging.yml`) | 5432 | healthy |
| Backend FastAPI | Docker (`docker-compose.staging.yml`) | 8000 | running |
| Frontend Vite | Nativo (`npm run dev`) | 5173 | running |

- **Docker:** Server ativo, OSType linux (ETAPA 0).
- **Comando infra:** `docker compose -f docker-compose.staging.yml up --build`.
- **Frontend:** Sem Docker; diretório raiz do projeto (`package.json`), `npm install` e `npm run dev`. Requests apontam para `http://localhost:8000` via `VITE_API_URL`.

---

## 2. Backend (health, Alembic)

- **Health:** `GET http://localhost:8000/health` → **200**.
- **Docs:** `GET http://localhost:8000/docs` → Swagger carrega.
- **Alembic (no container do backend):**
  - `alembic current` = **9410e6e31f3c**
  - `alembic heads` = **1 head**
- Migrations e schema não foram alterados.

---

## 3. Frontend (build + runtime)

- **Build/run:** `npm install` e `npm run dev` na raiz do projeto → Vite sobe sem erro.
- **Acesso:** Frontend acessível em `http://localhost:5173`.
- **API:** Frontend configurado para usar `VITE_API_URL=http://localhost:8000`.

---

## 4. API, Ledger, Idempotência e Concorrência

### 4.1 Validação funcional (ETAPA 7)

- Criar usuário: OK.
- Login: OK.
- Criar contas: OK.
- Criar receita: 200.
- Criar despesa (ex.: 10) com tags: 200.
- Listar transações: OK.
- Criar transferência (ex.: 50) A→B: 200.
- Saldos corretos (ex.: A=150, B=50 após operações).
- Ledger consistente: 2 entradas para transferência, soma 0.

### 4.2 Idempotência (ETAPA 8)

- Três POSTs idênticos com mesma **Idempotency-Key** → mesma transação (mesmo `transaction_id`), 1 transação, 1 conjunto de ledger. **OK.**
- Mesma key com payload diferente → **HTTP 400.** **OK.**

### 4.3 Concorrência (ETAPA 8)

- Duas despesas concorrentes (ex.: 80 cada) na mesma conta (saldo ex.: 150): uma requisição retorna **200**, a outra **400** (saldo insuficiente). **OK.**
- Saldos e ledger permanecem consistentes; sem erro 500.

---

## 5. Confirmação

- **Nenhum código de produção foi alterado.**
- **Nenhuma migration foi alterada.**
- **Nenhum schema de banco foi alterado.**
- **Nenhum contrato de API foi alterado.**
- **Docker:** apenas backend + postgres; frontend fora do Docker, conforme especificação.

---

## 6. Status final

**APTO**

O ambiente staging local está pronto para validação com usuários reais: PostgreSQL e backend em Docker, frontend Vite nativo, health/Alembic/docs OK, fluxos de usuário/contas/transações/transferências e invariantes de idempotência e concorrência validadas.
