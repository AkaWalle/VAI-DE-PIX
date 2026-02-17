# Auditoria de Riscos Residuais — Auth, 401 Fantasma, Multi-Aba, Observabilidade e Chaos

Validação de bugs estruturais, falhas ocultas e cenários de produção real.

---

## PARTE A — Caça 401 fantasma

### Critérios de investigação

Requests que podem ocorrer: (1) antes de AUTH_READY, (2) fora do interceptor, (3) com cliente HTTP diferente, (4) chamadas diretas `fetch()`, (5) WebSocket handshake, (6) services com axios cru, (7) disparados por bootstrap paralelo, feature flags, sync scheduler, background workers.

### Relatório por origem de request

| Endpoint / origem | Arquivo / fluxo | Passa interceptor? | Depende AUTH_READY? | Possível 401? |
|-------------------|-----------------|--------------------|----------------------|----------------|
| POST /auth/login | auth.service → httpClient.post | SIM | NÃO (público) | Não (login) |
| POST /auth/register | auth.service → httpClient.post | SIM | NÃO (público) | Não |
| GET /auth/me | auth.service.getProfile; bootstrap checkAuth | SIM | Implícito (só com token) | SIM (token expirado → 401 → refresh → retry) |
| POST /api/auth/refresh | refresh-internal.ts → fetch() | NÃO (fetch direto, cookie) | N/A | Não (não usa Bearer) |
| GET /api/health | api-detector.ts → fetch(healthUrl) | NÃO | NÃO | Improvável (health público) |
| GET /notifications/unread-count | notifications.service → httpClient | SIM | SIM (NotificationBell em MainLayout → ProtectedRoute) | SIM (token expirado) |
| GET /notifications/, list, markAsRead, etc. | notifications.service → httpClient | SIM | SIM (idem) | SIM |
| GET /activity-feed/*, unreadCount | activityFeedApi → httpClient | SIM | SIM (ActivityFeedPage protegida) | SIM |
| loadFeed, getUnreadCount (activity) | activity-feed-store → activityFeedApi | SIM | SIM (página protegida) | SIM |
| WebSocket /ws/activity-feed?token= | activityFeedRealtime.connect(token) | NÃO (WS) | Implícito (token do tokenManager.get()) | SIM (token expirado: backend pode fechar WS) |
| GET /shared-expenses/* | sharedExpenseApi → httpClient | SIM | SIM (rotas protegidas) | SIM |
| fetchPendingShares, respondShare, createExpense | shared-expenses-store → sharedExpenseApi | SIM | SIM (páginas protegidas) | SIM |
| syncSharedExpensesFromBackend | sync engine → sharedExpenseApi.getReadModel | SIM | SIM (isAuthReady + ensureValidSession) | SIM (401 → interceptor) |
| GET /transactions, /accounts, /categories, /goals, /envelopes | services → httpClient | SIM | SIM (useLoadData após waitUntilAuthReady) | SIM |
| GET /insights, feedback, preferences | insights.service → httpClient | SIM | SIM (Dashboard protegido) | SIM |
| GET/POST /reports/* | reports (se existir) → httpClient | SIM | SIM | SIM |
| GET/POST /api/automations/* | automations.service → httpClient | SIM | SIM (Automations protegida) | SIM |
| Dashboard fetchInsights, getUnreadInsightCount | dashboard.tsx useEffect | SIM | SIM (rota protegida) | SIM |
| Settings getInsightPreferences | Settings.tsx useEffect | SIM | SIM | SIM |

### Conclusão Parte A

- **Antes de AUTH_READY:** Nenhum request protegido é disparado antes. Ordem: AuthBootstrap → bootstrapAuth (getProfile com token) → ProtectedRoute só renderiza filhos quando `!isAuthChecking && userLoaded`. useLoadData chama `waitUntilAuthReady()` antes de loadData. NotificationBell e Dashboard estão dentro de MainLayout → ProtectedRoute.
- **Fora do interceptor:** (1) POST /auth/refresh em refresh-internal (fetch direto, intencional; não usa Bearer). (2) GET /api/health em api-detector (fetch direto; endpoint público). (3) WebSocket: handshake com `?token=` (tokenManager.get()); não passa pelo axios; se token expirar, WS pode ser fechado pelo backend — risco aceitável, sem retry automático de WS.
- **Cliente HTTP diferente:** Nenhum service usa `axios` para requests de API; todos usam `httpClient`. Uso de `axios` é apenas `axios.isAxiosError()` e tipos (AxiosError).
- **Bootstrap paralelo:** Bootstrap é único (AuthBootstrap ref); getProfile usa httpClient; se 401, interceptor faz refresh e retry.
- **Feature flags / sync scheduler:** Sync só roda via useLoadData (após AUTH_READY) ou via shared-expenses-store (ações em páginas protegidas); sempre com ensureValidSession ou após auth pronto.
- **Achado:** WebSocket não passa pelo interceptor; token expirado pode causar fechamento do WS sem refresh automático. Mitigação: reconexão ao trocar de aba ou após refresh de token em REST poderia reabrir WS com token novo (não implementado; risco residual aceitável).

---

## PARTE B — Multi-aba refresh global

### Existência de mecanismos distribuídos

| Mecanismo | Existe? | Evidência |
|-----------|--------|-----------|
| BroadcastChannel | NÃO | Grep no src: não encontrado. |
| SharedWorker | NÃO | Não encontrado. |
| IndexedDB lock distribuído | NÃO | Não encontrado. |
| Backend refresh idempotente | Não validado no front | Depende do backend; front envia 1 POST /refresh por aba quando há 401. |

### Comportamento atual

- `refreshPromise` e `authSessionVersion` / `consecutiveRefreshFailures` são estado de **módulo por contexto de execução**. Em múltiplas abas, cada aba tem seu próprio bundle/contexto → **1 lock por aba**, não 1 lock global entre abas.
- Simulação: 5 abas, token expirado, 5 chamadas simultâneas (1 por aba). **Resultado esperado:** até 5 POST /refresh (1 por aba), cada aba com seu próprio lock; tempo de recuperação ~igual ao de 1 refresh por aba; erros visíveis apenas se refresh falhar (clear + redirect).

### Avaliação de risco

| Critério | Avaliação |
|----------|-----------|
| Número total POST /refresh (5 abas, 5 requests) | Até 5 (1 por aba). |
| Tempo médio recuperação | Por aba: ~1x tempo do refresh. Sem lock global, não há “uma aba faz refresh e as outras só retentam”. |
| Erros visíveis | Se refresh falhar: redirect /auth naquela aba. Outras abas podem ainda ter token (localStorage compartilhado) — após 1 aba fazer clearAllTokens, localStorage é limpo para todas; na próxima request as outras abas também redirecionam. |

**Classificação:** **Aceitável para SaaS padrão.** Múltiplos refreshes em paralelo (1 por aba) são aceitáveis; backend deve suportar (ex.: idempotência). Se o backend sofrer com pico de refresh (ex.: 10 abas abertas), classificar como **Recomendado otimizar** (ex.: BroadcastChannel para “aba líder faz refresh, outras aguardam”). **Crítico** apenas se o backend tiver rate limit rígido em /refresh e muitas abas forem comuns.

---

## PARTE C — Observabilidade enterprise

### Métricas obrigatórias — existência no código

| Métrica | Existe no código? | Onde implementar / como derivar |
|---------|--------------------|----------------------------------|
| refresh_calls_total | NÃO | Incrementar em runRefreshWithLock ao criar refreshPromise (ou no refresh-internal ao entrar em refreshAccessTokenInternal). |
| refresh_success_total | NÃO | Incrementar quando refreshAccessTokenInternal retorna true. |
| refresh_timeout_total | NÃO | Incrementar no catch quando err.name === "AbortError" em refresh-internal. |
| refresh_session_mismatch_total | NÃO | Incrementar quando getSessionVersion() !== capturedVersion antes de set. |
| refresh_skip_max_retry_total | NÃO | Incrementar quando consecutiveRefreshFailures >= MAX_REFRESH_RETRY_GLOBAL. |
| request_retry_after_refresh_total | NÃO | Incrementar no interceptor ao logar REQUEST_RETRY_AFTER_REFRESH. |
| request_without_token_total | NÃO | Incrementar no request interceptor quando getTokenForRequest() retorna null e a URL é protegida (ou em todo request protegido sem header Authorization). |

**Recomendação:** Adicionar contadores em módulo (ou exportar um pequeno `authMetrics` em refresh-internal + http-client) e expor para seu sistema de métricas (ex.: Prometheus, analytics). Não alterar comportamento; apenas contadores.

### Alertas sugeridos

| Alerta | Condição | Ação sugerida |
|--------|----------|----------------|
| refresh_timeout_rate > 1% | (refresh_timeout_total / refresh_calls_total) > 0.01 | Investigar latência de rede ou backend /auth/refresh. |
| refresh_skip_max_retry_total > baseline | Aumento súbito de skips por max retry | Verificar saúde do backend ou rede; possível ataque ou degradação. |
| request_without_token_total > 0 | Qualquer request protegido sem token | Investigar 401 fantasma; requests antes de AUTH_READY ou fora do interceptor. |

---

## PARTE D — Chaos QA automatizado

### Cenários a simular (rede, backend, auth state, storage)

| Categoria | Cenário | Validação esperada |
|------------|---------|---------------------|
| Rede | Drop conexão durante refresh | fetch rejeita → catch → finally libera lock; clear/redirect ou retry em nova ação. |
| Rede | Latência 5s–20s | Se ≤10s: refresh pode completar. Se >10s: REFRESH_TIMEOUT_ABORT; lock libera. |
| Rede | Packet loss 30% | Falhas intermitentes; consecutiveRefreshFailures sobe; após 2, REFRESH_SKIP_MAX_RETRY_REACHED. |
| Backend | Refresh 500 aleatório | refreshed = false; clear + redirect; sem loop. |
| Backend | Refresh delay 30s | Timeout 10s → REFRESH_TIMEOUT_ABORT; lock libera. |
| Backend | Refresh retorna token inválido | Backend responsabilidade; se front gravar e próximo request 401, novo refresh. Session version não afetada. |
| Auth state | Logout durante refresh | incrementSessionVersion → refresh resolve → REFRESH_IGNORED_SESSION_VERSION_MISMATCH; token não salvo. |
| Auth state | Login durante refresh pendente | Nova sessão; tokenManager.set no login; refresh em voo pode ainda resolver e tentar set → session version não incrementada no login (apenas no logout) — possível race: login seta token, refresh em voo também seta; estado final pode ser token do refresh. Risco residual aceitável (ambos válidos). |
| Storage corrompido | Token inválido ou malformado | getTokenForRequest retorna valor; request 401 → refresh; tokenManager.isValid() pode ser false → ensureValidSession tenta refresh. Comportamento esperado. |

**Validações obrigatórias em todos:** Lock sempre libera (finally); nenhum loop infinito (caps); nenhum token ressuscitado após logout (session version); sessão limpa corretamente (clearAllTokens).

---

## PARTE E — Pentest lógico de sessão

| Ataque | Resultado esperado | Prova no código |
|--------|--------------------|------------------|
| **A1. Refresh resolve depois do logout** | Token não pode voltar. | clearAllTokens() chama incrementSessionVersion() antes de clear. refreshAccessTokenInternal, ao resolver com sucesso, checa getSessionVersion() === capturedVersion; se não, não chama tokenManager.set e retorna false. |
| **A2. Dois refresh concorrentes (mesma aba)** | Só 1 grava token (o que ganhou o lock). | runRefreshWithLock: apenas uma promise chama refreshAccessTokenInternal; demais retornam a mesma promise. Uma única execução de refresh por “onda”. |
| **A3. Replay refresh antigo** | Backend deve rejeitar. | Não é responsabilidade do front; backend deve usar nonce, jti ou lista de revogação. Front só envia cookie + POST /refresh. |
| **A4. Storage token divergente** | Sistema escolhe fonte correta. | getTokenForRequest() usa ordem: vai-de-pix-token → localStorage.token → sessionStorage.token. tokenManager.set (login/refresh) grava só em TOKEN_KEY. Fonte coerente para escrita; leitura tem fallback. |

---

## CENÁRIOS GOD MODE OBRIGATÓRIOS

| Cenário | Esperado | Status na arquitetura |
|---------|----------|------------------------|
| **1. 10 requests + token expirado** | 1 refresh; todos aguardam. | runRefreshWithLock: primeira chamada cria refreshPromise; as outras 9 retornam a mesma promise. 1 refresh; 10 retries. |
| **2. Refresh trava 30s** | Timeout 10s → lock libera → sessão limpa. | AbortController + REFRESH_TIMEOUT_MS 10s; AbortError → finally → refreshPromise = null; refreshed = false → clear + redirect. |
| **3. Logout durante refresh** | Session version mismatch → token descartado. | incrementSessionVersion() em clearAllTokens; ao resolver refresh, getSessionVersion() !== capturedVersion → não set; REFRESH_IGNORED_SESSION_VERSION_MISMATCH. |
| **4. Refresh falha 2x** | Skip refresh → clear → redirect login. | consecutiveRefreshFailures >= 2 → refreshAccessTokenInternal retorna false sem fetch; REFRESH_SKIP_MAX_RETRY_REACHED; interceptor não retenta → clearAllTokens + redirect. |

---

## SCORE FINAL

| Dimensão | Nota (0–10) | Justificativa |
|----------|-------------|----------------|
| **Concorrência** | 8 | Lock garante 1 refresh por aba; N requests aguardam. Multi-aba = N refreshes (sem lock global). |
| **Resiliência rede** | 8 | Timeout 10s; lock libera; max retry 2; sem loop. |
| **Proteção logout** | 9 | Session version impede token ressuscitado; ordem clearAllTokens correta. |
| **Observabilidade** | 5 | Logs presentes; faltam métricas contáveis (refresh_calls_total, etc.) e alertas. |
| **Chaos readiness** | 7 | Comportamento definido para timeout, falha, logout durante refresh; falta automação de chaos (scripts/mocks). |
| **Multi-aba strategy** | 6 | 1 lock por aba; aceitável; não há BroadcastChannel/SharedWorker. |

**Classificação:** **Produção aceitável com riscos controlados.** Arquitetura sólida (lock, timeout, session version, retry caps); pontos a melhorar: métricas enterprise, alertas, opcional lock global entre abas se backend for sensível a pico de refresh.

---

## ITENS PROIBIDOS — Verificação

| Item | Status |
|------|--------|
| Refresh fora do lock | OK — só refresh-lock-manager chama refreshAccessTokenInternal. |
| Token salvo sem checar session version | OK — tokenManager.set só após getSessionVersion() === capturedVersion. |
| Retry infinito | OK — MAX_RETRY_AFTER_REFRESH = 1; __retriedByRefresh; MAX_REFRESH_RETRY_GLOBAL = 2. |
| Refresh sem timeout | OK — AbortController 10s em refresh-internal. |
| Múltiplos entrypoints de refresh | OK — único entrypoint é runRefreshWithLock (guard e interceptor usam esse). |
| Request sem interceptor | Risco: health (fetch direto) e WebSocket (handshake) não passam pelo interceptor; health é público; WS usa token em query — aceitável. |
| Request antes de AUTH_READY | OK — ProtectedRoute e waitUntilAuthReady garantem que requests protegidos só após auth pronto. |

---

## SAÍDA ESPERADA

### 1. Achados críticos

- **Nenhum.** Nenhum request protegido disparado antes de AUTH_READY; nenhum refresh fora do lock; nenhum token salvo sem session version; timeout e retry caps implementados.

### 2. Achados potenciais

| Achado | Risco | Mitigação |
|--------|--------|-----------|
| WebSocket não passa pelo interceptor; token expirado pode fechar WS. | Baixo | Reconectar WS após refresh de token (ex.: listener em tokenManager ou evento “token refreshed”). |
| Multi-aba: 1 refresh por aba, não 1 global. | Baixo/medio | Aceitável; se backend sofrer, implementar BroadcastChannel ou “aba líder”. |
| Métricas (refresh_calls_total, etc.) não existem. | Médio (observabilidade) | Adicionar contadores e integrar a sistema de métricas/alertas. |
| Login durante refresh pendente: possível race (dois tokens válidos). | Baixo | Cenário raro; resultado ainda é sessão válida. |

### 3. Riscos arquiteturais aceitos

- Health check com fetch direto (sem interceptor); endpoint público.
- WebSocket com token em query (sem retry automático de refresh no WS).
- Lock por aba (sem estado compartilhado entre abas).
- Backend responsável por idempotência e rejeição de replay de refresh.

### 4. Recomendações futuras

- Implementar métricas (refresh_calls_total, refresh_success_total, refresh_timeout_total, refresh_session_mismatch_total, refresh_skip_max_retry_total, request_retry_after_refresh_total, request_without_token_total) e alertas sugeridos.
- Considerar reconexão de WebSocket após refresh de token.
- Se escala multi-aba for alta: avaliar BroadcastChannel para “uma aba faz refresh, outras aguardam”.
- Automatizar chaos (network delay/loss, backend 500/delay) em E2E ou staging.

### 5. Provas lógicas de segurança

- **Lock garante exclusão mútua (por aba):** O único código que invoca refresh real é `refreshAccessTokenInternal()`, chamado apenas dentro da promise criada por `runRefreshWithLock()`. Enquanto `refreshPromise !== null`, qualquer nova chamada a `runRefreshWithLock()` retorna essa mesma promise e não inicia outra execução. Portanto, no mesmo contexto (aba), no máximo uma execução de refresh por vez. **Exclusão mútua por aba:** garantida.
- **Session version garante cancel-safe logout:** Seja T0 o instante em que refresh inicia (capturedVersion = V). Se logout ocorre em T1 > T0, então `incrementSessionVersion()` é chamado e a versão passa a V+1. Quando o refresh resolve em T2, a condição `getSessionVersion() === capturedVersion` é (V+1) === V → false. Logo o branch que chama `tokenManager.set()` não é executado. **Cancel-safe:** garantido.
- **Timeout garante ausência de deadlock:** A promise do refresh é sempre resolvida ou rejeitada: (1) fetch completa → resolve com true/false; (2) fetch abort (timeout) → catch → resolve com false; (3) falha de rede → catch → resolve com false. O `finally` em runRefreshWithLock roda em todos os casos e faz `refreshPromise = null`. Não existe caminho em que a promise fique pendente para sempre. **Deadlock:** inexistente.
- **Retry caps garantem ausência de loop infinito:** (1) Por request: __retriedByRefresh >= 1 impede segundo retry do mesmo request. (2) Global: consecutiveRefreshFailures >= 2 impede nova chamada ao backend até reset (login/sucesso). Não há ciclo que repita refresh ou retry indefinidamente. **Loop infinito:** inexistente.

### 6. Testes adicionais recomendados

- E2E: 10 requests simultâneos com token expirado → contar 1 POST /refresh e 10 retries com 200.
- E2E: Mock de refresh com delay 15s → assert REFRESH_TIMEOUT_ABORT e REFRESH_LOCK_RELEASED; assert redirect ou clear.
- E2E: Logout durante refresh (mock refresh lento) → assert REFRESH_IGNORED_SESSION_VERSION_MISMATCH; assert ausência de token após reload.
- E2E: Contar chamadas a POST /auth/refresh em janela de 2s com 5 abas e token expirado (esperado ≤ 5).
- Unit/integration: refresh-internal com mock de fetch (sucesso, timeout, 4xx) → assert contadores e que token só é setado quando session version igual.

---

## MODO HARD EXTRA — Validação matemática resumida

- **Lock garante exclusão mútua real (por aba):** O conjunto de execuções de `refreshAccessTokenInternal()` é exatamente o conjunto de execuções da promise criada quando `refreshPromise === null`. Só uma dessas promises é criada por vez (até o finally zerar refreshPromise). Logo card(execuções simultâneas de refresh) ≤ 1. **QED.**
- **Session version garante cancel-safe logout:** Se logout ocorreu antes da conclusão do refresh, então incrementSessionVersion() foi chamado e a versão atual é estritamente maior que capturedVersion. A condição para set é (atual === capturedVersion), logo falsa. **QED.**
- **Timeout garante ausência de deadlock:** O grafo de estados da promise do refresh: [pendente] → [resolvida] ou [rejeitada]; em ambos os casos finally roda e refreshPromise := null. Não há estado de bloqueio permanente. **QED.**
- **Retry caps garantem ausência de loop infinito:** O número de retries por request é limitado por 1; o número de refreshes consecutivos sem sucesso é limitado por 2. As funções de progresso (retries restantes, falhas consecutivas) são não negativas e decrescem; terminam em estado que não reinicia ciclo. **QED.**

---

*Auditoria com base no código em src (lib, services, stores, pages, components). Nenhuma alteração de código foi feita.*
