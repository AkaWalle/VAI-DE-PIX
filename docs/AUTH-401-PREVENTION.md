# Prevenção de 401 — Auth, Sync e HTTP Client

Este documento descreve o diagnóstico das causas de 401, a arquitetura de proteção implementada e as estratégias de deploy, rollback e testes manuais.

---

## 1. Diagnóstico provável das causas do 401

| Causa | Descrição | Mitigação |
|-------|-----------|-----------|
| **Chamadas sem token** | Requests (ex.: `/notifications/unread-count`) feitos antes do bootstrap de auth ou por código que não usa o cliente HTTP com interceptor. | Interceptor injeta token; guard bloqueia sync até auth pronto. |
| **Token expirado não renovado** | Access token expira; front não tentava refresh antes de retry. | Interceptor detecta 401 → refresh (com lock) → retry do request. |
| **Sync antes do auth pronto** | Sync engine (ex.: GOD MODE) rodava ao ter `isAuthenticated`/`user`, sem validar token nem estado de auth. | `AuthRuntimeGuard.ensureValidSession()` + `isAuthReady()` antes de qualquer sync. |
| **Cliente HTTP sem interceptor** | Uso de `fetch` direto ou outro cliente sem injetar `Authorization`. | Garantir que todos os requests protegidos usem `httpClient` (única instância com interceptors). |
| **SSR / background / bootstrap** | Requests em contextos onde auth ainda não está disponível (SSR, worker, bootstrap). | Guard + `waitUntilAuthReady()` no carregamento de dados; sync só após auth confirmado. |
| **Feature flags** | GOD MODE ou outras flags ativando fluxos que chamam API antes da auth estar pronta. | Sync engine valida `isAuthReady()` e `ensureValidSession()` antes de chamar backend. |
| **Múltiplos refresh em paralelo** | Vários requests 401 ao mesmo tempo disparando vários refresh. | `RefreshLockManager`: uma única Promise de refresh compartilhada. |

---

## 2. Arquitetura final Auth + Sync

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CAMADA DE APLICAÇÃO                               │
│  useLoadData → waitUntilAuthReady() → loadData() só se autenticado       │
│  Sync engine → isAuthReady() + ensureValidSession() → depois API         │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      AuthRuntimeGuard (auth-runtime-guard.ts)            │
│  isAuthReady() | hasValidAccessToken() | ensureValidSession()            │
│  waitUntilAuthReady() | refreshAccessTokenIfAvailable()                  │
└─────────────────────────────────────────────────────────────────────────┘
         │                                          │
         │ tokenManager (token-manager.ts)          │ refresh
         ▼                                          ▼
┌──────────────────────┐              ┌──────────────────────────────────┐
│   token-manager.ts   │              │   RefreshLockManager              │
│   get/set/remove/    │              │   runRefreshWithLock() → 1 refresh │
│   isValid / storage  │              │   resetRefreshLock() no logout     │
└──────────────────────┘              └──────────────────────────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│   HTTP Client (http-client.ts) — instância única                         │
│   Request:  injeta Authorization (getTokenForRequest)                    │
│   Response: 401 → runRefreshWithLock() → retry 1x → ou clear + redirect │
│   clearAllTokens() → resetRefreshLock() + clearAllTokensStoragesOnly()   │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Nenhuma chamada protegida** deve ser feita sem passar pelo `httpClient` (interceptor garante token e retry após refresh).
- **Sync** só roda após `isAuthReady()` e `ensureValidSession()`.
- **Refresh** é único por “onda” de 401 (lock); após refresh bem-sucedido, os requests originais são retentados.

---

## 3. Componentes implementados

- **AuthRuntimeGuard** (`src/lib/auth-runtime-guard.ts`): `isAuthReady`, `hasValidAccessToken`, `ensureValidSession`, `waitUntilAuthReady`, `refreshAccessTokenIfAvailable`.
- **RefreshLockManager** (`src/lib/refresh-lock-manager.ts`): `runRefreshWithLock`, `resetRefreshLock`.
- **token-manager** (`src/lib/token-manager.ts`): `getTokenForRequest`, `tokenManager`, `clearAllTokensStoragesOnly` (usado por guard e por `http-client`).
- **http-client**: interceptor de request (token), interceptor de response (401 → refresh → retry 1x), `clearAllTokens` = reset lock + limpeza de storages.
- **Sync engine**: guard no início de `syncSharedExpensesFromBackend`; retry limitado e log de 401.

---

## 4. Observabilidade (logs)

| Log | Significado |
|-----|-------------|
| `AUTH_READY` | Auth bootstrap concluído (waitUntilAuthReady). |
| `TOKEN_INJECTED` | Token adicionado ao request (apenas em DEV). |
| `TOKEN_REFRESH_START` | Início do refresh com lock. |
| `TOKEN_REFRESH_SUCCESS` | Refresh concluído com sucesso. |
| `TOKEN_REFRESH_FAIL` | Refresh falhou. |
| `REQUEST_RETRY_AFTER_REFRESH` | Request retentado após refresh. |
| `SYNC_BLOCKED_AUTH_NOT_READY` | Sync não rodou (auth não pronto ou sessão inválida). |
| `SYNC_STARTED` | Sync iniciado. |
| `SYNC_SUCCESS` | Sync concluído. |
| `SYNC_FAIL_401` | Sync recebeu 401. |

---

## 5. Estratégia de deploy sem downtime

1. **Etapa 1** — Deploy apenas dos novos módulos (AuthRuntimeGuard, RefreshLockManager, token-manager) e do novo interceptor/retry no http-client. Comportamento antigo (clear + redirect em 401) mantido quando refresh falha ou já houve retry.
2. **Etapa 2** — Deploy do uso do guard no sync engine e em useLoadData. Sync e load só passam a depender de auth pronto; sem alterar contrato de API.
3. **Etapa 3** — Ativar observabilidade (logs já presentes; conferir em produção).
4. **Sem feature flags obrigatórias** para essa proteção: as guards e o interceptor já estão ativos; opcionalmente pode-se usar flag apenas para desligar o retry após refresh (manter só redirect).

---

## 6. Estratégia de rollback

- **Rollback de código**: reverter o deploy para a versão anterior. Nenhuma alteração de schema ou de contrato de API foi feita; usuários continuam com tokens existentes.
- **Rollback parcial**:  
  - Se o problema for apenas o **retry após refresh**: remover o retry no interceptor (manter apenas clear + redirect em 401).  
  - Se o problema for o **guard no sync**: remover a chamada a `ensureValidSession`/`isAuthReady` no sync (volta a rodar como antes).  
- Não é necessário “rollback de dados”: não há migração de banco nem de tokens.

---

## 7. Testes manuais obrigatórios

1. **Login → dashboard sem 401**
   - Fazer login e abrir o dashboard.
   - Verificar que não aparecem 401 em rede (ex.: DevTools → Network).
   - Verificar que dados (notificações, contas, etc.) carregam.

2. **Sync só após auth**
   - Com GOD MODE ativo, recarregar a página e abrir DevTools (Console).
   - Confirmar que não há log `SYNC_BLOCKED_AUTH_NOT_READY` após o carregamento (auth já pronto) ou que, se houver no início, o sync não chama a API antes.
   - Confirmar que após login o sync roda e pode aparecer `SYNC_STARTED` / `SYNC_SUCCESS`.

3. **Token expira → refresh e retry**
   - Com sessão ativa, forçar expiração do access token (ex.: alterar tempo no localStorage ou esperar expirar).
   - Disparar uma ação que chame a API (ex.: abrir notificações).
   - Verificar: um único refresh (TOKEN_REFRESH_*), depois REQUEST_RETRY_AFTER_REFRESH e sucesso, sem logout indevido.

4. **Múltiplos requests 401 → um refresh**
   - Simular vários endpoints retornando 401 ao mesmo tempo (ex.: token expirado e abrir várias abas ou disparar várias chamadas).
   - Verificar nos logs: apenas um TOKEN_REFRESH_START; os demais requests aguardam e retentam após TOKEN_REFRESH_SUCCESS.

5. **Feature flag GOD MODE**
   - Ativar GOD MODE e garantir que sync não gera 401: auth deve estar pronto e token válido antes de chamar a API; em caso de falha, log SYNC_FAIL_401 e sem loop.

6. **Logout**
   - Fazer logout e verificar que não há requests protegidos após limpeza de tokens e que novo login funciona normalmente.

---

## 8. Referências

- Backend: `POST /api/auth/refresh` (cookie HttpOnly) — usado pelo guard para renovar o access token.
- `docs/auth/REFRESH-TOKENS-API.md` — contrato do refresh.
- `docs/SHARED-EXPENSES-GOD-MODE-ARCHITECTURE.md` — contexto do sync (GOD MODE).
