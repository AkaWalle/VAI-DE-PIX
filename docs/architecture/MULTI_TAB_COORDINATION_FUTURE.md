# Multi-Aba — Coordenação Futura (Design Doc)

**Status:** Apenas preparação. **Não implementar** lock global entre abas neste momento.

---

## Contexto atual

- Lock de refresh é **por aba** (estado de módulo no contexto da aba).
- N abas com token expirado podem gerar N chamadas a POST /auth/refresh (uma por aba).
- Comportamento é **aceitável para SaaS padrão**; backend deve suportar múltiplos refreshes em paralelo (ex.: idempotência).

---

## Objetivo futuro (se necessário)

Reduzir a 1 refresh global por “onda” de 401, mesmo com múltiplas abas abertas: uma aba executa o refresh, as outras aguardam e reutilizam o resultado.

---

## Opção 1 — BroadcastChannel

- **Ideia:** Uma aba que inicia o refresh envia mensagem `refresh_started`. Outras abas que recebem 401 não iniciam novo refresh; aguardam mensagem `refresh_done` (com sucesso/falha) e então retentam ou fazem clear.
- **Desafio:** Estado do “token novo” não pode ser enviado pelo BroadcastChannel (evitar vazamento). As outras abas precisam obter o token: (1) ler do localStorage após `refresh_done` (a aba que fez refresh já gravou), ou (2) fazer um único request que usa o token já gravado.
- **Fluxo:** Aba A: 401 → inicia refresh → postMessage `refresh_started`. Abas B, C: 401 → não iniciam refresh, subscrevem `refresh_done`. Aba A: refresh ok → tokenManager.set → postMessage `refresh_done`. B, C: recebem → retentam request (token já está no storage).
- **Fallback:** Se BroadcastChannel não existir (ambientes antigos), usar lock local (comportamento atual).

---

## Opção 2 — Aba líder (eleição)

- **Ideia:** Eleger uma “aba líder” (ex.: primeira aba que abriu, ou por tabId). Apenas a líder pode disparar refresh; as outras abas enviam “pedido de refresh” e aguardam resultado via BroadcastChannel ou localStorage + polling.
- **Complexidade:** Detecção de aba fechada (líder saiu); reeleição. Maior custo de implementação.

---

## Opção 3 — Lock em IndexedDB (distribuído)

- **Ideia:** Lock distribuído em IndexedDB (ex.: chave `refresh_lock` com timestamp). Aba que consegue escrever a chave “ganha” o lock; outras aguardam e leem o resultado (ex.: outra chave `refresh_result`).
- **Desafio:** Orquestração e timeout do lock; evitar deadlock se aba crashar. Mais complexo.

---

## Recomendação

- **Curto prazo:** Manter lock por aba; monitorar métrica `refresh_calls_total` por sessão/aba. Se backend e produto forem estáveis, não implementar coordenação entre abas.
- **Se for necessário:** Implementar **Opção 1 (BroadcastChannel)** com fallback para lock local; sem SharedWorker para reduzir complexidade. Ordem: (1) refresh_started / refresh_done; (2) outras abas não chamam runRefreshWithLock, aguardam evento; (3) ao receber refresh_done, retentam request (token já no storage).

---

## Não implementar ainda

- Nenhuma alteração em `runRefreshWithLock`, `refresh-internal` ou interceptor para coordenar entre abas.
- Nenhum SharedWorker ou IndexedDB lock neste estágio.
