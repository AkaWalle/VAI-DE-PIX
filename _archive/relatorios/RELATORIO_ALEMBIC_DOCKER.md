# Relatório técnico — Alembic e backend via Docker (Linux)

**Data:** 2026-02-04  
**Objetivo:** Executar Alembic e validar o backend em container Linux, eliminando problemas de encoding do Windows. Sem alterar código de produção, migrations ou schema sem autorização.

---

## CONTEXTO

- **Projeto:** Vai de Pix  
- **SO host:** Windows  
- **Problema conhecido:** psycopg2 falha por encoding em paths Windows  
- **Estratégia:** Executar Alembic e backend dentro de container Linux  

---

## ETAPA 1 — Verificação inicial

| Verificação | Resultado |
|-------------|-----------|
| **Docker Desktop em execução** | **OK** — `docker info` retornou Server (OSType: linux, Containers: 8, Running: 3). |
| **docker-compose ps** | **OK** — postgres: `Up 23 minutes (healthy)`. Backend e frontend não estavam rodando (apenas postgres). |

---

## ETAPA 2 — Dockerfile do backend

| Verificação | Resultado |
|-------------|-----------|
| **Dockerfile em backend/** | **Existe** — `backend/Dockerfile` |
| **Conteúdo** | Base `python:3.11-slim`, WORKDIR `/app`, COPY requirements.txt, pip install, COPY . ., **não** executa alembic no build. |

Nenhuma alteração necessária.

---

## ETAPA 3 — Serviço backend no docker-compose

| Verificação | Resultado |
|-------------|-----------|
| **Serviço backend no docker-compose.yml** | **Existe** |
| **Configuração** | build: ./backend; environment: DATABASE_URL=postgresql://vai_de_pix_user:vai_de_pix_pass@postgres:5432/vai_de_pix; depends_on: postgres (condition: service_healthy); command: python main.py; volumes: ./backend:/app. |

Nenhuma alteração necessária.

---

## ETAPA 4 — Build e subida

| Comando | Resultado |
|---------|-----------|
| **docker-compose build backend** | **OK** (exit code 0). |
| **docker-compose up -d backend** | **OK** — Container vaidepix-backend-1 Started. |
| **docker ps** | **OK** — vaidepix-backend-1 Up (health: starting); vaidepix-postgres-1 Up (healthy). |

---

## ETAPA 5 — Alembic dentro do container

| Comando (executado via `docker-compose exec -T backend`) | Resultado |
|----------------------------------------------------------|------------|
| **python -m alembic heads** | **OK** — retornou `9410e6e31f3c (head)`. |
| **python -m alembic current** | **OK** — conexão estabelecida; **nenhum erro de encoding**. Saída inclui Context impl PostgresqlImpl, DATABASE_URL presente, Engine criado com sucesso. |
| **python -m alembic upgrade head** | **FALHA** (exit code 1). |

### Erro no upgrade

- **Tipo:** `sqlalchemy.exc.ProgrammingError` / `psycopg2.errors.UndefinedTable`
- **Mensagem:** `relation "idempotency_keys" does not exist`
- **SQL:** `ALTER TABLE idempotency_keys ADD COLUMN status VARCHAR(20)`
- **Migration que falhou:** `idempotency_trilha5_status_expires.py` (revision `idem_trilha5`, down_revision `15d45461cc8f`).
- **Causa:** A migration `idempotency_trilha5_status_expires` **adiciona colunas** à tabela `idempotency_keys`, assumindo que ela já existe. A tabela `idempotency_keys` é **criada** pela migration `add_idempotency_keys_table.py` (revision `f8a9b0c1d2e3`), que pertence a outro ramo (cadeia 15d45461cc8f → a1b2c3d4e5f6 → … → f8a9b0c1d2e3). Na ordem de execução do Alembic, `idem_trilha5` foi aplicada **antes** da cadeia que cria `idempotency_keys`, resultando em tentativa de ALTER em tabela inexistente.
- **Migrations aplicadas antes da falha:**  
  → 85c9ce9f5c40 (Initial migration), 74e3a13f606b, c42fc5c6c743, final_pre_launch_critical_fixes, 3847e4a390ba, 15d45461cc8f (merge_heads), fix_accounts_type_001, idem_trilha5 (aqui falhou).

**Ação tomada:** Parada imediata; **não** foi feita correção automática de migrations ou schema (conforme regras).

---

## ETAPA 6 — Validação

- **alembic current** após upgrade: **não** executado (upgrade não concluiu).
- **Head esperado (9410e6e31f3c):** **não** alcançado.
- **Erro de encoding:** **Nenhum** — conexão e execução do Alembic dentro do container Linux ocorreram sem `UnicodeDecodeError` ou outro erro de encoding.

---

## ETAPA 7 — Relatório técnico

### Ambiente

- **Execução:** Dentro de container Docker (imagem backend, base python:3.11-slim, Linux).
- **Rede:** backend e postgres na mesma rede docker-compose; DATABASE_URL apontando para hostname `postgres`.
- **Encoding:** Paths e ambiente no container são Linux/UTF-8; problemas de encoding do Windows **não** se manifestam.

### Resultado do alembic upgrade

| Aspecto | Status |
|---------|--------|
| **Encoding** | **OK** — Conexão e comandos alembic (heads, current, upgrade) executados sem erro de encoding. |
| **Upgrade até head** | **ERRO** — Falha em `idempotency_trilha5_status_expires` com `UndefinedTable: relation "idempotency_keys" does not exist`. |
| **Causa da falha** | Ordem/dependência entre migrations: uma migration que altera `idempotency_keys` rodou antes da migration que cria essa tabela (outro ramo do grafo). |

### Head atual no banco

- **Não** foi possível confirmar com `alembic current` após upgrade (upgrade não terminou). O banco ficou em um estado intermediário (parte das migrations aplicadas; `idem_trilha5` não concluída).

### Confirmação de ausência de erros de encoding

- **Confirmada** — Nenhum `UnicodeDecodeError` nem outro erro de encoding. Conexão PostgreSQL e execução do Alembic dentro do container ocorreram normalmente.

### Status final

| Item | Status |
|------|--------|
| **Encoding (Docker Linux)** | **OK** — Problema de encoding do Windows eliminado no container. |
| **Alembic upgrade head** | **BLOQUEADO** — Falha por dependência de schema (tabela `idempotency_keys` inexistente quando `idem_trilha5` executa). |
| **Próximo passo** | Resolver ordem/dependência das migrations (ex.: ajustar down_revision ou lógica para que a tabela `idempotency_keys` exista antes de `idempotency_trilha5_status_expires`) **com autorização explícita**; não foi feita alteração automática. |

---

## Resumo

- **Ambiente Docker Linux:** Configurado e em uso; encoding não é mais obstáculo.
- **Alembic heads/current:** Funcionam no container; conexão ao PostgreSQL estável.
- **Upgrade:** Interrompido por erro de schema (tabela inexistente), **não** por encoding.
- **Regras respeitadas:** Nenhuma migration, schema ou código de produção foi alterado automaticamente; parada imediata e relatório gerado em caso de falha.

**Aguardando autorização explícita para qualquer alteração em migrations ou schema.**
