# Lista para limpeza — docs/ e scripts/

**Objetivo:** remover apenas arquivos gerados por LLM, documentações obsoletas e scripts sem uso ativo.  
**Nada será deletado até você confirmar.**

---

## docs/

### MANTER (referenciados ou úteis para onboarding/operação)

| Arquivo | Motivo |
|--------|--------|
| **docs/README.md** | Índice da documentação. |
| **docs/ARCHITECTURE.md** | Referencia FINANCIAL-RULES, BACKUP; estrutura da doc. |
| **docs/FINANCIAL-RULES.md** | Regras de negócio; citado em ARCHITECTURE, INCIDENT-PLAYBOOK, READY-TO-SCALE, etc. |
| **docs/INCIDENT-PLAYBOOK.md** | Runbooks; citado em OBSERVABILITY, READY-TO-SCALE. |
| **docs/AUDITABILITY.md** | Ledger/auditoria; citado em INCIDENT-PLAYBOOK, THREAT-MODEL, READY-TO-SCALE. |
| **docs/IDEMPOTENCY.md** | Idempotency-Key; citado em THREAT-MODEL, READY-TO-SCALE. |
| **docs/OBSERVABILITY.md** | Métricas/health; citado em INCIDENT-PLAYBOOK, READY-TO-SCALE. |
| **docs/THREAT-MODEL.md** | Ameaças; citado em READY-TO-SCALE, AUTH-401-PREVENTION. |
| **docs/FAILURE-SIMULATION.md** | Resiliência; citado em INCIDENT-PLAYBOOK, READY-TO-SCALE. |
| **docs/DATA-CLASSIFICATION.md** | LGPD/classificação; citado em READY-TO-SCALE. |
| **docs/DATA-RETENTION.md** | Retenção; citado em READY-TO-SCALE. |
| **docs/BACKUP-POSTGRESQL.md** | Backup; citado em ARCHITECTURE, READY-TO-SCALE. |
| **docs/SHARED-EXPENSES-API.md** | API despesas compartilhadas; referência técnica. |
| **docs/SHARED-EXPENSES-GOD-MODE-ARCHITECTURE.md** | Arquitetura GOD MODE; citado em AUTH-401-PREVENTION. |
| **docs/AUTH-401-PREVENTION.md** | Prevenção 401; citado em outros docs. |
| **docs/auth/REFRESH-TOKENS-API.md** | Contrato refresh; citado em AUTH-401-PREVENTION. |
| **docs/READY-TO-SCALE-CHECKLIST.md** | Checklist escala; cita vários docs. |
| **docs/ARQUIVOS_VERCEL_NEON.md** | Índice deploy Vercel/Neon; aponta para VERCEL-NEON-DEPLOY. |
| **docs/ANALISE-DESPESAS-COMPARTILHADAS-CONFIRMACAO.md** | Análise de confirmação; referência de decisão. |
| **docs/MIGRATION-GUIDE.md** | Guia de migração; onboarding. |
| **docs/INSTALL.md** | Instalação; onboarding. |
| **docs/setup-backend.md** | Setup backend; onboarding. |
| **docs/GUIA-VERSIONAMENTO.md** | Versionamento; onboarding. |
| **docs/MONEY-API-STRING-MIGRATION.md** | Migração money/string; histórico técnico. |
| **docs/QA-MONEY-SERIALIZATION.md** | QA serialização; referência testes. |
| **docs/insights/INSIGHTS-RULES.md** | Regras de insights; citado em FINANCIAL-RULES, ARCHITECTURE. |
| **docs/qa/TESTES_COMPLETOS.md** | Testes; onboarding QA. |
| **docs/qa/COMO_VERIFICAR_TESTES_ACTIONS.md** | CI/GitHub Actions; útil para devs. |
| **docs/qa/COMMIT_MESSAGE.md** | Convenção de commits. |
| **docs/qa/QA-AVANCADO.md** | QA avançado; referência. |
| **docs/deploy/DEPLOY-VERCEL.md** | Deploy Vercel; citado em vários. |
| **docs/deploy/VERCEL-NEON-DEPLOY.md** | Passo a passo Vercel+Neon; principal para deploy. |
| **docs/deploy/README-VERCEL.md** | README Vercel. |
| **docs/deploy/RAILWAY_DEPLOY_GUIDE.md** | Deploy Railway; alternativa. |
| **docs/deploy/env.local.example** | Exemplo de env para deploy. |
| **docs/architecture/flows/*.md e *.mmd** | Fluxos de arquitetura (auth, refresh, sync, metrics, websocket); CODE-MAPPING, README, AUDIT-CHECKLIST. |
| **docs/architecture/MULTI_TAB_COORDINATION_FUTURE.md** | Design futuro multi-aba; citado em upgrade. |
| **docs/upgrade/ENTERPRISE_SAFE_UPGRADE_PLAN.md** | Plano de upgrade; referência. |
| **docs/SEGURANCA-NEON-RLS.md** | RLS Neon; segurança. |
| **docs/CI-BACKEND-POSTGRES.md** | CI backend/Postgres. |
| **docs/RESUMO-SISTEMA.md** | Resumo do sistema; onboarding. |
| **docs/AUTOMACOES-IDÉIAS.md** | Ideias de automação. |
| **docs/ADVANCED-TESTING.md** | Testes avançados. |
| **docs/EXPORTAR_CONFIGURACOES_CURSOR.md** | Config Cursor; útil para equipe. |
| **docs/MCP_FIGMA.md** | Explica MCP Figma (somente leitura); referência. |

### REMOVER (relatórios pontuais, auditorias já executadas, obsoletos)

| Arquivo | Motivo |
|--------|--------|
| **docs/FAXINA_RELATORIO.md** | Relatório da faxina já executada; histórico pontual. |
| **docs/SCHEMA_AUDIT_DEPLOY.md** | Auditoria de schema pré-deploy já executada. |
| **docs/PRODUCTION-STABILIZATION-REPORT.md** | Relatório pontual de estabilização. |
| **docs/AUTH-AUDIT-401-REPORT.md** | Auditoria 401 já executada. |
| **docs/AUTH-AUDIT-DEEP-VALIDATION.md** | Auditoria deep validation já executada. |
| **docs/AUTH-REFRESH-ARCHITECTURE-AUDIT.md** | Auditoria de arquitetura refresh já executada. |
| **docs/AUTH-RESIDUAL-RISKS-AUDIT.md** | Auditoria de riscos residuais já executada. |
| **docs/AUDIT-RESPONSE-AND-RISK-MAP.md** | Mapa de risco/auditoria pontual. |
| **docs/REFRESH-TOKEN-PATCH.md** | Patch já implementado; histórico. |
| **docs/architecture/flows/REMOCAO_MIRO_RELATORIO.md** | Relatório de remoção Miro; pontual. |
| **docs/cleanup/CLEANUP_REMOVAL_PROOF.md** | Prova de cleanup; pontual. |
| **docs/cleanup/UNUSED_FILES_REPORT.md** | Relatório de arquivos não usados; pontual. |
| **docs/testing/TRANSACTION_FLOW_VALIDATION_REPORT.md** | Relatório de validação de fluxo; pontual. |
| **docs/testing/HARDENING_TRANSACTIONS_SUMMARY.md** | Resumo de hardening; pontual. |
| **docs/testing/CHAOS_TESTING_PREPARATION.md** | Preparação chaos testing; pontual. |
| **docs/qa/RESUMO_IMPLEMENTACAO_QA.md** | Resumo de implementação QA; pontual. |
| **docs/reports/staging-final.md** | Relatório staging; pontual. |
| **docs/reports/validation-pre-producao.md** | Relatório validação pré-produção; pontual. |
| **docs/CONFIGURAR-DBEAVER-CORRETO.md** | Setup DBeaver; ambiente local, candidato a obsoleto. |
| **docs/CORRIGIR-PG-HBA-IP-DIFERENTE.md** | Ajuste pg_hba; setup pontual. |

### docs/scripts/ (scripts dentro de docs — duplicatas ou exemplos)

| Arquivo | Motivo |
|--------|--------|
| **docs/scripts/configurar-firewall.ps1** | Exemplo/cópia; existe em scripts/ na raiz. |
| **docs/scripts/config_vercel_env.sh** | Exemplo; existe em scripts/ na raiz. |
| **docs/scripts/iniciar-sistema.ps1** | Exemplo; existe em scripts/ na raiz. |
| **docs/scripts/start_production.bat** | Exemplo; existe em scripts/ na raiz. |
| **docs/scripts/test_api.sh** | Exemplo; existe em scripts/ na raiz. |

---

## scripts/ (raiz do projeto)

### MANTER (usados em package.json ou referenciados em docs ativos)

| Arquivo | Motivo |
|--------|--------|
| **scripts/assert-no-refresh-outside-lock.mjs** | Referenciado em package.json (`npm run assert-auth`). |
| **scripts/guard-no-miro.mjs** | Referenciado em package.json e CI (`npm run guard:no-miro`). |
| **scripts/run-migrations-neon.py** | Citado em ARQUIVOS_VERCEL_NEON, SHARED-EXPENSES-API, VERCEL-NEON-DEPLOY, ANALISE-DESPESAS. |
| **scripts/vercel-build.sh** | Citado em ARQUIVOS_VERCEL_NEON (build Vercel). |
| **scripts/setup-database.sh** | Citado em deploy/DEPLOY-VERCEL, deploy/VERCEL-NEON-DEPLOY. |
| **scripts/setup-database.ps1** | Equivalente Windows do setup-database. |
| **scripts/verificar-neon.py** | Documentado no próprio arquivo; útil para validar Neon. |

### REMOVER (obsoletos, deploy antigo, pontuais)

| Arquivo | Motivo |
|--------|--------|
| **scripts/configurar-firewall.ps1** | Setup de firewall; ambiente específico, não referenciado no package.json. |
| **scripts/config_vercel_env.sh** | Config env Vercel; pode estar obsoleto (deploy atual via dashboard). |
| **scripts/deploy-vercel.ps1** | Deploy manual; fluxo atual é Vercel Git. |
| **scripts/deploy-vercel.sh** | Idem. |
| **scripts/exportar-config-cursor.ps1** | Exportar config Cursor; pontual. |
| **scripts/habilitar-conexao-remota-postgres.sh** | Conexão remota Postgres (contexto RPI/servidor removido). |
| **scripts/iniciar-sistema.ps1** | Iniciar sistema; genérico, não referenciado. |
| **scripts/limpar-documentacao.ps1** | Limpeza de doc; pontual. |
| **scripts/limpar-documentacao.sh** | Idem. |
| **scripts/liberar-portas-rede.ps1** | Rede/firewall; ambiente específico. |
| **scripts/start_production.bat** | Batch produção; não referenciado. |
| **scripts/test-all-routes.sh** | Teste de rotas; manual/pontual. |
| **scripts/test_api.sh** | Teste de API; manual/pontual. |

---

## Resumo de contagem

- **docs/**  
  - MANTER: 44 itens (arquivos/pastas listados acima como MANTER).  
  - REMOVER: 20 arquivos em docs/ + 5 em docs/scripts/ = **25 itens**.
- **scripts/**  
  - MANTER: **7** scripts.  
  - REMOVER: **13** scripts.

---

## Observações

1. **README.md da raiz** e **CONTRIBUTING.md**, **ARCHITECTURE.md** da raiz não foram listados para remoção (conforme restrição).
2. **SETUP-RASPBERRY-PI.md** já foi removido na faxina anterior; o README ainda cita esse link (pode quebrar). Ajuste no README não faz parte desta lista; só docs/ e scripts/.
3. Scripts em **backend/scripts/** (ex.: backfill_ledger.py, recalculate_all_balances.py, validate_env.py) não foram analisados; só **scripts/** na raiz.
4. Após sua confirmação explícita (ex.: “Pode remover os itens REMOVER”), serão apagados apenas os listados como REMOVER; em seguida rodamos `npm run build` e reportamos o que foi removido.

Responda por exemplo: **“Confirmo remoção dos listados como REMOVER”** ou indique exceções (ex.: “Remover tudo exceto docs/REFRESH-TOKEN-PATCH.md”).
