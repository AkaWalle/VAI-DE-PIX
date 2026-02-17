# Auditoria da Arquitetura de Refresh Token

Validação completa: zero refresh concorrente, zero deadlock, zero token ressuscitado, zero loop infinito, timeout funcional, compatibilidade com interceptors e sync engine.

---

## PARTE 1 — Validação do lock global

### 1.1 Fonte única de refresh

**Busca no código:** `refreshAccessTokenInternal(`

| Arquivo | Uso |
|---------|-----|
| `refresh-internal.ts` | **Definição** da função (linha 40). |
| `refresh-lock-manager.ts` | **Única chamada** (linha 30): `const ok = await refreshAccessTokenInternal();` |

**Conclusão:** Nenhum outro arquivo chama `refreshAccessTokenInternal`. A chamada existe **apenas** em `refresh-lock-manager.ts`, dentro de `runRefreshWithLock()`.

**Caminhos que fazem refresh:**

| Origem | Caminho | Evidência |
|--------|---------|-----------|
| Interceptor (401) | `runRefreshWithLock()` | http-client.ts:81 |
| Guard (ensureValidSession) | `safeRefreshAccessToken()` → `runRefreshWithLock()` | auth-runtime-guard.ts:98, 106-107 |
| Sync engine | `ensureValidSession()` → `safeRefreshAccessToken()` → `runRefreshWithLock()` | shared-expenses-sync-engine.ts:68; auth-runtime-guard.ts:98, 107 |

**Critério de sucesso:** ✅ Apenas 1 refresh real simultâneo possível: todos os caminhos passam por `runRefreshWithLock()`; só o lock manager chama `refreshAccessTokenInternal()`.

### 1.2 Ausência de refresh direto

- **Interceptor:** usa `runRefreshWithLock()` (http-client.ts:81). Não chama refresh interno direto.
- **Sync:** chama `ensureValidSession()` → `safeRefreshAccessToken()` → `runRefreshWithLock()`. Não chama refresh interno direto.
- **Guard:** expõe `safeRefreshAccessToken()` = `runRefreshWithLock()`; não chama `refreshAccessTokenInternal()`.

**Conclusão:** ✅ Não existe refresh direto em interceptor, sync ou guard.

---

## PARTE 2 — Timeout hard do refresh

**Arquivo:** `refresh-internal.ts`

| Exigência | Implementação | Evidência |
|-----------|----------------|-----------|
| AbortController | `const controller = new AbortController();` | Linha 53 |
| REFRESH_TIMEOUT_MS = 10000 | `export const REFRESH_TIMEOUT_MS = 10_000;` | Linha 12 |
| fetch com signal | `fetch(url, { ..., signal: controller.signal })` | Linhas 56-61 |
| try/catch timeout | `catch (err)` com `err.name === "AbortError"` | Linhas 86-95 |
| log REFRESH_TIMEOUT_ABORT | `console.warn(REFRESH_TIMEOUT_ABORT)` em AbortError | Linhas 89-91 |
| clearTimeout em sucesso | `clearTimeout(timeoutId)` após res.ok | Linha 63 |
| clearTimeout em catch | `clearTimeout(timeoutId)` no catch | Linha 87 |

**Comportamento quando o backend trava:**

1. Após 10s, `setTimeout` chama `controller.abort()`.
2. `fetch` rejeita com `AbortError`.
3. Catch: `clearTimeout(timeoutId)`, `consecutiveRefreshFailures += 1`, log `REFRESH_TIMEOUT_ABORT`, retorna `false`.
4. `runRefreshWithLock()` recebe `false`; no `finally` executa `refreshPromise = null` e log `REFRESH_LOCK_RELEASED`.
5. Novos 401 podem iniciar um novo refresh; nenhuma Promise fica pendente para sempre.

**Conclusão:** ✅ Refresh aborta; lock libera; sistema não trava.

---

## PARTE 3 — Cancel-safe logout (session version)

**Início do refresh (refresh-internal.ts):**

```51:51:src/lib/refresh-internal.ts
  const capturedVersion = authSessionVersion;
```

**Após sucesso (antes de salvar token):**

```76:81:src/lib/refresh-internal.ts
    if (getSessionVersion() !== capturedVersion) {
      if (typeof window !== "undefined") {
        console.warn(`${REFRESH_LOG_PREFIX} REFRESH_IGNORED_SESSION_VERSION_MISMATCH`);
      }
      return false;
    }
```

Só depois: `tokenManager.set(data.access_token)` (linha 83).

**Logout (http-client.ts):**

```41:46:src/lib/http-client.ts
export function clearAllTokens(): void {
  if (typeof window === "undefined") return;
  incrementSessionVersion();
  resetRefreshLock();
  clearAllTokensStoragesOnly();
}
```

Ordem: (1) `incrementSessionVersion()`, (2) `resetRefreshLock()`, (3) `clearAllTokensStoragesOnly()`.

**Critério de sucesso:** ✅ Logout durante refresh → `incrementSessionVersion()` sobe a versão → quando o refresh resolve, `getSessionVersion() !== capturedVersion` → token não é salvo; log REFRESH_IGNORED_SESSION_VERSION_MISMATCH. Token nunca revive.

---

## PARTE 4 — Max retry global

| Exigência | Implementação | Evidência |
|-----------|----------------|-----------|
| MAX_REFRESH_RETRY_GLOBAL = 2 | `export const MAX_REFRESH_RETRY_GLOBAL = 2;` | refresh-internal.ts:15 |
| Se exceder: não chama backend | `if (consecutiveRefreshFailures >= MAX_REFRESH_RETRY_GLOBAL) return false;` antes do fetch | refresh-internal.ts:44-49 |
| Log REFRESH_SKIP_MAX_RETRY_REACHED | `console.warn(REFRESH_SKIP_MAX_RETRY_REACHED)` | refresh-internal.ts:45-46 |
| Retorna false | `return false` no início da função | refresh-internal.ts:49 |
| Reset após login/register | `resetRefreshRetryCount()` após `tokenManager.set(...)` | auth.service.ts:44, 65 |

**Conclusão:** ✅ Lógica e reset implementados.

---

## PARTE 5 — Liberação garantida do lock

**refresh-lock-manager.ts:**

```28:42:src/lib/refresh-lock-manager.ts
  refreshPromise = (async () => {
    try {
      const ok = await refreshAccessTokenInternal();
      if (typeof window !== "undefined") {
        console.log(`${LOCK_LOG_PREFIX} TOKEN_REFRESH_${ok ? "SUCCESS" : "FAIL"}`);
      }
      return ok;
    } finally {
      if (typeof window !== "undefined") {
        console.log(`${LOCK_LOG_PREFIX} REFRESH_LOCK_RELEASED`);
      }
      refreshPromise = null;
    }
  })();
```

- Não há `return` antes do `finally`; o `return ok` está dentro do `try`; o `finally` roda sempre (sucesso, falha ou abort).
- Lock é liberado em `finally` (`refreshPromise = null`).

**Conclusão:** ✅ Liberação garantida; nenhum return evita o finally.

---

## PARTE 6 — Compatibilidade com interceptor

**Fluxo (http-client.ts):**

1. 401 → `const refreshed = await runRefreshWithLock();` (linha 81).
2. Se `refreshed` → `config.__retriedByRefresh` incrementado, log REQUEST_RETRY_AFTER_REFRESH, `return httpClient.request(config)` (retry).
3. Se não `refreshed` → não retenta; cai no bloco `if (status === 401 || status === 403)` → `clearAllTokens()` + redirect /auth.

**Conclusão:** ✅ Retry só ocorre se refresh retorna true; false → clear + redirect (logout/fail).

---

## PARTE 7 — Compatibilidade com sync engine

**Sync (shared-expenses-sync-engine.ts):**

- Não importa `refresh-internal` nem `refresh-lock-manager`.
- Chama `ensureValidSession()` (linha 68); em seguida `sharedExpenseApi.getReadModel()` (linha 77).

**ensureValidSession (auth-runtime-guard.ts):** chama `safeRefreshAccessToken()` → `runRefreshWithLock()`. Sync não chama refresh direto.

Se o sync já passou em `ensureValidSession` e o `getReadModel()` retorna 401 (token expirou no meio), o **interceptor** trata o 401: `runRefreshWithLock()` → retry do `getReadModel()` → sync continua.

**Conclusão:** ✅ Sync não chama refresh direto; sync 401 → interceptor → refresh com lock → retry → sync continua.

---

## PARTE 8 — Multi-aba real

- `refreshPromise` é variável de módulo em `refresh-lock-manager.ts` (linha 11). No browser, todas as abas da mesma origem carregam o **mesmo** bundle; o estado do módulo é **compartilhado** por aba (cada aba tem seu próprio contexto de módulo). Portanto, **por aba** existe um único `refreshPromise`.
- Em uma única aba: N requests 401 → todos recebem a mesma `refreshPromise` (primeiro que entra cria; demais reutilizam). Assim, **por aba** apenas 1 refresh real; as outras requisições aguardam o lock.

**Observação:** Abas diferentes têm contextos de módulo diferentes, então cada aba tem seu próprio lock. Duas abas com 401 ao mesmo tempo podem gerar 2 refreshes (um por aba). Isso é esperado (não há shared memory entre abas). Se o produto exigir 1 refresh global entre abas, seria preciso um mecanismo extra (ex.: SharedWorker ou broadcast). Hoje o desenho garante **por aba**: 1 refresh; outras requisições da mesma aba aguardam.

**Conclusão:** ✅ Dentro da mesma aba: apenas 1 refresh real; demais aguardam o lock. Multi-aba = 1 refresh por aba (sem shared state entre abas).

---

## PARTE 9 — Observabilidade obrigatória

| Log | Arquivo | Linha | Presente |
|-----|---------|--------|----------|
| REFRESH_LOCK_ACQUIRED | refresh-lock-manager.ts | 24 | ✅ |
| REFRESH_LOCK_RELEASED | refresh-lock-manager.ts | 37 | ✅ |
| REFRESH_TIMEOUT_ABORT | refresh-internal.ts | 91 | ✅ |
| REFRESH_IGNORED_SESSION_VERSION_MISMATCH | refresh-internal.ts | 78 | ✅ |
| REFRESH_SKIP_MAX_RETRY_REACHED | refresh-internal.ts | 45 | ✅ |
| REQUEST_RETRY_AFTER_REFRESH | http-client.ts | 83 | ✅ |

**Conclusão:** ✅ Todos os logs obrigatórios existem.

---

## PARTE 10 — Edge cases

| Cenário | Suporte | Mecanismo |
|---------|--------|-----------|
| Backend refresh travado | ✅ | AbortController 10s → REFRESH_TIMEOUT_ABORT → lock libera |
| Rede cai durante refresh | ✅ | fetch rejeita → finally libera lock |
| Logout durante refresh | ✅ | incrementSessionVersion → refresh resolve → version mismatch → token não salvo |
| 10 requests simultâneos (mesma aba) | ✅ | 1 refreshPromise; todos aguardam a mesma promise |
| Sync + refresh simultâneo | ✅ | Sync via ensureValidSession → runRefreshWithLock; interceptor via runRefreshWithLock; mesmo lock |
| Storage divergente | ✅ | getTokenForRequest lê 3 fontes; tokenManager.set só TOKEN_KEY; sem loop (max retry + 1 retry por request) |
| Multi-aba refresh race | ✅ (por aba) | 1 refresh por aba; outras requisições da mesma aba aguardam |

---

## PROIBIDO — Verificação

| Proibição | Status |
|-----------|--------|
| Refresh fora do lock manager | ✅ Não existe: só refresh-lock-manager chama refreshAccessTokenInternal |
| Token set sem checar session version | ✅ Não existe: tokenManager.set só após getSessionVersion() === capturedVersion |
| Retry automático infinito | ✅ Não existe: MAX_RETRY_AFTER_REFRESH = 1; __retriedByRefresh impede segundo retry |
| Refresh sem timeout | ✅ Não existe: AbortController + REFRESH_TIMEOUT_MS 10s |
| Refresh disparado por múltiplos módulos | ✅ Não existe: todos disparam via runRefreshWithLock (um único ponto de entrada) |

---

## RESULTADO DA AUDITORIA

### 1. Problemas críticos encontrados

**Nenhum.** A arquitetura atende aos requisitos: fonte única de refresh, timeout, session version, max retry, lock com finally, interceptor e sync compatíveis, logs presentes.

### 2. Problemas potenciais futuros

| Risco | Mitigação sugerida |
|-------|--------------------|
| Multi-aba = 1 refresh por aba (não 1 global) | Se for requisito, considerar SharedWorker ou broadcast channel para coordenar refresh entre abas. |
| Após 2 falhas consecutivas, usuário precisa reload/login | Comportamento esperado (evita spam); documentar para suporte. |
| REFRESH_TIMEOUT_MS fixo 10s | Se necessário, tornar configurável (env) sem alterar default. |

### 3. Sugestões arquiteturais

- Manter a regra: **nenhum** outro módulo importar `refresh-internal` para chamar `refreshAccessTokenInternal`; apenas `refresh-lock-manager` pode.
- Em code review, checar qualquer novo uso de "refresh" ou "auth/refresh" para garantir que passa por `runRefreshWithLock()`.
- Opcional: teste E2E que intercepta POST /auth/refresh e conta chamadas (esperado 1 por “onda” de 401 na mesma aba).

---

## PROVAS LÓGICAS

### 4. Prova: não existe refresh concorrente (na mesma aba)

- O único código que executa o fetch de refresh é `refreshAccessTokenInternal()`, chamado **apenas** em `refresh-lock-manager.ts` dentro de `runRefreshWithLock()`.
- `runRefreshWithLock()`: se `refreshPromise !== null`, retorna a mesma promise (não cria outra). Se `refreshPromise === null`, cria **uma** nova promise que chama `refreshAccessTokenInternal()` uma vez; essa promise é guardada em `refreshPromise` até o `finally` (que zera `refreshPromise`).
- Logo, em qualquer momento há no máximo **uma** execução de `refreshAccessTokenInternal()` em voo por aba. Qualquer outro 401 na mesma aba reutiliza a mesma promise. **Prova:** invariante “no máximo 1 refresh em voo” mantida por construção.

### 5. Prova: logout não ressuscita token

- Logout (ou qualquer 401/403 que chame clear) chama `clearAllTokens()` → `incrementSessionVersion()` primeiro. Assim, no instante em que o refresh (já em voo) resolver, `getSessionVersion()` já foi incrementado.
- Em `refreshAccessTokenInternal()`, antes de `tokenManager.set()` há o check `getSessionVersion() !== capturedVersion`. Como a versão foi incrementada no logout, a condição é verdadeira → não entra no `tokenManager.set()` → retorna false. Nenhum token é escrito após o logout. **Prova:** ordem (incrementSessionVersion antes de clear) + check antes de set garantem que token não revive.

### 6. Prova: timeout sempre libera lock

- O lock é liberado **apenas** no `finally` de `runRefreshWithLock()` (refresh-lock-manager.ts). O `finally` roda após o término da promise interna (sucesso, falha ou rejeição).
- `refreshAccessTokenInternal()` em timeout: após 10s, `controller.abort()` → fetch rejeita → catch → `return false`. A promise de `refreshAccessTokenInternal()` resolve (com false). Assim, a promise interna do lock termina → o `finally` é executado → `refreshPromise = null`. **Prova:** não há caminho em que o refresh fique pendente para sempre sem resolver/rejeitar; o finally sempre roda e libera o lock.

### 7. Prova: não existe loop infinito de refresh

- **Por request:** o interceptor retenta no máximo 1 vez (`__retriedByRefresh` >= 1 impede novo retry). Não há segundo retry do mesmo request.
- **Refresh em si:** não há loop dentro de `refreshAccessTokenInternal()`; é um único fetch. Não há retry interno de refresh no interceptor (apenas 1 chamada a `runRefreshWithLock()` por 401).
- **Global:** após 2 falhas consecutivas, `refreshAccessTokenInternal()` retorna false sem chamar o backend; só reset em login/register ou (conceitualmente) em sucesso. **Prova:** limites explícitos (1 retry por request, 2 falhas globais, 1 refresh por “onda”) garantem ausência de loop infinito.

---

## MODO GOD MODE — Simulação mental

### Cenário 1 — 10 requests simultâneos + token expirado

- Os 10 recebem 401; os 10 entram no interceptor e chamam `runRefreshWithLock()`.
- O primeiro deixa `refreshPromise === null` e cria a promise que chama `refreshAccessTokenInternal()`; os outros 9 veem `refreshPromise !== null` e retornam a mesma promise.
- Resultado: 1 fetch de refresh; 10 aguardam a mesma promise; quando ela resolve com true, os 10 retentam seus requests. **Comportamento:** 1 refresh; 10 retries; determinístico.

### Cenário 2 — Refresh demora 30s

- Backend não responde em 10s → `controller.abort()` → AbortError → catch em refresh-internal → REFRESH_TIMEOUT_ABORT, retorna false → finally no lock → REFRESH_LOCK_RELEASED, `refreshPromise = null`.
- Requests que aguardavam recebem false → interceptor não retenta → clearAllTokens + redirect. **Comportamento:** timeout em 10s; lock liberado; sistema não trava; usuário vai para login.

### Cenário 3 — Logout durante refresh

- Refresh em voo (fetch ainda não retornou). Usuário faz logout → `clearAllTokens()` → `incrementSessionVersion()` (versão sobe) → `resetRefreshLock()` (refreshPromise = null; a promise em voo continua até resolver).
- Resposta do refresh chega → tokenManager.set só seria chamado se versão igual → getSessionVersion() !== capturedVersion → REFRESH_IGNORED_SESSION_VERSION_MISMATCH → não set → retorna false.
- Quem estava aguardando a promise recebe false → não retenta; clear já foi chamado; reload leva à tela de login limpa. **Comportamento:** token não revive; sessão limpa.

### Cenário 4 — Refresh falha 2x seguidas

- Primeira 401: runRefreshWithLock → refreshAccessTokenInternal → fetch falha (4xx/rede) → consecutiveRefreshFailures = 1 → retorna false → lock libera.
- Segunda 401 (nova ação): runRefreshWithLock → refreshAccessTokenInternal → fetch falha de novo → consecutiveRefreshFailures = 2 → retorna false → lock libera.
- Terceira 401 (nova ação): refreshAccessTokenInternal → `consecutiveRefreshFailures >= 2` → REFRESH_SKIP_MAX_RETRY_REACHED → retorna false **sem** chamar o backend. Lock libera; interceptor faz clear + redirect. **Comportamento:** MAX_REFRESH_RETRY respeitado; sem spam ao backend; recuperação só com reload/login.

---

## Expectativa final — Atendimento

| Garantia | Status |
|----------|--------|
| Determinismo | ✅ Mesmo cenário (ex.: 10 requests 401) → 1 refresh, N retries. |
| Idempotência | ✅ Retry do request após refresh é 1x por request; refresh não é reexecutado em paralelo na mesma aba. |
| Consistência de sessão | ✅ Session version impede token após logout; clearAllTokens ordem correta. |
| Resiliência a concorrência | ✅ Lock garante 1 refresh por aba; demais aguardam. |
| Resiliência a rede ruim | ✅ Timeout 10s; lock libera; sem promise infinita. |
| Resiliência a backend instável | ✅ Max retry global; timeout; sem loop. |

---

*Auditoria baseada no código em src/lib (refresh-internal, refresh-lock-manager, auth-runtime-guard, http-client) e sync engine. Nenhuma alteração de código foi feita.*
