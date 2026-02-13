# Playbook de Incidentes — Vai de Pix

Resposta rápida a falhas comuns em produção.

---

## 1. API retorna 500

1. **Verificar logs** (aplicação e Sentry): mensagem de erro e stack (interno).
2. **Health check:** `GET /health` ou `GET /api/health`. Se `database: error`, problema de conexão ou banco.
3. **Banco:** conexão, migrações aplicadas, espaço em disco. Rollback automático já evitou estado parcial; confirmar que não há transação travada.
4. **Deploy:** rollback da última versão se a falha começou após deploy.

---

## 2. Banco fora do ar ou timeout

1. Confirmar status do provedor (Railway, Supabase, etc.).
2. Verificar variável `DATABASE_URL` e rede (firewall, VPN).
3. Não reaplicar migrações em pânico; aguardar banco voltar e testar com `GET /health`.
4. Após recuperação, conferir se há fila de jobs atrasados (recorrências, insights); próximo ciclo do scheduler corrige.

---

## 3. Usuários não conseguem fazer login / 401 em massa

1. Verificar se `SECRET_KEY` não foi alterada (invalida todos os JWTs).
2. Se usar refresh token: verificar cookie `refresh_token` (HttpOnly, Secure) e domínio.
3. Sentry: erros em `/auth/login` ou `/auth/refresh` (credenciais, usuário inativo).
4. Rate limit: excesso de tentativas pode bloquear IP; ajustar ou liberar conforme política.

---

## 4. Jobs (recorrências, insights) não executam ou falham

1. Logs do processo: procurar por `run_recurring_transactions`, `run_insights_job` e exceções.
2. Banco: jobs usam sessão própria; falha de DB gera rollback e log.
3. Métricas: `insights_errors_total` (Prometheus) indica falhas no job de insights.
4. Não rodar jobs manualmente em produção sem backup; preferir corrigir causa (dados, código) e aguardar próxima execução.

---

## 5. Dados inconsistentes (saldo, ledger)

1. **Não** alterar ledger manualmente; é append-only.
2. Verificar invariantes: `docs/FINANCIAL-RULES.md` e `tests/test_financial_invariants.py`.
3. Se houver divergência saldo vs ledger: usar script de recálculo (se existir) em ambiente controlado; depois migração ou correção pontual com cuidado.
4. Abrir incidente e documentar antes de qualquer correção manual.

---

## 6. Divergência de snapshot (Trilha 5.2)

1. Job `reconcile_snapshots` roda diariamente e loga ERROR quando snapshot.balance ≠ soma do ledger até o fim do mês (tolerância ε).
2. **Logs:** procurar por "Divergência de snapshot na conciliação"; extra: account_id, snapshot_date (mês), diff_abs (sem saldo em texto).
3. **Causa comum:** snapshot gerado antes de alguma correção no ledger; ou arredondamento. Reexecutar `compute_monthly_snapshots` para o mês afetado recalcula do ledger e atualiza o snapshot (idempotente).
4. **Sentry:** evento genérico "divergência na conciliação"; não incluir valores financeiros na mensagem.

---

## 7. Conflito de versão (row_version / 409)

1. Se a API retornar 409 (Conflito): outra requisição alterou o recurso; usuário deve recarregar e tentar de novo.
2. **Logs:** identificar recurso (conta, transação) e user_id; não logar payload completo.
3. Em disputas de concorrência, ledger e invariantes permanecem a fonte da verdade; resolver conflito reprocessando com dados atuais.

---

## 8. Ledger inconsistente

1. **Não** fazer UPDATE ou DELETE em `ledger_entries`; é append-only (ver `docs/AUDITABILITY.md`).
2. Se houver suspeita de entradas duplicadas ou fora de ordem: comparar `SUM(ledger_entries.amount)` por conta com `account.balance`; usar `core/ledger_utils.get_balance_from_ledger` e `sync_account_balance_from_ledger` em ambiente controlado.
3. Script `scripts/backfill_ledger.py` é idempotente (ignora transações que já têm entradas no ledger); pode ser reexecutado após restore parcial.
4. Abrir incidente; documentar qualquer correção; preferir recálculo do saldo a partir do ledger em vez de edição manual do ledger.

---

## 9. Saldo divergente (account.balance ≠ ledger)

1. **Fonte da verdade:** ledger. Saldo correto = `SUM(ledger_entries.amount)` por conta.
2. Job `reconcile_snapshots` (Trilha 5.2) detecta divergência entre snapshot e ledger; ver seção 6.
3. Para corrigir saldo em tempo real: em ambiente controlado, executar `sync_account_balance_from_ledger(account_id, db)` por conta afetada (ou script de recálculo em lote). Não alterar o ledger.
4. Ver `docs/AUDITABILITY.md` e `scripts/recalculate_all_balances.py` (legado; em produção o saldo é derivado do ledger).

---

## 10. Job preso

1. **Causa comum:** lock advisory do job (Trilha 7) mantido por processo que morreu sem liberar; ou transação longa no banco.
2. **Logs:** procurar por `execute_insights_job`, `insights_job`, exceções; métricas `job_lock_contended_total`, `job_duration_seconds`.
3. **PostgreSQL:** verificar sessões ativas (`pg_stat_activity`); identificar sessão que detém o lock do job (advisory lock por hash do nome do job). Encerrar sessão apenas se for seguro (ex.: worker conhecido que travou).
4. Após liberar: próximo agendamento do job executará normalmente; locks são por sessão e são liberados ao fim da conexão.
5. Não reexecutar o mesmo job manualmente em paralelo; apenas um worker deve executar por vez.

---

## 11. Pico de 409 (idempotência)

1. 409 com mensagem de Idempotency-Key: outra requisição com a mesma key está em andamento, ou cliente está retentando em excesso.
2. **Logs:** identificar endpoint e user_id; não logar a key completa.
3. Comportamento esperado: retry com mesma key + mesmo payload retorna resposta cacheada (200); payload diferente com mesma key retorna 400.
4. Se pico for anormal: verificar rate limit no cliente; considerar alerta se `job_lock_contended_total` ou 409 por minuto ultrapassar limite (ver `docs/OBSERVABILITY.md`).
5. Não desabilitar idempotência; reduz risco de duplicação financeira.

---

## 12. DB read-only (replica ou modo manutenção)

1. Escritas (POST/PUT/DELETE, jobs que escrevem) falharão; leituras podem funcionar.
2. **Health check:** pode indicar erro se o app testar escrita no health.
3. Ação: identificar se é replica read-only ou instância em manutenção; redirecionar tráfego de escrita para primary ou aguardar fim da janela.
4. Após volta ao normal: jobs atrasados rodarão no próximo ciclo; idempotência e locks evitam duplicação ao reprocessar.

---

## 13. Restore parcial (backup restaurado com perda de dados)

1. **Antes de qualquer escrita:** validar invariantes (`tests/test_financial_invariants.py`) e saldo vs ledger (conciliação).
2. **Backfill do ledger:** se transações existirem sem entradas no ledger, executar `scripts/backfill_ledger.py` (idempotente); não duplica entradas já existentes.
3. **Snapshots:** reexecutar `compute_monthly_snapshots` para períodos afetados (idempotente).
4. **Conciliação:** rodar `reconcile_snapshots` e corrigir divergências conforme seção 6.
5. Testes de recuperação: `backend/tests/test_recovery.py` cobre cenário de restore incompleto + backfill + idempotência total.

---

## Contatos e referências

- **Logs:** ambiente (Railway/Vercel) e Sentry.
- **Configuração:** `env.local.example`, variáveis de ambiente.
- **Regras financeiras:** `docs/FINANCIAL-RULES.md`.
- **Como o sistema falha:** `docs/FAILURE-SIMULATION.md`.
- **Auditoria e ledger:** `docs/AUDITABILITY.md`.
- **Testes de recuperação:** `backend/tests/test_recovery.py`.
