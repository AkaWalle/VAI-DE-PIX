# CI Backend com PostgreSQL

## Visão geral do pipeline

O pipeline **Backend CI (PostgreSQL)** roda apenas em **Linux** (`ubuntu-latest`), sobe um **PostgreSQL 15** em container (service), aplica as **migrations** (`alembic upgrade head`) e executa a **suite completa de testes** do backend (`pytest`), exceto os testes e2e. O banco é **limpo a cada execução** (sem volumes). Qualquer falha em teste **falha o job**; nenhuma falha é ignorada.

---

## Por que o CI roda apenas em Linux

Em **Windows**, os testes que usam **PostgreSQL** falham com **`UnicodeDecodeError`** ao conectar ao banco (psycopg2 + path do sistema ou do usuário com caracteres não-ASCII). Esse comportamento é **conhecido** e **não é tratado** neste escopo.

Por isso o workflow está configurado para **rodar somente em `ubuntu-latest`**: todos os testes críticos (concorrência, idempotência, invariantes financeiros) executam em ambiente onde o Postgres funciona. Não há steps condicionados a Windows nem tentativa de contornar encoding no CI.

---

## Por que Postgres em container

- **Banco limpo por execução:** cada job do GitHub Actions sobe um **novo** container Postgres (service), sem volumes. O schema é aplicado via `alembic upgrade head` no próprio job.
- **Mesmo motor de produção:** uso de PostgreSQL 15 (Alpine), alinhado ao ambiente de produção/Docker.
- **Reprodutibilidade:** o mesmo fluxo (migrations + pytest) pode ser reproduzido localmente em Linux com `docker-compose.test.yml`.

---

## O que o pipeline executa (passo a passo)

1. **Checkout** do repositório.
2. **Setup Python 3.11** (com cache de pip).
3. **Instalação de dependências:** `backend/requirements.txt` e, se existir, `backend/requirements-test.txt`.
4. **Instalação de postgresql-client** (para o comando `pg_isready`).
5. **Espera Postgres:** loop com `pg_isready` até o serviço aceitar conexões.
6. **Alembic upgrade head** em `backend/` (com `DATABASE_URL` apontando para o Postgres do job).
7. **Pytest:** `pytest tests/ --ignore=tests/e2e -x` em `backend/`, com `DATABASE_URL` e `SECRET_KEY` definidos. O flag `-x` interrompe na primeira falha.

Testes **e2e** não são executados (exigem Playwright; não são instalados neste job). Todos os demais testes (unit, integration, concorrência, idempotência, invariantes financeiros) são executados.

---

## Variáveis de ambiente necessárias

- **`DATABASE_URL`:** `postgresql://vai_de_pix_user:vai_de_pix_pass@localhost:5432/vai_de_pix` (definida no workflow; usada nos steps de alembic e pytest).
- **`SECRET_KEY`:** definida **apenas** no step de pytest (para testes que dependem de JWT/autenticação).

O serviço Postgres no workflow usa as mesmas credenciais: `POSTGRES_DB=vai_de_pix`, `POSTGRES_USER=vai_de_pix_user`, `POSTGRES_PASSWORD=vai_de_pix_pass`.

---

## Invariantes respeitadas

O pipeline **não remove e não simplifica** testes. As seguintes garantias são preservadas:

- **Concorrência:** testes que validam locks, saldo e transferências concorrentes continuam na suite e devem passar.
- **Idempotência:** testes de idempotência (incl. chave de idempotência) continuam na suite e devem passar.
- **Integridade financeira:** testes de invariantes (ledger, saldo, transferências, soft delete) continuam na suite e devem passar.

Prioridade é dada à **correção e à auditabilidade**; conveniência não substitui essas garantias.

---

## Declarações explícitas

- **Nenhuma migration foi alterada** pelo CI: o pipeline apenas executa `alembic upgrade head` sobre o código existente.
- **Nenhum schema de banco foi alterado** pelo CI: não há steps que criem ou modifiquem tabelas fora das migrations já versionadas.
- **Nenhum teste foi removido ou “simplificado”** pelo CI: a suite roda `pytest tests/ --ignore=tests/e2e`; a exclusão de `tests/e2e` é explícita e motivada pela dependência de Playwright, não por remoção de cenários críticos.
