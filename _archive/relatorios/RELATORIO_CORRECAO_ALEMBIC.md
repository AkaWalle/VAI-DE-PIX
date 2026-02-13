# Relatório técnico — Correção da cadeia Alembic (ciclo e revisão duplicada)

**Data:** 2026-02-04  
**Escopo:** Remover ciclo e revisão duplicada; impacto mínimo; sem alterar schema aplicado.

---

## ETAPA 1 — Diagnóstico estrutural

### 1.1 Listagem das migrations em `backend/alembic/versions/`

| Arquivo | revision | down_revision |
|---------|----------|----------------|
| 85c9ce9f5c40_initial_migration.py | 85c9ce9f5c40 | None (base) |
| 74e3a13f606b_add_progress_percentage_to_goals_and_.py | 74e3a13f606b | 85c9ce9f5c40 |
| c42fc5c6c743_complete_schema_refactor_2025.py | c42fc5c6c743 | 74e3a13f606b |
| 3847e4a390ba_migrate_tags_data_and_remove_old_column.py | 3847e4a390ba | c42fc5c6c743 |
| final_pre_launch_critical_fixes.py | final_pre_launch_critical_fixes | c42fc5c6c743 |
| fix_accounts_type_column.py | fix_accounts_type_001 | c42fc5c6c743 |
| 15d45461cc8f_merge_heads.py | 15d45461cc8f | (3847e4a390ba, final_pre_launch_critical_fixes) |
| add_ledger_entries_table.py | **a1b2c3d4e5f6** | 15d45461cc8f |
| add_row_version_to_accounts.py | **a1b2c3d4e5f6** (duplicado) → **a9b0c1d2e3f4** | f8a9b0c1d2e3 |
| add_user_sessions_table.py | b2c3d4e5f6a7 | a1b2c3d4e5f6 |
| add_insight_cache_table.py | c3d4e5f6a7b8 | b2c3d4e5f6a7 |
| add_insight_feedback_table.py | d4e5f6a7b8c9 | a1b2c3d4e5f6 |
| add_user_insight_preferences_table.py | e5f6a7b8c9d0 | d4e5f6a7b8c9 |
| add_insights_last_notified_at_to_users.py | f6a7b8c9d0e1 | e5f6a7b8c9d0 |
| add_account_balance_snapshots.py | e7f8a9b0c1d2 | f6a7b8c9d0e1 |
| add_idempotency_keys_table.py | f8a9b0c1d2e3 | e7f8a9b0c1d2 |
| add_notifications_table.py | add_notifications | 15d45461cc8f |
| add_pagination_indexes.py | add_pagination_indexes | 15d45461cc8f |
| add_updated_at_to_categories.py | add_updated_at_categories | 15d45461cc8f |
| idempotency_trilha5_status_expires.py | idem_trilha5 | 15d45461cc8f |

### 1.2 Identificação explícita

- **Arquivos com revision ID duplicado:** O ID `a1b2c3d4e5f6` estava definido em dois arquivos:
  - `add_ledger_entries_table.py`
  - `add_row_version_to_accounts.py`

- **Arquivo que reutilizou ID indevidamente:**  
  **`add_row_version_to_accounts.py`** — migration mais nova (Create Date 2025-02-03; Trilha 6.2 row_version) reutilizou o mesmo revision ID da migration **`add_ledger_entries_table.py`** (Create Date 2025-02-02; ledger). O mais antigo (ledger) deve manter o ID; o mais novo (row_version) deve ter ID único.

- **Cadeia correta esperada (linearização conceitual a partir de 15d45461cc8f):**
  - Ramo que mantém `a1b2c3d4e5f6` em **add_ledger_entries_table**:  
    `15d45461cc8f` → `a1b2c3d4e5f6` (ledger) → `b2c3d4e5f6a7` → `c3d4e5f6a7b8` (head **c3d4e5f6a7b8**).
  - Ramo que sai de `a1b2c3d4e5f6` para insight_feedback e segue até row_version:  
    `a1b2c3d4e5f6` → `d4e5f6a7b8c9` → `e5f6a7b8c9d0` → `f6a7b8c9d0e1` → `e7f8a9b0c1d2` → `f8a9b0c1d2e3` → **[novo ID]** (add_row_version) = head **a9b0c1d2e3f4**.

### 1.3 Confirmação

- **add_ledger_entries_table.py:** Mantém o revision ID original `a1b2c3d4e5f6` (mais antigo; ledger).
- **add_row_version_to_accounts.py:** Era o que reutilizava `a1b2c3d4e5f6`; recebeu novo ID único.

---

## ETAPA 2 — Correção mínima da revisão duplicada

### 2.1 Escolha do arquivo a alterar

- **Manter ID original:** `add_ledger_entries_table.py` (revision `a1b2c3d4e5f6`) — mais antigo cronológica e semanticamente (ledger é base).
- **Alterar para novo ID:** `add_row_version_to_accounts.py` — migration mais nova (2025-02-03) que reutilizou o mesmo ID.

### 2.2 Novo revision ID

- **Novo ID (único, padrão Alembic 12 caracteres hex):** `a9b0c1d2e3f4`  
- Verificado que `a9b0c1d2e3f4` não aparece em nenhum outro arquivo em `backend/alembic/versions/`.

### 2.3 Alterações realizadas

**Arquivo:** `backend/alembic/versions/add_row_version_to_accounts.py`

- **revision:** `"a1b2c3d4e5f6"` → `"a9b0c1d2e3f4"`
- **down_revision:** mantido `"f8a9b0c1d2e3"` (predecessor lógico correto: add_idempotency_keys_table).
- Docstring atualizada (Revision ID / Revises) para refletir o novo ID.
- **Não alterado:** `upgrade()`, `downgrade()`, ordem lógica do schema.

---

## ETAPA 3 — Quebra explícita do ciclo

- Após a troca do revision ID em `add_row_version_to_accounts.py`, o grafo foi reavaliado.
- **Ciclo removido:** Não existe mais nó duplicado; a aresta que fechava o ciclo era `f8a9b0c1d2e3` → `a1b2c3d4e5f6` (add_row_version). Com add_row_version usando `a9b0c1d2e3f4`, a cadeia passa a ser `f8a9b0c1d2e3` → `a9b0c1d2e3f4` (head distinto), sem retorno a `a1b2c3d4e5f6`.
- **Merge revision:** Não foi necessária para remover o ciclo. Não foi criada.

---

## ETAPA 4 — Auditoria pós-correção

### 4.1 Comandos executados

```powershell
cd backend
$env:DATABASE_URL="postgresql://vai_de_pix_user:vai_de_pix_pass@localhost:5432/vai_de_pix"
python -m alembic heads
python -m alembic history --verbose
```

### 4.2 Resultados

- **`alembic heads`:** Executou com **sucesso** (exit code 0). Nenhum `CycleDetected`; nenhum aviso de revisão duplicada.
- **`alembic history --verbose`:** Executou com sucesso; lista completa de revisões exibida; **nenhum ciclo** na cadeia.

### 4.3 Validação explícita

| Critério | Resultado |
|----------|-----------|
| **Exatamente 1 head** | **Não.** Existem **7 heads** (ramos já existentes a partir de 15d45461cc8f e c42fc5c6c743): `c3d4e5f6a7b8`, `add_notifications`, `add_pagination_indexes`, `a9b0c1d2e3f4`, `add_updated_at_categories`, `fix_accounts_type_001`, `idem_trilha5`. |
| **Nenhum ciclo** | **Sim.** Nenhum ciclo detectado; grafo acíclico. |
| **Cadeia linear e consistente** | Cadeias são consistentes (cada revisão com um único down_revision ou merge explícito). A história não é uma única linha: há múltiplos ramos por desenho (várias migrations com mesmo parent 15d45461cc8f). |

**Observação:** Obter **exatamente 1 head** exigiria uma **merge revision** que unisse os 7 heads. Conforme regra (“NÃO use merge revision, a menos que seja inevitável. Se for inevitável, PARE e reporte antes de criar”), **não foi criada** merge revision. O objetivo desta correção era apenas remover **ciclo e revisão duplicada**, o que foi alcançado.

---

## ETAPA 5 — Relatório obrigatório

### O que causou o problema

1. **Revisão duplicada:** O revision ID `a1b2c3d4e5f6` foi usado em duas migrations: em `add_ledger_entries_table.py` (corretamente) e novamente em `add_row_version_to_accounts.py` (erro de cópia/colagem ou geração).
2. **Ciclo:** `add_row_version_to_accounts.py` declarava `down_revision = "f8a9b0c1d2e3"` (fim de um ramo) e `revision = "a1b2c3d4e5f6"`. Isso criava a aresta `f8a9b0c1d2e3` → `a1b2c3d4e5f6`, fechando ciclo com o nó já existente `a1b2c3d4e5f6` (add_ledger_entries).

### Qual arquivo teve o revision alterado

- **`backend/alembic/versions/add_row_version_to_accounts.py`**

### Revision antigo vs novo

| | Antigo | Novo |
|--|--------|------|
| **revision** | `a1b2c3d4e5f6` | `a9b0c1d2e3f4` |
| **down_revision** | `f8a9b0c1d2e3` | `f8a9b0c1d2e3` (inalterado) |

### Por que a correção é segura

- Apenas o **identificador** da revisão (revision ID) foi alterado em um único arquivo; a **ordem lógica** (down_revision = idempotency_keys) permanece a mesma.
- **Nenhum** `upgrade()` ou `downgrade()` foi modificado; o schema aplicado por essa migration continua idêntico.
- Nenhuma migration foi apagada; nenhum outro arquivo referencia o antigo ID `a1b2c3d4e5f6` para add_row_version (a referência era implícita pela duplicata).
- Banco **não** foi alterado; **não** foi executado `alembic upgrade`; a correção é apenas no grafo de revisões em disco.

### Status final do Alembic

| Aspecto | Status |
|---------|--------|
| **Ciclo** | **OK** — removido. |
| **Revisão duplicada** | **OK** — removida (um único arquivo com novo ID). |
| **`alembic heads`** | **OK** — executa sem erro. |
| **`alembic history`** | **OK** — executa sem erro; cadeia consistente e acíclica. |
| **Head único** | **NÃO OK** — existem 7 heads (ramos pré-existentes); unificação exigiria merge revision (não realizada por regra). |

**Declaração final:**  
**Alembic: OK quanto a ciclo e revisão duplicada; grafo utilizável para auditoria e, quando desejado, para upgrade. Head único não foi buscado para não criar merge revision sem instrução explícita.**

### O que NÃO foi feito (conforme regras)

- **NÃO** foi executado `alembic upgrade`.
- **NÃO** foi apagada nenhuma migration.
- **NÃO** foi alterada lógica de upgrade/downgrade.
- **NÃO** foi modificado schema fora do Alembic.
- **NÃO** foi feito squash.
- **NÃO** foi criada merge revision (múltiplos heads permanecem).

---

**Aguardando instruções para próximos passos (ex.: criar merge revision para head único ou prosseguir com deploy).**
