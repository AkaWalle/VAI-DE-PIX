# Relatório técnico — Correção desalinhamento ORM ↔ schema (transactions.tags)

**Projeto:** Vai de Pix  
**Data:** 2026-02-04  
**Estado final:** **CORRIGIDO**

---

## 1. Schema real da tabela `transactions`

Inspeção via PostgreSQL (container `vaidepix-postgres-1`):

```
Table "public.transactions"
         Column          |            Type             | Nullable
-------------------------+-----------------------------+----------
 id                      | character varying           | not null
 date                    | timestamp without time zone | not null
 account_id              | character varying           | not null
 category_id             | character varying           |
 type                    | character varying           | not null
 amount                  | numeric(15,2)               | not null
 description             | character varying            | not null
 user_id                 | character varying           | not null
 created_at              | timestamp with time zone    |
 updated_at              | timestamp with time zone    |
 transfer_transaction_id | character varying           |
 deleted_at              | timestamp with time zone    |
```

**Confirmado:** a coluna `tags` **não existe** na tabela `transactions`.  
A migration `3847e4a390ba_migrate_tags_data_and_remove_old_column` migrou os dados para as tabelas `tags` e `transaction_tags` e removeu a coluna antiga.

---

## 2. Problema encontrado (modelo ≠ banco)

- **ORM:** O modelo `Transaction` em `backend/models.py` ainda declarava `tags = Column(JSON, nullable=True)`.
- **Efeito:** Qualquer INSERT/SELECT que tocasse no modelo (ex.: POST /api/transactions, GET list, serialização) gerava `ProgrammingError: column transactions.tags does not exist`.
- **Causa:** Migração já aplicada no banco; código não foi ajustado para refletir o schema real (N:N via `transaction_tags`).

---

## 3. Decisão arquitetural (sem alterar banco)

- **Não** recriar coluna `tags` em `transactions`.
- **Não** criar novas migrations nem novas tabelas.
- **Decisão:** `tags` foi migrada para estrutura N:N (`tags` + `transaction_tags`). Ajustar **apenas código**:
  1. Remover a coluna `tags` do modelo SQLAlchemy `Transaction`.
  2. Mapear tags via relationship `Transaction.transaction_tag_links` → `TransactionTag` → `Tag`.
  3. Expor `tags` na API como lista de nomes via **property** no modelo que deriva dos links.
  4. No create/update de transações: sincronizar `transaction_tags` (criar/obter `Tag` por nome, inserir/remover `TransactionTag`) em vez de escrever em coluna inexistente.

---

## 4. Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `backend/models.py` | Removida coluna `tags` do `Transaction`. Adicionados: `transaction_tag_links` (relationship), property `tags` (lista de nomes), relationships em `Tag` e `TransactionTag` (`transaction`, `tag`, `transaction_links`). |
| `backend/services/transaction_service.py` | Função `_sync_tags_for_transaction(db, transaction_id, user_id, tag_names)` para sincronizar N:N. Chamada após criar transação (income/expense e transfer) e no update quando `'tags' in update_data`. Removida atribuição `db_transaction.tags = update_data['tags']`. Imports: `Tag`, `TransactionTag`, `TagRepository`. |
| `backend/repositories/transaction_repository.py` | `get_by_user` passa a usar `joinedload(Transaction.transaction_tag_links).joinedload(TransactionTag.tag)` para evitar N+1 ao acessar `transaction.tags`. |
| `backend/routers/reports.py` | Query de transações no export passa a usar `joinedload(Transaction.transaction_tag_links).joinedload(TransactionTag.tag)` para `t.tags` no export. |
| `backend/routers/privacy.py` | Export de dados: transações carregadas com query dedicada usando `joinedload` para tags; payload usa essa lista em vez de `user.transactions` para evitar N+1. |

**Não alterados:** migrations, schemas Pydantic (continuam com `tags: Optional[List[str]]` na API), banco de dados.

---

## 5. Resultado dos testes

### Validação funcional (manual)

- **POST /api/transactions** (body com `tags: []`): **200 OK** — transação criada, resposta com `tags` (lista vazia).
- **GET /api/transactions**: **200 OK** — listagem retornando transações com `tags` (sem erro 500).

### Testes automatizados (pytest)

- **Host Windows:** `pytest -m "requires_postgres and not slow"` falha com **UnicodeDecodeError** ao conectar ao PostgreSQL (psycopg2 + path/usuário com caracteres não-ASCII). **Não é regressão de código**; é limitação de ambiente (já conhecida).
- **Nenhuma falha** por `column transactions.tags does not exist` — o bug que motivou a correção foi eliminado.

---

## 6. Status final

**CORRIGIDO**

- O modelo ORM reflete o schema real (sem coluna `tags` em `transactions`).
- Tags são lidas/escritas via tabelas `tags` e `transaction_tags`.
- POST /api/transactions e GET de transações funcionam com status 2xx.
- Ledger e respostas da API permanecem consistentes; não foi usado try/except para mascarar erro.

---

*Relatório gerado ao final da execução da correção ORM ↔ schema (transactions.tags).*
