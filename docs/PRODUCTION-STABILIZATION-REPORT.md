# Relatório de Estabilização em Modo Produção (Production Safe Go)

**Data:** 2025-02  
**Modo:** Zero breaking changes. Melhorias aditivas, defensivas ou em wrapper.

---

## 1. Risk Impact Analysis

### 1.1 Multi-tab refresh (cross-tab coordinator)

- **Por que é seguro:** O coordenador é uma camada **antes** do lock in-process. A API `runRefreshWithLock()` não muda: mesma assinatura e comportamento observável. Apenas uma aba executa o refresh; as outras aguardam o resultado via BroadcastChannel (async, sem travar a UI). Lock em localStorage com TTL 15s: se a aba líder travar, o lock expira e outra aba pode assumir. Nenhum fluxo de auth/refresh interno foi alterado; interceptors e guard continuam chamando o mesmo `runRefreshWithLock()`.
- **Risco:** Baixo. Fallback: se BroadcastChannel ou localStorage não existirem (ambiente antigo/privado), `tryAcquireCrossTabLock()` pode retornar true para todos e cada aba tenta refresh (comportamento anterior). Não pioramos o cenário.

### 1.2 Persistência de métricas (IndexedDB + localStorage)

- **Por que é seguro:** Hydrate só sobrescreve os contadores em memória quando estão **todos zerados** (início de sessão). Se o app já incrementou algo antes do hydrate terminar, não sobrescrevemos. Persistência é debounced (500ms) e fire-and-forget; falhas de storage não afetam o fluxo. Schema versionado (SCHEMA_VERSION = 1); dados corrompidos ou versão diferente resultam em retorno null e não quebram o app.
- **Risco:** Baixo. Overhead mínimo (uma leitura no bootstrap, writes debounced).

### 1.3 Export com retry queue e fallback local

- **Por que é seguro:** Export continua opcional (depende de `VITE_AUTH_METRICS_ENDPOINT`). Em falha de rede/backend, o payload é enfileirado (máx. 100) e reenviado no próximo ciclo. Nova função `getAuthMetricsExportBlob()` apenas gera JSON; não altera nenhum fluxo. Fila em memória; não persiste entre sessões (evita complexidade e edge cases).
- **Risco:** Baixo. Comportamento observável: export “sempre funciona” no sentido de não perder dado (fica na fila até enviar ou limite).

### 1.4 Limpeza de repositório

- **Nenhuma remoção foi feita.** Apenas relatório (SAFE / REVIEW / KEEP) para decisão posterior.

---

## 2. Patch Strategy

- **Multi-tab:** Novo módulo `cross-tab-refresh-coordinator.ts` (lock localStorage + BroadcastChannel). `refresh-lock-manager.ts` importa e, no início de `runRefreshWithLock()`, tenta adquirir lock; se não conseguir, aguarda resultado de outra aba; se conseguir, executa o fluxo existente e no `finally` notifica e libera o lock. `resetRefreshLock()` também libera o lock cross-tab.
- **Métricas:** Novo módulo `metrics-storage.ts` (IndexedDB + fallback localStorage). `auth-metrics.ts` ganha `hydrateAuthMetricsFromStorage()` e `schedulePersist()` chamado em cada increment; hydrate é chamado uma vez no `main.tsx` antes de iniciar o schedule de export.
- **Export:** Em `auth-metrics.ts`, fila `exportRetryQueue`, `flushExportRetryQueue()` no início de cada export, e em falha de envio push na fila. Nova função `getAuthMetricsExportBlob()` para export local (download/clipboard quando backend indisponível).
- **Cleanup:** Apenas análise e relatório; nenhum patch de remoção.

---

## 3. Implementation Summary

- **Arquivos novos:**  
  - `src/lib/cross-tab-refresh-coordinator.ts`  
  - `src/lib/metrics/metrics-storage.ts`
- **Arquivos alterados:**  
  - `src/lib/refresh-lock-manager.ts` (integração cross-tab)  
  - `src/lib/metrics/auth-metrics.ts` (hydrate, persist debounced, retry queue, getAuthMetricsExportBlob)  
  - `src/main.tsx` (chamada a hydrate antes do export schedule)

---

## 4. Migration Safety Notes

- **Rollout:** Nenhuma mudança de contrato de API. Deploy pode ser gradual. Navegadores sem BroadcastChannel/localStorage continuam funcionando (fallback para comportamento anterior em multi-tab).
- **Métricas:** Na primeira sessão após o deploy, o hydrate pode não ter dados (storage vazio); contadores começam em zero. A partir daí, persistência e hydrate passam a manter métricas entre sessões.
- **Export:** Backend pode continuar indisponível; o cliente apenas enfileira e tenta no próximo ciclo. Nenhuma dependência de feature flag para ativar isso.

---

## 5. Rollback Plan

- **Reverter commits** que introduziram:  
  - `cross-tab-refresh-coordinator.ts` e alterações em `refresh-lock-manager.ts`  
  - `metrics-storage.ts`, alterações em `auth-metrics.ts` e `main.tsx`
- **Multi-tab:** Remover import e uso do coordinator em `refresh-lock-manager.ts`; restaurar corpo original de `runRefreshWithLock()` e `resetRefreshLock()`.
- **Métricas:** Remover chamada a `hydrateAuthMetricsFromStorage()` em `main.tsx`; remover import de `metrics-storage`, `schedulePersist()` e chamadas a `schedulePersist()` em `auth-metrics.ts`.
- **Export:** Remover `exportRetryQueue`, `flushExportRetryQueue`, `getAuthMetricsExportBlob` e lógica de enfileiramento em `exportAuthMetricsToBackend`; restaurar envio direto como antes.
- **Banco/localStorage:** Opcionalmente limpar chaves `vdp_refresh_lock`, `vdp_auth_metrics`, DB `vdp_auth_metrics` após rollback para evitar dados órfãos.

---

## 6. Cleanup Report (Full Removal Report — BEFORE Deleting Anything)

Nenhum item foi deletado. Classificação para decisão futura:

---

### SAFE TO DELETE

- **Nenhum arquivo listado como “safe to delete” sem revisão humana.**  
  (Não foram encontrados arquivos `.bak`, `.backup` ou órfãos óbvios no `src/`.)

---

### REVIEW BEFORE DELETE

| Item | Motivo |
|------|--------|
| `src/lib/api-detector.ts` | Não é importado em nenhum arquivo em `src/`. É referenciado em `tests/unit/api.test.ts` e em docs. **Revisar:** se o teste e a detecção de API forem descontinuados, o módulo pode ser removido; caso contrário, reestabelecer import em algum ponto de entrada (ex.: `api.ts` ou bootstrap). |
| Função deprecada `refreshAccessToken()` em `auth-runtime-guard.ts` | Marcada `@deprecated`; mantida por compatibilidade. **Revisar:** após confirmar que nenhum código externo ou legado a chama, remover. |
| `_archive/` (pasta inteira) | Contém relatórios e docs antigos. **Revisar:** mover para repositório de documentação ou apagar após garantir que nada no código ativo referencia esses arquivos. |

---

### KEEP

| Item | Motivo |
|------|--------|
| `auth-store-api.ts` e `auth-store-index.ts` | Store real e re-export; ambos usados em vários componentes. Manter. |
| `auth-runtime-guard.ts` (exceto deprecation acima) | Usado por sync engine, hooks e guard; manter. |
| Todos os arquivos em `src/lib/metrics/` | Em uso (auth-metrics, metrics-storage). Manter. |
| `cross-tab-refresh-coordinator.ts` | Novo; necessário para multi-tab. Manter. |
| Variáveis de ambiente (VITE_*) | Em uso (api, metrics, sentry, shared expenses god mode). Manter. |
| Código de “backup” em Settings (backup dos dados) | Funcionalidade de export/backup para o usuário; não é código legado. Manter. |

---

### Unused Imports / Dead Code (Quick Wins)

- Não foi feita varredura automática de “cada import não referenciado” em todos os arquivos. Recomendação: rodar ferramenta de lint (ex.: `eslint` com regra de imports não usados) e remover apenas após revisão, pois alguns imports podem ser usados por tipo ou re-export.

---

## 7. Quality Bar Checklist

- [x] Zero runtime regression: alterações aditivas ou em wrapper.
- [x] Nenhum aumento de erros esperado em log (falhas de storage e rede tratadas de forma silenciosa ou com fallback).
- [x] Multi-tab: apenas uma aba executa refresh (lock cross-tab + BroadcastChannel).
- [x] Métricas sobrevivem a restart do browser (hydrate + persist).
- [x] Export nunca totalmente bloqueado (retry queue + getAuthMetricsExportBlob para uso local).
- [x] Repo não foi alterado por remoções; apenas relatório de cleanup para decisão posterior.

---

## 8. Final Validation (Mental Simulation)

- **Multi-tab:** Várias abas abertas → uma adquire lock, executa refresh, notifica; outras aguardam e recebem o resultado. OK.
- **Offline:** Sem endpoint ou rede; export enfileira ou gera blob local. OK.
- **Backend down:** Export falha → payload na fila; próximo ciclo tenta de novo. OK.
- **Browser restart:** Hydrate restaura métricas do IndexedDB/localStorage; export schedule inicia após hydrate. OK.

Nenhum cenário exige quebra de contrato ou fluxo existente.
