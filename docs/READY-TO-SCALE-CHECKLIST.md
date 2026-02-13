# Checklist “Pronto para Escalar” — Vai de Pix

Documento da Trilha 4 do Roadmap Técnico.  
**Objetivo:** Garantir que crescimento não exija reescrita; arquitetura, banco, observabilidade, operação e produto alinhados.

---

## 4.1 Arquitetura

| Item | Status | Nota |
|------|--------|------|
| Ledger append-only | ✔ | ledger_entries sem UPDATE/DELETE; ver FINANCIAL-RULES.md |
| Cache explícito | ✔ | InsightCache para insights; cache nunca é fonte da verdade para saldo |
| Snapshots de saldo (Trilha 5) | ✔ | AccountBalanceSnapshot; job mensal + conciliação; ledger fonte da verdade |
| Idempotência (Trilha 5) | ✔ IMPLEMENTADO | POST /api/transactions, POST /api/goals; header Idempotency-Key; safe retry garantido; ver docs/IDEMPOTENCY.md |
| Concorrência row_version (Trilha 6.2) | ✔ | row_version em Account; SELECT FOR UPDATE nas contas; sync com optimistic locking; 409 em conflito; tests/test_concurrency.py |
| Locking forte (Trilha 6) | ✔ IMPLEMENTADO | pg_advisory_xact_lock em contas/metas; db/locks.py; ordem determinística; tests/test_db_locking.py (PostgreSQL) |
| Jobs isolados | ✔ | APScheduler; insights, budget_alert, recurring_transactions, weekly notifications, snapshots, reconcile |
| Locking transacional (Trilha 7) | ✔ IMPLEMENTADO | core/job_lock.py; pg_try_advisory_lock por job; apenas 1 worker por job; ver docs/OBSERVABILITY.md |
| Jobs idempotentes (Trilha 7) | ✔ | safe_insert_or_ignore; chave natural + UNIQUE; InsightCache e notificações sem duplicação |
| Execução segura multi-worker (Trilha 7) | ✔ | test_job_concurrency.py; métricas job_lock_*, job_duration_*, job_failures_total |
| Redis opcional | — | Futuro: cache distribuído / fila |
| Fila assíncrona (ex.: Celery) | — | Futuro: tarefas pesadas fora do processo HTTP |

---

## 4.2 Banco

| Item | Status | Nota |
|------|--------|------|
| Índices confirmados | ✔ | idx_transactions_*, idx_ledger_*, idx_accounts_*, etc. |
| Paginação obrigatória | ✔ | Transações, notificações: skip/limit (ex.: limit máx 100) |
| Queries explicáveis (EXPLAIN) | — | Revisar em produção para listagens pesadas |

---

## 4.3 Observabilidade

| Item | Status | Nota |
|------|--------|------|
| Logs estruturados | ✔ | core/logging_config; extra em logger |
| Sentry | ✔ | Integração configurável |
| Métricas (latência, erro) | ✔ | GET /metrics (Prometheus); insights_* e job_* (Trilha 7); ver docs/OBSERVABILITY.md |
| Health check | ✔ | GET /health (ou equivalente) |

---

## 4.4 Operação

| Item | Status | Nota |
|------|--------|------|
| Backup automatizado | ✔ | Ver docs/BACKUP-POSTGRESQL.md |
| Restore testado | ✔ | Documentado |
| Feature flags | ✔ | Ex.: ENABLE_INSIGHTS |
| Rollback de deploy | ✔ | Via Vercel/Railway/Git; sem estado local crítico em disco |

---

## 4.5 Produto

| Item | Status | Nota |
|------|--------|------|
| Exportação de dados | ✔ | GET /api/privacy/export (Trilha 2.3) |
| Importação CSV | — | Pendente produto; se aplicável |
| Política de privacidade | — | Pendente produto; página/URL legal |
| Termos de uso | — | Pendente produto; página/URL legal |

---

## 4.6 Fechamento “Production-Grade” (Trilhas 8–13)

| Item | Status | Nota |
|------|--------|------|
| Threat model (Trilha 8) | ✔ IMPLEMENTADO | docs/THREAT-MODEL.md; atores, superfícies, classes de ataque; tests/test_threat_model.py |
| Stress test (Trilha 9) | ✔ | tests/test_load_simulation.py; 1000 tx sequenciais, 100 transferências concorrentes, 50 jobs, 10k ledger; SLOs em docs/OBSERVABILITY.md |
| Auditabilidade (Trilha 10) | ✔ | docs/AUDITABILITY.md; reconstrução de saldo, auditoria de transferência, reversões; tests/test_auditability.py |
| Versionamento de regras (Trilha 11) | ✔ | backend/domain/financial_policies/ (ledger_v1, transfers_v1, goals_v1); tests/test_policy_versions.py |
| Recovery testado (Trilha 12) | ✔ | docs/INCIDENT-PLAYBOOK.md expandido (ledger inconsistente, saldo divergente, job preso, 409, DB read-only, restore parcial); tests/test_recovery.py |

---

## Referências cruzadas (Trilhas 1–13)

| Trilha | Artefato | Uso no checklist |
|--------|----------|-------------------|
| 1 | docs/FINANCIAL-RULES.md, tests/test_financial_invariants.py | Ledger append-only, invariantes |
| 2 | docs/DATA-CLASSIFICATION.md, docs/DATA-RETENTION.md, GET/POST /api/privacy/* | Exportação, LGPD |
| 3 | docs/FAILURE-SIMULATION.md, docs/INCIDENT-PLAYBOOK.md, tests/test_failure_*.py | Resiliência, rollback |
| 5 | AccountBalanceSnapshot, balance_snapshot_service, reconcile_snapshots, tests/test_balance_snapshots.py | Snapshots, conciliação |
| 5 (Idempotência) | idempotency_keys (status, expires_at), middleware/idempotency.py, idempotency_service, tests/test_idempotency*.py, docs/IDEMPOTENCY.md | Idempotência real; safe retry; transação e meta |
| 6 | db/locks.py, advisory locks (pg_advisory_xact_lock), TransactionService e goals, tests/test_db_locking.py, docs/FINANCIAL-RULES.md §8 | Locking forte; ordem determinística; evita deadlock e double-spend |
| 6.2 | row_version em Account, ledger_utils.ConcurrencyConflictError, TransactionService 409, tests/test_concurrency.py | row_version, SELECT FOR UPDATE |
| 7 | core/job_lock.py, safe_insert_or_ignore, prometheus_metrics (job_*), test_job_concurrency.py, docs/OBSERVABILITY.md | Locking transacional; jobs idempotentes; execução segura multi-worker |
| 8 | docs/THREAT-MODEL.md, tests/test_threat_model.py | Threat model; replay, idempotency scope, transferência cruzada, retry agressivo, job paralelo |
| 9 | tests/test_load_simulation.py, docs/OBSERVABILITY.md (SLOs) | Stress/carga; limites operacionais; alertas recomendados |
| 10 | docs/AUDITABILITY.md, tests/test_auditability.py | Auditoria e forense; reconstrução de saldo; reversões no ledger |
| 11 | domain/financial_policies/ (ledger_v1, transfers_v1, goals_v1), tests/test_policy_versions.py | Versionamento explícito de regras; compatibilidade v1 |
| 12 | docs/INCIDENT-PLAYBOOK.md (runbooks 8–13), tests/test_recovery.py | Ledger inconsistente; saldo divergente; job preso; 409; DB read-only; restore parcial; backfill idempotente |

---

## Resumo

- **Trilhas 1–3** entregam regras financeiras documentadas, invariantes testados, LGPD documentada e simulação de falhas.
- **Trilha 4** consolida este checklist; itens “—” são pendências de produto ou evolução futura (Redis, Celery, exportação, páginas legais).
- **Trilhas 8–13** elevam o sistema a “resiliente, auditável e seguro contra abuso”: threat model, stress test, auditabilidade, versionamento de regras, recovery testado (docs/THREAT-MODEL.md, docs/AUDITABILITY.md, docs/INCIDENT-PLAYBOOK.md, domain/financial_policies/, tests/test_threat_model.py, test_load_simulation.py, test_auditability.py, test_policy_versions.py, test_recovery.py).
- Referências: docs/FINANCIAL-RULES.md, docs/DATA-CLASSIFICATION.md, docs/FAILURE-SIMULATION.md, docs/INCIDENT-PLAYBOOK.md, docs/THREAT-MODEL.md, docs/AUDITABILITY.md; health GET /health e GET /api/health; métricas GET /metrics.
- Atualizar este documento conforme itens forem implementados.
