# Plano Técnico — Upgrade Enterprise Safe

**Objetivo:** Hardenizar sistema vivo, melhorar auditabilidade, reduzir risco operacional, preparar escala e limpar dívida técnica **sem alterar comportamento funcional**.

---

## O que será alterado

| Trilha | Alteração | Tipo |
|--------|-----------|------|
| **1. Observabilidade** | Novo módulo `src/lib/metrics/auth-metrics.ts` com contadores; chamadas de increment em refresh-internal, refresh-lock-manager e http-client. | Aditivo (zero mudança de fluxo). |
| **2. QA Debug Hooks** | Exposição em DEV de `window.__AUTH_DEBUG_STATE__` e `window.__REFRESH_LOCK_STATE__` (snapshot read-only). | Aditivo, só em `import.meta.env.DEV`. |
| **3. WebSocket Resilience** | Notificação “token refreshed” → `activityFeedRealtime.reconnectIfConnected()` (uma reconexão por evento, sem storm). | Aditivo; não altera login/logout/refresh. |
| **4. Cleanup** | Relatório de arquivos não usados; remoção segura em commit separado (após validação). | Remoção após Fase A+B. |
| **5. Multi-Aba** | Apenas design doc `docs/architecture/MULTI_TAB_COORDINATION_FUTURE.md`. | Documentação. |
| **6. Chaos** | Infra de teste (helpers/mocks ou doc) para chaos; sem mudança de runtime. | Testes/infra. |

---

## Por que é seguro

- **Trilha 1:** Apenas `counter += 1` em pontos já existentes; nenhuma decisão baseada em métricas no fluxo de auth/refresh.
- **Trilha 2:** Leitura de estado existente; atribuição a `window` apenas em DEV; nenhum fluxo alterado.
- **Trilha 3:** Um listener opcional após `tokenManager.set` no refresh; WS reconecta só se já estava conectado; sem reconexão se usuário deslogado (token só é setado quando session version ok).
- **Trilha 4:** Remoção só após checagem de imports estáticos/dinâmicos/config; commit isolado.
- **Trilhas 5–6:** Sem mudança de código de produção.

---

## Risco residual

| Risco | Mitigação |
|-------|------------|
| Métricas impactarem performance | Contadores síncronos; sem I/O; impacto desprezível. |
| Debug hooks vazarem em prod | Guard `import.meta.env.DEV`; build prod não expõe. |
| WS reconnect em loop | Uma notificação por refresh success; reconnectIfConnected faz no máximo disconnect + connect. |
| Remover arquivo usado dinamicamente | Fase B: verificar lazy import, config, string path. |

---

## Rollback strategy

- **Trilhas 1–3:** Reverter commit; sistema volta ao estado anterior; nenhuma persistência de métricas ou estado crítico.
- **Trilha 4:** Reverter commit de cleanup; re-adicionar arquivos removidos se algum uso for descoberto.
- **Trilhas 5–6:** Nada a reverter em produção.

---

## Diff lógico (antes de codar)

| Arquivo | Tipo alteração | Impacto runtime | Risco |
|---------|----------------|-----------------|-------|
| `src/lib/metrics/auth-metrics.ts` | Novo | Nenhum (módulo só exporta contadores e getSnapshot) | Nenhum |
| `src/lib/refresh-internal.ts` | Aditivo | Increment de contadores após eventos existentes; chamada a `notifyTokenRefreshSuccess()` após set | Baixo |
| `src/lib/refresh-lock-manager.ts` | Aditivo | Increment `refresh_calls_total` ao adquirir lock | Nenhum |
| `src/lib/http-client.ts` | Aditivo | Increment `request_retry_after_refresh_total` e `request_without_token_total` no interceptor | Nenhum |
| `src/lib/token-refresh-notify.ts` | Novo | Apenas lista de callbacks; chamada apenas após set de token no refresh | Nenhum |
| `src/lib/auth-debug.ts` | Novo | Só em DEV; atribui a window | Nenhum |
| `src/services/activityFeedRealtime.ts` | Aditivo | `reconnectIfConnected()` e inscrição em token-refresh-notify | Baixo (evita WS com token expirado) |
| `src/main.tsx` (ou App) | Aditivo | Import de auth-debug em DEV | Nenhum |
| `docs/cleanup/UNUSED_FILES_REPORT.md` | Novo | Nenhum | Nenhum |
| `docs/architecture/MULTI_TAB_COORDINATION_FUTURE.md` | Novo | Nenhum | Nenhum |

---

## Ordem de implementação

1. **Passo 1:** Criar `auth-metrics.ts` e `token-refresh-notify.ts` (módulos neutros).
2. **Passo 2:** Integrar contadores em refresh-internal, refresh-lock-manager e http-client (apenas increment).
3. **Passo 3:** Criar `auth-debug.ts` e attach em main/App em DEV.
4. **Passo 4:** Registrar listener em activityFeedRealtime para `onTokenRefreshSuccess` → `reconnectIfConnected()`; implementar `reconnectIfConnected` sem storm.
5. **Passo 5:** Gerar `UNUSED_FILES_REPORT.md` (Fase A); validação de segurança (Fase B).
6. **Passo 6:** Criar `MULTI_TAB_COORDINATION_FUTURE.md` e doc/infra de chaos (Trilhas 5–6).
7. **Passo 7 (separado):** Após validar Fase B em `docs/cleanup/UNUSED_FILES_REPORT.md`, commit isolado: `chore(cleanup): remove unused safe files`. Nunca misturar com código funcional.

---

## Plano de teste pós-mudança

| Tipo | Ação |
|------|------|
| **QA manual** | Login → dashboard; expirar token → ação → 1 refresh → retry; logout durante refresh → token não volta; GOD MODE sync após login. |
| **QA automation** | Smoke: login → dashboard sem 401; opcional: contar 1 POST /refresh para N requests 401. |
| **Chaos** | Se infra de chaos existir: rede drop, refresh delay, logout durante refresh; assert lock libera e sem token ressuscitado. |

---

## Verificações obrigatórias (antes de qualquer mudança)

- **Auth Safety:** Nenhum refresh fora do lock; nenhum retry não limitado; nenhum token set sem session version check. ✅ Mantido.
- **Runtime Safety:** Nenhuma nova Promise que pode nunca resolver; nenhum novo fluxo async sem timeout. ✅ Apenas contadores e callbacks síncronos/um shot.
- **Cleanup Safety:** Arquivo não importado dinamicamente; sem referência indireta; sem uso em config. ✅ Validado na Fase B.

---

## Fail conditions (abortar se detectar)

- Qualquer caminho alternativo de refresh.
- Qualquer alteração em `ensureValidSession` que não mantenha o lock.
- Qualquer mudança nas regras de retry do interceptor.
- Qualquer risco de token pós-logout.
- Qualquer arquivo potencialmente usado mas não confirmado.

→ PARAR, REPORTAR, NÃO IMPLEMENTAR.
