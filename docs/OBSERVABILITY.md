# Observabilidade — Vai de Pix

Documento da Trilha 7. Métricas, logs e saúde do sistema para operação e escala.

---

## 1. Métricas Prometheus (GET /metrics)

Coletadas por Prometheus; expostas em `GET /metrics` (Content-Type: `text/plain`).

### 1.1 Insights

| Métrica | Tipo | Labels | Descrição |
|--------|------|--------|------------|
| `insights_compute_duration_seconds` | Histogram | `source` | Duração do cálculo de insights (api, job, job_incremental_*) |
| `insights_cache_hits_total` | Counter | — | Respostas servidas do cache (sem recálculo) |
| `insights_cache_misses_total` | Counter | — | Recálculos (cache ausente ou entidade alterada) |
| `insights_errors_total` | Counter | `source` | Erros ao calcular insights |

### 1.2 Jobs (Trilha 7)

| Métrica | Tipo | Labels | Descrição |
|--------|------|--------|------------|
| `job_lock_acquired_total` | Counter | `job_name` | Vezes que o lock do job foi adquirido (1 execução por vez) |
| `job_lock_contended_total` | Counter | `job_name` | Vezes que o lock estava ocupado (outro worker executando) |
| `job_duration_seconds` | Histogram | `job_name` | Duração total do job em segundos |
| `job_failures_total` | Counter | `job_name` | Falhas (exceção) em jobs |

**Uso operacional**

- `job_lock_contended_total`: alto indica muitos workers disputando o mesmo job; pode ajustar frequência ou escalar com cuidado.
- `job_failures_total`: alertar se > 0; investigar logs e Sentry.
- `job_duration_seconds`: definir SLO (ex.: p99 < 60s) e alertas.

---

## 2. SLOs e limites operacionais (Trilha 9)

Definidos com base em testes de carga (`backend/tests/test_load_simulation.py`). Ajustar conforme ambiente real.

### 2.1 Transação (API)

| SLO | Valor de referência | Observação |
|-----|---------------------|------------|
| Latência p95 POST /api/transactions | < 500 ms | Ambiente típico; medir com Prometheus (histograma de latência por rota, se disponível). |
| 1000 transações sequenciais | ≤ 120 s | Teste: `test_1000_transactions_sequential_balance_consistent`. |
| 100 transferências concorrentes (saldo limitado) | ≤ 60 s | Teste: `test_100_concurrent_transfers_limited_balance_only_some_succeed`. |

### 2.2 Jobs

| SLO | Valor de referência | Observação |
|-----|---------------------|------------|
| Duração do job de insights (p95) | < 60 s | Métrica: `job_duration_seconds{job_name="insights_job"}`. |
| 50 execuções paralelas do mesmo job | ≤ 90 s (wall clock) | Apenas uma execução real; demais ignoradas por lock. |

### 2.3 Contenção

| Limite | Valor | Ação |
|--------|--------|------|
| `job_lock_contended_total` alto | > 10/min por job | Avaliar frequência do cron ou número de workers. |
| 409 (idempotência) em pico | Normal sob retry | Alertar se > 5% das requisições com Idempotency-Key retornam 409. |

### 2.4 Alertas recomendados

- **job_failures_total** > 0: notificar; investigar logs/Sentry.
- **job_duration_seconds** p99 > 120 s: degradação; verificar tamanho da base (usuários/contas).
- **Health check** down > 1 min: incidente; ver docs/INCIDENT-PLAYBOOK.md.
- Divergência de snapshot (conciliação): log ERROR já existe; alertar em produção se `divergences` > 0.

---

## 3. Logs

- **Estruturados:** `core/logging_config`; uso de `extra={...}` em chamadas de logger.
- **Contexto:** `user_id`, `account_id`, `duration_ms`, `event`, etc., quando aplicável.
- **Sentry:** exceções capturadas (ex.: em jobs de insights); configurável por ambiente.

---

## 4. Health check

- **GET /health** (ou equivalente): disponibilidade do serviço e, se aplicável, do banco.
- Usado por load balancers e orquestradores.

---

## 5. Relação com Trilha 7

- **Locking de jobs:** `job_lock_acquired_total` e `job_lock_contended_total` permitem validar que apenas um worker executa cada job por vez.
- **Retry seguro:** jobs idempotentes (chave natural + UNIQUE) e `safe_insert_or_ignore` evitam duplicação; métricas de falha ajudam a distinguir falha transitória de bug.
- **Multi-worker:** métricas de duração e contenção indicam se a execução paralela de vários jobs (diferentes) é saudável.

---

## Referências

- `backend/core/prometheus_metrics.py` — definição das métricas
- `backend/core/recurring_job.py` — instrumentação dos jobs (lock, duração, falhas)
- `backend/tests/test_load_simulation.py` — testes de carga (Trilha 9)
- `docs/READY-TO-SCALE-CHECKLIST.md` — checklist de escala
