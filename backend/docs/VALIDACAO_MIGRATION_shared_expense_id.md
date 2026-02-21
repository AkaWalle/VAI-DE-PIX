# Validação prática: migration add_transaction_shared_expense_fk

## 1. Ordem das operações (PostgreSQL)

| Ordem | Operação        | Correto? | Motivo |
|-------|-----------------|----------|--------|
| 1     | add_column      | Sim      | Coluna precisa existir antes de índice e FK. |
| 2     | create_index    | Sim      | Índice pode ser criado antes ou depois da FK; antes é o usual. |
| 3     | create_foreign_key | Sim   | FK valida e referencia a coluna; coluna e referência já existem. |

**Conclusão:** A ordem está correta para PostgreSQL. O downgrade (drop constraint → drop index → drop column) também está correta.

---

## 2. Lock em tabela populada (milhões de linhas)

| Operação        | Lock no PG        | Efeito em produção |
|-----------------|-------------------|--------------------|
| ADD COLUMN nullable | ACCESS EXCLUSIVE | PG 11+: duração **muito curta** (só metadado, sem rewrite). Seguro. |
| CREATE INDEX (padrão) | SHARE           | **Bloqueia INSERT/UPDATE/DELETE** durante **toda** a construção do índice. Em milhões de linhas pode ser **minutos a dezenas de minutos**. Risco alto. |
| CREATE FOREIGN KEY   | Lock de validação | Em coluna só NULL, validação é rápida. Risco baixo. |

**Risco principal:** `CREATE INDEX` sem `CONCURRENTLY` em tabela grande bloqueia writes.

**Mitigação aplicada na migration:** uso de `CREATE INDEX CONCURRENTLY` dentro de `autocommit_block()`, para não bloquear writes durante a criação do índice.

---

## 3. Tipo sa.String() vs shared_expenses.id

No modelo:

- `shared_expenses.id` = `Column(String, ...)` → no PostgreSQL vira `VARCHAR`/`TEXT`.
- `transactions.shared_expense_id` = `Column(String, ...)` → mesmo tipo.

**Conclusão:** `sa.String()` é compatível com `shared_expenses.id`. Não é necessário usar `postgresql.UUID` porque o modelo usa string para IDs.

---

## 4. postgresql_using no índice

Índice é B-tree em coluna string, caso padrão. Em PostgreSQL o default é `USING btree`.

**Conclusão:** Não é necessário especificar `postgresql_using`.

---

## 5. Downgrade seguro

Ordem implementada:

1. `drop_constraint` (FK) — libera a coluna para ser removida.
2. `drop_index` — com `postgresql_concurrently=True` em `autocommit_block()` para não bloquear writes.
3. `drop_column` — remove a coluna.

**Conclusão:** Downgrade está correto e seguro. Com a migration idempotente, o downgrade também verifica existência antes de dropar.

---

## 6. Produção com dados reais – o que foi garantido

- Coluna **nullable**: linhas existentes não são alteradas (ficam NULL).
- **Sem DEFAULT**: não há backfill; ADD COLUMN é só metadado no PG 11+.
- **Índice CONCURRENTLY**: writes não são bloqueados durante a criação do índice.
- **Idempotência**: se a coluna já existir (retry, execução duplicada ou migração parcial), a migration não falha e completa índice/FK se faltarem.
- **Downgrade idempotente**: se a coluna já foi removida, o downgrade não faz nada.

---

## 7. Coluna já existir (re-executar migration)

Sem idempotência: `op.add_column` dispara erro no PostgreSQL:

```text
sqlalchemy.exc.ProgrammingError: column "shared_expense_id" of relation "transactions" already exists
```

**Mitigação aplicada:** checagem em `information_schema.columns`. Se a coluna já existe, a migration só cria índice e FK se ainda não existirem e sai sem erro.

---

## 8. Idempotência

- **Antes:** Não era idempotente; segunda execução falhava em `add_column`.
- **Depois:** Idempotente:
  - Se coluna existe → cria apenas índice e FK se faltarem.
  - Se coluna não existe → fluxo completo (add column → index CONCURRENTLY → FK).
  - Downgrade verifica existência da coluna antes de dropar.

---

## Riscos residuais

1. **CREATE INDEX CONCURRENTLY** pode falhar (ex.: deadlock, cancelamento). Se falhar, o índice pode ficar INVALID; é preciso dropar o índice inválido e rodar a migration de novo. Não é lock prolongado, mas exige atenção em caso de falha.
2. **autocommit_block** faz commit implícito; a migration deixa de ser atômica com outras operações do mesmo upgrade. Para esta migration (uma coluna + índice + FK), o comportamento é aceitável em produção.

---

## Checklist produção (tabela grande)

- [x] ADD COLUMN nullable (lock curto no PG 11+).
- [x] CREATE INDEX CONCURRENTLY em autocommit_block.
- [x] FK com nome explícito e ON DELETE SET NULL.
- [x] Idempotência (coluna/index/FK já existentes).
- [x] Downgrade na ordem correta e idempotente.
- [x] Tipo da coluna compatível com shared_expenses.id.
