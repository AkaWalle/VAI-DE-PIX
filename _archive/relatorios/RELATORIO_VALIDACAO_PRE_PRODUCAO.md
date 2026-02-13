# Relatório técnico — Validação pré-produção (Vai de Pix)

**Data:** 2026-02-04  
**Ambiente:** Docker (Linux containers), PostgreSQL via docker-compose  
**Alembic:** Auditado; head único 9410e6e31f3c; upgrade funcional  

---

## ETAPA 1 — Infraestrutura

| Verificação | Resultado |
|-------------|-----------|
| **docker-compose up -d postgres backend** | OK (exit 0). |
| **docker ps** | postgres: **Up (healthy)**; backend: **Up (unhealthy)**. |
| **Containers em execução** | vaidepix-postgres-1, vaidepix-backend-1. |

**Observação:** O backend aparece como "unhealthy" no healthcheck do Docker (possível falha de curl no container ou critério do healthcheck); o processo da aplicação está em execução e responde em /health e /docs.

---

## ETAPA 2 — Verificação básica do backend

| Verificação | Resultado |
|-------------|-----------|
| **docker-compose logs --tail=100 backend** | Executado. |
| **Traceback** | Nenhum. |
| **Erro de conexão com banco** | Nenhum (logs: "Engine criado com sucesso", "Application startup complete"). |
| **Aplicação iniciou** | Sim. DeprecationWarning para `on_event("startup")`; WatchFiles reloads; sem erro fatal. |

---

## ETAPA 3 — Healthcheck e docs

| Verificação | Resultado |
|-------------|-----------|
| **GET http://localhost:8000/health** | **200** — `{"status":"healthy","timestamp":"...","database":"connected"}`. |
| **GET http://localhost:8000/docs** | **200** — Swagger carrega (Length: 946). |

---

## ETAPA 4 — Testes manuais de API (funcional)

| Ação | Resultado |
|------|------------|
| **Registrar usuário** | OK — POST /api/auth/register retorna 200 e access_token. |
| **Criar contas (A e B)** | OK — POST /api/accounts retorna 200 para ambas. |
| **Criar transação (POST /api/transactions)** | **ERRO 500** — Internal Server Error. |
| **Transferência A → B** | Não executada (depende de transação). |
| **Validação saldos/ledger** | Não executada. |

**Causa do 500 (logs do backend):**  
`sqlalchemy.exc.ProgrammingError: (psycopg2.errors.UndefinedColumn) column transactions.tags does not exist`  
O modelo SQLAlchemy `Transaction` ainda referencia a coluna `transactions.tags`, que foi removida pela migration `migrate_tags_data_and_remove_old_column` (tags migradas para tabela relacionada). **Modelo e schema estão desalinhados.**

---

## ETAPA 5 — Teste de idempotência (Trilha 5)

**Não executada de forma concluída** — POST /api/transactions retorna 500, impedindo fluxo de criação de transação e validação de Idempotency-Key (mesmo request 3x, mesmo key + payload diferente).

---

## ETAPA 6 — Testes automatizados essenciais

| Comando | Resultado |
|---------|-----------|
| **pytest -m "requires_postgres and not slow"** | Coleta falhou inicialmente: `tests/e2e/conftest.py` importa `playwright` (não instalado no container). |
| **pytest com --ignore=e2e e arquivos específicos** | Executado: **29 failed, 1 passed, 1 xfailed**. |

**Causa dos falhas:**  
`psycopg2.errors.UndefinedColumn: column transactions.tags does not exist` — mesma divergência entre modelo e schema. Os testes que consultam `Transaction` ou a tabela `transactions` falham ao gerar SQL que inclui `transactions.tags`.

**Único teste que passou:** `test_pg_sleep_available_postgres_only` (test_db_lock_and_latency.py).  
**XFAIL:** `test_concurrent_create_same_transaction_only_one_created` (esperado falhar quando há deduplicação).

---

## ETAPA 7 — Concorrência básica

Os testes de concorrência (ex.: test_concurrency_transactions.py, test_db_locking.py) foram executados no âmbito do pytest da ETAPA 6 e **falharam** pelo mesmo motivo: `column transactions.tags does not exist`. Não foi possível validar duplicação, saldo negativo ou locks em ambiente real.

---

## ETAPA 8 — Relatório final

### Containers em execução

- **vaidepix-postgres-1:** Up, healthy, porta 5432.  
- **vaidepix-backend-1:** Up, unhealthy (healthcheck), porta 8000; aplicação responde em /health e /docs.

### Status do backend

- **Processo:** Em execução (Uvicorn).  
- **Conexão com PostgreSQL:** OK (health retorna database "connected").  
- **Endpoints básicos:** /health e /docs respondem 200.  
- **Endpoint crítico POST /api/transactions:** Retorna **500** por coluna `transactions.tags` inexistente.

### Resultado do healthcheck

- **GET /health:** 200 — status healthy, database connected.  
- **GET /api/health:** Não testado explicitamente; mesmo handler que /health.

### Endpoints testados

| Endpoint | Método | Status | Observação |
|----------|--------|--------|------------|
| /health | GET | 200 | OK |
| /docs | GET | 200 | OK |
| /api/auth/register | POST | 200 | OK |
| /api/accounts | POST | 200 | OK |
| /api/categories | GET | 200 | OK (ou vazio) |
| /api/transactions | POST | **500** | UndefinedColumn: transactions.tags |

### Resultado dos testes pytest

- **Marcador:** `requires_postgres and not slow` (arquivos específicos; e2e e unit com problemas de import ignorados).  
- **Resultado:** 29 falhas, 1 sucesso, 1 xfailed.  
- **Causa predominante:** `column transactions.tags does not exist` (modelo Transaction desalinhado do schema aplicado).

### Erros encontrados

1. **Modelo/schema desalinhados (bloqueante)**  
   - **Onde:** Modelo SQLAlchemy `Transaction` e tabela `transactions` no PostgreSQL.  
   - **Fato:** A migration `migrate_tags_data_and_remove_old_column` (ou equivalente) removeu a coluna `tags` da tabela `transactions`; o modelo ainda declara `tags`.  
   - **Impacto:** POST /api/transactions retorna 500; todos os testes que usam a tabela/ modelo Transaction falham.  
   - **Correção necessária:** Alinhar o modelo `Transaction` ao schema atual (remover ou ajustar o atributo `tags` conforme o desenho atual de tags no banco), **sem** alterar migrations já aplicadas, conforme regras do projeto.

2. **Backend reportado como unhealthy**  
   - Healthcheck do Docker pode estar falhando (ex.: curl ou comando do healthcheck). Não impede resposta correta de /health e /docs.

3. **Pytest**  
   - Coleta falha ao carregar `tests/e2e/conftest.py` (playwright não instalado).  
   - `tests/unit/test_input_sanitizer.py` importa `bleach` (não instalado no container).  
   - Esses pontos impedem rodar a suíte completa sem ajuste de ambiente ou exclusão de pastas.

---

## Conclusão

**NÃO APTO para próxima etapa.**

**Motivo:** Erro estrutural de alinhamento entre modelo e schema (coluna `transactions.tags` inexistente no banco e ainda referenciada no modelo), que:

- Quebra o endpoint crítico POST /api/transactions (500).  
- Impede validação funcional completa (transações, transferências, saldos, ledger).  
- Impede validação de idempotência via API.  
- Faz falhar a grande maioria dos testes automatizados que usam Transaction/transactions.

**Recomendação:** Corrigir o modelo SQLAlchemy `Transaction` (e qualquer uso de `transactions.tags`) para refletir o schema atual do banco (tags em tabela separada ou outro desenho já migrado), **sem** alterar código de migrations nem schema já aplicado, e reexecutar esta validação.

---

**Regras respeitadas:** Nenhum código de produção nem migrations foi alterado; nenhum fallback para SQLite; nenhuma correção automática aplicada; parada e relatório técnico gerado conforme solicitado.
