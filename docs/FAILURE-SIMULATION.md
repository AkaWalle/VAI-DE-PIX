# Simulação de Falhas Reais — Trilha 3

Documento do Roadmap Técnico: como o sistema falha e como se recupera.

---

## 3.1 Falhas de banco

| Cenário | Comportamento | Validação |
|--------|----------------|-----------|
| **DB fora do ar** | `get_db` ou query levanta exceção; rota retorna 500; resposta não expõe stack trace nem mensagem interna. | `tests/test_failure_db.py` |
| **Erro no commit (constraint, deadlock)** | `atomic_transaction` faz rollback; nenhum dado parcial persistido; usuário recebe 500 (ou 400 se tratado). | Teste de rollback + contagem de registros |
| **Timeout** | Conexão/SQL pode estourar timeout; sessão é fechada no `finally` de `get_db`. | — |

**Artefatos:** `core/database_utils.py` (`atomic_transaction`), `tests/test_failure_db.py`.

---

## 3.2 Falhas de jobs

| Cenário | Comportamento | Validação |
|--------|----------------|-----------|
| **Job de insights quebra** | Exceção capturada; `db.rollback()`; log + métrica `insights_errors_total`; cache não é atualizado (consistente). | `core/recurring_job.py` try/except |
| **Job rodando duas vezes** | Insights: leitura de cache por `user_id`; recálculo sob demanda; idempotência por chave de usuário. Recorrências: `next_run` atualizado após sucesso. | Lógica em `run_insights_job`, `execute_recurring_transactions` |
| **Job lento** | Scheduler em thread separada; não bloqueia API. Timeout depende do banco. | — |

**Artefatos:** `core/recurring_job.py` (rollback em cada automação e no job de insights).

### 3.2.1 Snapshots e conciliação (Trilha 5)

| Cenário | Comportamento | Validação |
|--------|----------------|-----------|
| **Job de snapshots mensais quebra** | Exceção capturada; `db.rollback()`; log; ledger não é alterado. | `execute_monthly_snapshots` em `recurring_job.py` |
| **Job de conciliação (reconcile_snapshots)** | Recalcula saldo via ledger, compara com snapshot; divergência > ε → log ERROR; sem valores financeiros na mensagem; Sentry pode receber evento genérico. | `services/balance_snapshot_service.reconcile_snapshots`, `execute_reconcile_snapshots` |
| **Divergência de snapshot** | Log ERROR com account_id e snapshot_date (mês); não expõe saldo/valor em texto. Ver INCIDENT-PLAYBOOK. | — |

**Artefatos:** `services/balance_snapshot_service.py`, `core/recurring_job.py` (monthly_balance_snapshots, reconcile_snapshots).

---

## 3.3 Falhas de autenticação

| Cenário | Comportamento esperado |
|--------|-------------------------|
| **Refresh token revogado** | `/auth/refresh` retorna 401; cookie removido; logout limpo. |
| **Cookie ausente** | `/auth/refresh` retorna 401 (sem loop). |
| **Token expirado** | `verify_token` levanta 401; cliente deve renovar com refresh ou fazer login. |
| **Usuário inativo** | `verify_token` rejeita (`is_active=False`); 401. |

**Artefatos:** `auth_utils.py` (verify_token, verify_refresh_token), `routers/auth.py` (logout, refresh).

---

## 3.4 Falhas de frontend (API)

| Cenário | Comportamento esperado |
|--------|-------------------------|
| **API 500** | Resposta 500; mensagem genérica; sem vazamento de stack/traceback. |
| **API lenta** | Timeout no cliente; frontend deve mostrar loading e retry controlado. |
| **API offline** | Erro de rede; mensagem clara; sem loop infinito. |

**Validação:** Testes de integração + boas práticas no frontend (loading states, retry, mensagens).

---

## Referências

- `FINANCIAL-RULES.md` — invariantes e ledger.
- `READY-TO-SCALE-CHECKLIST.md` — observabilidade, health check, Sentry.
