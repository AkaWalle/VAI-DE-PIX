# Chaos Testing — Preparação (Infra)

**Objetivo:** Infraestrutura e guia para testes de caos. **Não alterar runtime** de produção.

---

## Cenários a automatizar (futuro)

| Cenário | Mock / ferramenta | Assertiva |
|---------|--------------------|-----------|
| Rede cai durante refresh | Interceptar fetch POST /auth/refresh → abort após 2s ou rejeitar | Lock libera; REFRESH_LOCK_RELEASED; sem deadlock |
| Refresh demora 30s | Interceptar fetch → delay 30s | REFRESH_TIMEOUT_ABORT em ~10s; lock libera |
| Refresh retorna 500 | Mock 500 em POST /auth/refresh | refresh_calls_total sobe; refresh_success_total não; clear + redirect |
| Logout durante refresh | Disparar logout após 1s de refresh em voo | REFRESH_IGNORED_SESSION_VERSION_MISMATCH; token não em storage |
| 10 requests 401 simultâneos | Token expirado + 10 chamadas em paralelo | refresh_calls_total sobe 1; request_retry_after_refresh_total sobe 10 |

---

## Ferramentas sugeridas

- **Playwright / Cypress:** `route` ou `intercept` para atrasar ou falhar POST /api/auth/refresh e GET protegidos.
- **MSW (Mock Service Worker):** Handlers para auth/refresh (delay, 500, 200 com token).
- **Script de smoke:** Após deploy, chamar métricas (se expostas) e validar contadores ou logs.

---

## Onde colocar mocks (não em runtime prod)

- `src/test/` ou `tests/` ou `e2e/`: handlers MSW ou fixtures para chaos.
- Arquivo de configuração de cenários (ex.: `chaos-scenarios.json`) lido apenas em testes.

---

## Métricas para assertivas

- Usar `authMetrics` (ou `getAuthMetricsSnapshot()`) em testes E2E para assertar:
  - `refresh_calls_total` após N requests 401 = 1 (uma aba).
  - `refresh_timeout_total` após mock de delay 15s > 0.
  - `refresh_session_mismatch_total` após “logout durante refresh” > 0.

---

## Não fazer

- Injetar falhas em código de produção (ex.: “chaos flag” que quebra refresh em prod).
- Alterar timeout, retry ou lógica de lock para “testar caos”; usar mocks externos apenas.
