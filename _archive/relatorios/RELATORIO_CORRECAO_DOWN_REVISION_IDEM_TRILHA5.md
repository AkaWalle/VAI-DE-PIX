# Relatório técnico — Correção da ordem de execução (down_revision idem_trilha5)

**Data:** 2026-02-04  
**Objetivo:** Garantir que a tabela `idempotency_keys` seja criada antes de qualquer ALTER, sem alterar schema, SQL ou histórico.

---

## CONTEXTO

- **Ambiente:** Docker (Linux)  
- **Encoding:** OK  
- **Alembic head atual:** 9410e6e31f3c  
- **Erro no upgrade (anterior):** `relation "idempotency_keys" does not exist`  
- **Migration problemática:** `idempotency_trilha5_status_expires.py` (revision: `idem_trilha5`)  
- **Migration que cria a tabela:** `add_idempotency_keys_table.py` (revision: `f8a9b0c1d2e3`)  

---

## ETAPA 1 — Auditoria da dependência

| Item | Valor |
|------|--------|
| **Arquivo** | `backend/alembic/versions/idempotency_trilha5_status_expires.py` |
| **revision** | `"idem_trilha5"` |
| **down_revision (antes)** | `"15d45461cc8f"` — **não** incluía `f8a9b0c1d2e3` (problema). |

A migration `idem_trilha5` adiciona colunas à tabela `idempotency_keys`, mas dependia de `15d45461cc8f` (merge_heads). A tabela `idempotency_keys` é criada em `f8a9b0c1d2e3`, que pertence a outro ramo (15d45461cc8f → a1b2c3d4e5f6 → … → f8a9b0c1d2e3). Na ordem de execução do Alembic, `idem_trilha5` podia rodar **antes** de `f8a9b0c1d2e3`, gerando `UndefinedTable`.

---

## ETAPA 2 — Correção da dependência

**Alteração realizada:** Somente o campo **down_revision**.

| Campo | Antes | Depois |
|-------|--------|--------|
| **down_revision** | `"15d45461cc8f"` | `"f8a9b0c1d2e3"` |

**Não alterado:** revision ID, upgrade(), downgrade(), SQL, imports.

---

## ETAPA 3 — Validação do grafo

| Comando | Resultado |
|---------|-----------|
| **python -m alembic heads** | **OK** — retorna `9410e6e31f3c (head)`. |
| **python -m alembic history --verbose** | **OK** — nenhum ciclo; head 9410e6e31f3c; `idem_trilha5` com **Parent: f8a9b0c1d2e3** (aparece **depois** de `f8a9b0c1d2e3`). |

---

## ETAPA 4 — Upgrade controlado

| Comando | Resultado |
|---------|-----------|
| **python -m alembic upgrade head** | **OK** (exit code 0). Nenhum erro de `UndefinedTable`. Upgrade completo até `9410e6e31f3c`. |

Ordem aplicada: … → `f8a9b0c1d2e3` (add idempotency_keys table) → `idem_trilha5` (add columns) → … → merge 9410e6e31f3c.

---

## ETAPA 5 — Pós-upgrade

| Verificação | Resultado |
|-------------|-----------|
| **python -m alembic current** | **OK** — retorna `9410e6e31f3c (head) (mergepoint)`. |
| **Tabela idempotency_keys existe** | **OK** — confirmado via `\d idempotency_keys` no PostgreSQL. |
| **Colunas status e expires_at existem** | **OK** — presentes na tabela (status varchar(20) NOT NULL, expires_at timestamp with time zone). |

---

## ETAPA 6 — Relatório técnico

### Causa raiz

- **Dependência ausente:** A migration `idem_trilha5` (que altera a tabela `idempotency_keys`) tinha `down_revision = "15d45461cc8f"`. Assim, ela era aplicada em um ramo paralelo ao que contém `f8a9b0c1d2e3` (criação de `idempotency_keys`). Dependendo da ordem de aplicação, `idem_trilha5` rodava antes da criação da tabela, gerando `relation "idempotency_keys" does not exist`.

### Arquivo alterado

- **`backend/alembic/versions/idempotency_trilha5_status_expires.py`**

### Alteração exata

- **down_revision:** de `"15d45461cc8f"` para `"f8a9b0c1d2e3"`.

### Resultado do upgrade

- **Upgrade:** Concluído com sucesso até o head `9410e6e31f3c`.  
- **UndefinedTable:** Nenhum.  
- **Head atual no banco:** `9410e6e31f3c`.  
- **Tabela idempotency_keys:** Existe, com colunas `status` e `expires_at` e demais colunas/índices esperados.

### Regras respeitadas

- Nenhuma nova migration criada.  
- Nenhuma nova merge criada.  
- Nenhum SQL alterado.  
- Merge 9410e6e31f3c não foi alterada.  
- Ajuste limitado ao down_revision de `idem_trilha5`.

---

## Status final

**OK** — Ordem de execução corrigida; upgrade completo; head 9410e6e31f3c; tabela `idempotency_keys` e colunas validadas.
