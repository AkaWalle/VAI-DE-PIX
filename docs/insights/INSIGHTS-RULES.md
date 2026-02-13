# Regras e versões dos Insights Financeiros

Insights são calculados de forma **determinística e explicável** (sem IA opaca). Este documento descreve as regras de negócio e o histórico de versões do payload.

## Versão do cache (InsightCache.data)

- **version: 1** (atual)
  - `category_monthly_variation`: variação mensal por categoria (despesas)
  - `goals_at_risk`: metas em risco de não serem atingidas
  - `impact_score`: em cada item, para ranking por impacto financeiro
  - Caches antigos sem `version` são tratados como version=1

## Ranking por impacto (impact_score)

- **Categoria:** `impact_score = |current_amount - previous_amount|`
  - Ordenação: maior impacto primeiro (DESC).
- **Meta em risco:** `impact_score = gap` (valor que falta para a meta)
  - Ordenação: maior gap primeiro (DESC).

O frontend exibe até 5 itens por tipo e pode mostrar o badge "Maior impacto" no primeiro.

## Variação mensal por categoria

- Comparação: mês atual vs mês anterior (despesas por categoria).
- Se mês anterior = 0 ou inexistente: não há percentual; `variation_pct` = null, explicação "Novo gasto neste mês: R$ X".
- Nunca divisão por zero.
- Ordenação: por `impact_score` DESC.

## Metas em risco

- Critério: `required_per_month > current_rate * 1.2` (margem 20%) ou `days_left < 60` com ritmo zero.
- `current_rate` = `current_amount / meses_desde_criação` (mínimo 0,25 meses).
- Futuro: `current_rate` pode ser substituído por média móvel de aportes reais (sem alterar contrato).

## Feedback (vistos / ignorados)

- Tabela `insight_feedback`: id, user_id, insight_type, insight_hash, status (seen | ignored), created_at.
- **POST /api/insights/feedback**: body `{ insight_type, insight_hash, status }`. insight_type: `category_variation` | `goal_at_risk`.
- Insights marcados como **ignored** não reaparecem por **30 dias** (TTL). GET /api/insights filtra esses hashes antes de retornar.
- Cada item de insight retornado inclui `insight_hash` estável (ex.: `category_variation:{category_id}:{YYYY-MM}`, `goal_at_risk:{goal_id}`).
- Frontend: botões "Entendi" (seen) e "Ignorar" (ignored); ao clicar, envia feedback e recarrega insights.

## Preferências de insights

- Tabela `user_insight_preferences`: user_id (PK), enable_category_variation (bool, default True), enable_goals_at_risk (bool, default True).
- Se não existir linha para o usuário, ambos são considerados habilitados.
- **GET /api/insights/preferences**: retorna as preferências atuais.
- **PATCH /api/insights/preferences**: body `{ enable_category_variation?, enable_goals_at_risk? }` (upsert); valores omitidos não são alterados.
- O serviço aplica o filtro antes de retornar: se enable_category_variation = False, category_monthly_variation = []; se enable_goals_at_risk = False, goals_at_risk = [].
- Frontend: toggles em Configurações > "Insights no Dashboard".

## Cache incremental

- **Objetivo:** Evitar recalcular tudo; só recalcular o que mudou desde o último cálculo.
- **Transações:** `get_transactions_max_updated_at(user_id, db)` retorna o maior `updated_at`/`created_at` entre despesas do usuário nos meses atual e anterior. Se esse valor for menor ou igual a `cached.computed_at`, a lista `category_monthly_variation` pode vir do cache.
- **Metas:** `get_goals_max_updated_at(user_id, db)` retorna o maior `updated_at`/`created_at` entre metas ativas. Se for menor ou igual a `cached.computed_at`, a lista `goals_at_risk` pode vir do cache.
- **Comportamento:** Se o cache está dentro da idade (ex.: 25h) e nenhuma entidade foi alterada desde `computed_at`, a resposta vem só do cache. Se só transações mudaram: recalcula só `category_monthly_variation` e mantém `goals_at_risk` do cache. Se só metas mudaram: recalcula só `goals_at_risk` e mantém `category_monthly_variation` do cache. Se ambos ou cache ausente/antigo: recálculo completo.
- **Job diário:** Usa a mesma lógica (incremental por categoria ou por metas quando aplicável).

## Métricas Prometheus

- **Endpoint:** GET /metrics (formato text/plain; version=0.0.4).
- **Métricas de insights:**
  - `insights_compute_duration_seconds` (histograma, label `source`: api | job | api_incremental_category | api_incremental_goals | job_incremental_category | job_incremental_goals)
  - `insights_cache_hits_total` (counter): respostas servidas do cache sem recálculo
  - `insights_cache_misses_total` (counter): recálculos (API ou job)
  - `insights_errors_total` (counter, label `source`: api | job): erros ao calcular insights
- **Cache hit ratio:** Em PromQL: `sum(rate(insights_cache_hits_total)) / (sum(rate(insights_cache_hits_total)) + sum(rate(insights_cache_misses_total)))`.

## Policies (regras por versão)

- **Objetivo:** Evoluir regras sem quebrar caches antigos; nenhuma regra hardcoded no serviço principal.
- **Pasta:** `backend/domain/insight_policies/`
  - `common.py`: `month_bounds(months_ago)` — utilitário compartilhado.
  - `category_variation_v1.py`: regra v1 de variação mensal por categoria (despesas).
  - `goals_at_risk_v1.py`: regra v1 de metas em risco (ritmo, fator 1.2, days_left < 60).
- **Serviço:** `services/insights_service.py` chama as policies por versão (`INSIGHT_POLICY_VERSION = 1`); expõe `compute_category_monthly_variation`, `compute_goals_at_risk`, `compute_insights`, `get_transactions_max_updated_at`, `get_goals_max_updated_at`. Re-exporta `_month_bounds` e `_goal_current_monthly_rate` para compatibilidade com testes.
- **Evolução:** Nova versão = novo arquivo (ex.: `category_variation_v2.py`); o serviço pode passar a usar versão 2 por configuração ou por versão do cache.

## Detecção de eventos (C1)

- **Objetivo:** Agir sem polling constante; emitir eventos internos (sem fila externa por enquanto).
- **Barramento:** `core/events.py` — EventBus in-memory: `register(event_type, handler)` e `emit(event_type, payload)`. Handlers são chamados de forma síncrona; falha em um handler não interrompe os demais.
- **Eventos:**
  - **goal_entered_risk_state:** emitido quando uma meta passa a estar em risco (novo cálculo com `at_risk=True` e no cache anterior estava `at_risk=False` ou não existia). Payload: user_id, goal_id, goal_name, gap, days_left, risk_reason.
  - **spending_spike_detected:** emitido quando uma categoria tem variação percentual >= limiar (ex.: 30%). Payload: user_id, category_id, category_name, variation_pct, current_amount, previous_amount, explanation.
- **Onde emite:** `core/insight_events.py` — `emit_insight_events(user_id, new_data, old_data)` é chamado após recalcular insights (router GET /api/insights e job diário). Compara `new_data` com `old_data` (cache anterior) para goal_entered_risk; para spending_spike usa apenas `new_data` (variação >= 30%).
- **Uso futuro:** C2 pode registrar handlers (ex.: criar notificação in-app ou enviar e-mail) sem alterar o fluxo de insights.

## Changelog de versões

| Versão | Alteração |
|--------|-----------|
| 1 | Payload inicial: category_monthly_variation, goals_at_risk, computed_at. |
| 1 | Adição de impact_score e ordenação por impacto (retrocompatível: campo opcional no cliente). |
| 1 | Feedback visto/ignorado (insight_feedback, POST /feedback, TTL 30 dias). |
| 1 | Preferências de insights (user_insight_preferences, GET/PATCH /preferences, toggles em Configurações). |
| 1 | Cache incremental (recalcular só categoria ou só metas quando a entidade foi alterada; fallback para cálculo completo). |
| 1 | Regras isoladas em `domain/insight_policies` (category_variation_v1, goals_at_risk_v1); serviço chama por versão. |
| 1 | Detecção de eventos (goal_entered_risk_state, spending_spike_detected); EventBus in-memory; emit após recalcular insights. |
