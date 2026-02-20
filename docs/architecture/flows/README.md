# Fluxogramas de Arquitetura — Fonte de Verdade no Código

Documentação **estritamente baseada no código real** do repositório. Sem componentes inferidos; constantes e ordem de execução extraídas dos arquivos.

---

## Estrutura real (não inferida)

O código de auth/refresh/sync/metrics/realtime está em **`src/lib/`** (estrutura plana), não em subpastas `auth/`, `http/`, `refresh/`, etc. Ver **CODE-MAPPING.md** para arquivo → domínio e tabela de constantes.

---

## Índice dos fluxos

| # | Documento | Fluxo | Constantes principais |
|---|-----------|--------|------------------------|
| 1 | [01-auth-request-lifecycle.md](./01-auth-request-lifecycle.md) | Request → Interceptor → Token Check → API → 401 → Refresh → Retry → Success/Logout | MAX_RETRY_AFTER_REFRESH, REDIRECT_LOOP_THRESHOLD |
| 2 | [02-refresh-pipeline.md](./02-refresh-pipeline.md) | Lock → Refresh Internal → Timeout Guard → Retry Guard → Session Version → Token Update → Notify → Lock Release | REFRESH_TIMEOUT_MS, MAX_REFRESH_RETRY_GLOBAL |
| 3 | [03-multi-tab-refresh.md](./03-multi-tab-refresh.md) | Tab Election → Leader Refresh → Followers Wait → Broadcast Result → Resume | LOCK_TTL_MS, WAIT_RESULT_MS |
| 4 | [04-sync-engine.md](./04-sync-engine.md) | Auth Ready → Valid Session → API Call → Refresh If Needed → Retry Limited → Store Update | SYNC_RETRY_DELAY_MS, SYNC_MAX_RETRIES, WAIT_AUTH_* |
| 5 | [05-metrics-lifecycle.md](./05-metrics-lifecycle.md) | Increment → Debounce Persist → Export Scheduler → Retry Queue → Backend | PERSIST_DEBOUNCE_MS, EXPORT_INTERVAL_MS, MAX_RETRY_QUEUE |
| 6 | [06-websocket-token-lifecycle.md](./06-websocket-token-lifecycle.md) | Refresh Success → Notify → WS Reconnect → Token Drift Monitor | 10_000 ms (WS drift, hardcoded) |

Cada documento contém:
- **Constantes** (valor + arquivo)
- **Fluxograma Mermaid**
- **Mapping Código → Diagrama**
- **Self-Audit** (fluxo = código? locks? timeouts? retries? multi-tab? fallbacks?)
- **Modo Elite** (checklist QA, falhas críticas, gargalos, riscos multi-aba, race, refresh storm)

---

## Como usar

- **Auditoria / onboarding:** Ler CODE-MAPPING.md + o fluxo desejado; validar nós do diagrama contra o arquivo indicado no mapping.
- **Manutenção:** Ao alterar constantes, locks, timeout ou ordem de execução, atualizar o fluxo correspondente e o CODE-MAPPING.md.
- **QA / chaos testing:** Usar os checklists “Modo Elite” de cada fluxo.
---

## Regras de atualização

- **Não** inventar etapas ou constantes que não existam no código.
- **Não** simplificar refresh pipeline, multi-tab, session version ou timeouts.
- Se o código divergir do diagrama: **atualizar o diagrama** (e, se necessário, marcar “Necessário validação manual” onde houver dúvida).
