# Modelo de Ameaças — Vai de Pix

Documento da Trilha 8. Identificação e mitigação de ataques lógicos e técnicos em sistema financeiro.

---

## 1. Atores

| Ator | Descrição | Risco |
|------|-----------|--------|
| **Usuário legítimo** | Acesso normal; pode errar ou abusar dentro do próprio contexto | Retry excessivo; payloads malformados; enumeração de IDs |
| **Atacante autenticado** | Possui credenciais válidas; tenta escalar privilégios ou corromper dados de outros | Transferência cruzada (user_id ≠ account.user_id); acesso a contas de terceiros |
| **Atacante com token vazado** | Token JWT ou refresh vazado; janela até revogação | Replay de requisições; exfiltração de dados do dono do token |
| **Falha operacional** | Deploy, banco, rede; não intencional | Estado inconsistente; jobs duplicados; ledger divergente |

---

## 2. Superfícies de ataque

| Superfície | Descrição | Mitigações |
|------------|-----------|------------|
| **POST /api/transactions** | Criação de transação/transferência; altera saldo e ledger | Idempotency-Key; ownership (account.user_id == current_user.id); locks; ledger append-only |
| **Transferências** | Duas pernas (débito/crédito); saldo limitado | lock_accounts_ordered; validação de saldo; mesma propriedade (from/to do mesmo user_id) |
| **Idempotency-Key** | Header por endpoint; cache de resposta | Escopo (user_id + key + endpoint); hash do payload; 409 em conflito; TTL 24h |
| **Refresh tokens** | Cookie HttpOnly; renovação de access token | Hash armazenado; revogação; rotação; Secure/SameSite em produção |
| **Jobs** | Insights, recorrências, snapshots, notificações | Advisory lock por job; safe_insert_or_ignore; chave natural (user_id + período) |

---

## 3. Classes de ataque

| Classe | Descrição | Mitigação / status |
|--------|-----------|--------------------|
| **Replay financeiro** | Reenviar mesma operação com payload levemente diferente (ordem de campos, floats) para tentar duplicar efeito | Idempotency: hash do body (JSON ordenado); mesma key → mesma resposta; testes em test_threat_model.py |
| **Abuso de retry** | Muitas requisições com mesma Idempotency-Key ou retries agressivos | 409 em conflito em andamento; rate limit (SlowAPI) em login; testes de retry agressivo |
| **Corrida contra lock** | Duas transferências simultâneas da mesma conta com saldo limitado | pg_advisory_xact_lock + ordem determinística; apenas uma conclui; outra 400/409 |
| **Enumeração de IDs** | Descobrir account_id, transaction_id de outros usuários | Todas as rotas filtram por current_user.id; 404 genérico (não vazar existência) |
| **Manipulação de payload idempotente** | Mesma key, payload diferente → tentar obter efeito diferente | Hash do body; payload diferente → 400 (Bad Request); documentado em IDEMPOTENCY.md |
| **Exploração de timing** | Clock skew entre workers para forçar execução paralela do mesmo job | Advisory lock (pg_try_advisory_lock); apenas um worker executa; métricas job_lock_contended_total |

---

## 4. Matriz de mitigação (resumo)

- **Ledger append-only:** nenhum UPDATE/DELETE em ledger_entries; reconstrução de saldo sempre possível.
- **Ownership:** validate_ownership(account.user_id, user_id); contas e transações sempre do current_user.
- **Idempotência:** (user_id, key, endpoint) + request_hash; retry seguro sem duplicação.
- **Locking:** advisory locks (conta/metas) + job lock; ordem determinística para evitar deadlock.
- **Refresh token:** hash no banco; revogação; cookie HttpOnly/Secure.
- **Auditoria:** ledger + transaction + soft delete permitem reconstruir estado (ver AUDITABILITY.md).

---

## Referências

- `docs/IDEMPOTENCY.md` — uso de Idempotency-Key
- `docs/FINANCIAL-RULES.md` — invariantes e locking
- `docs/AUDITABILITY.md` — reconstrução e forense
- `backend/tests/test_threat_model.py` — testes de abuso lógico
