# Retenção e Minimização de Dados — Vai de Pix

Documento da Trilha 2 (LGPD & Compliance) do Roadmap Técnico.  
**Objetivo:** Definir o que pode ser deletado, o que deve ser anonimizado e o que é obrigatório manter.

---

## Princípios

- **Minimização:** reter apenas o necessário para o serviço e para obrigações legais.
- **Ledger:** histórico contábil (ledger_entries) é **obrigatório manter** para auditoria; não deletar linhas; em exclusão de usuário, considerar anonimização do user_id conforme política jurídica.
- **Logs:** retenção limitada (ex.: 30–90 dias); sem valores financeiros nem dados pessoais em claro no Sentry.

---

## Por entidade

| Dado | Pode deletar? | Anonimizar? | Obrigatório manter? | Observação |
|------|----------------|-------------|----------------------|------------|
| **users** | Sim (exclusão de conta) | Email/name podem ser anonimizados no registro | Não | User deletado → ver “Exclusão de conta” abaixo |
| **accounts** | Em cascata com user | — | Não | Cascade delete ou anonimizar user_id se ledger mantido |
| **transactions** | Soft delete (padrão) | — | Histórico preservado com deleted_at | Hard delete apenas se política permitir; ledger mantém integridade com reversões |
| **ledger_entries** | **Não** (append-only) | user_id/account_id podem ser anonimizados se exigido por política | **Sim** (auditoria) | Nunca DELETE físico; soma por conta = saldo |
| **categories** | Em cascata com user | — | Não | |
| **goals, envelopes** | Em cascata com user | — | Não | |
| **notifications** | Sim (ex.: ao marcar lida ou por idade) | — | Não | Pode definir TTL (ex.: 1 ano) |
| **insight_cache** | Sim | — | Não | Derivado; pode ser recalculado |
| **insight_feedback** | Sim (ex.: com user) | — | Não | |
| **user_insight_preferences** | Com user | — | Não | |
| **user_sessions** | Sim (logout, revogação) | — | Não | Refresh token hash; revogar em exclusão |
| **automation_rules** | Com user | — | Não | |
| **logs aplicação** | Rotação por idade | — | Não | Ex.: 30–90 dias; sem valores financeiros |
| **Sentry** | — | Não enviar valores financeiros nem PII | — | Breadcrumbs genéricos |

---

## Exclusão de conta (LGPD / GDPR)

- **Fluxo:** POST /api/privacy/delete-account (ou equivalente) após confirmação (senha ou 2FA).
- **Ações:**
  1. Revogar todas as sessões (invalidar refresh tokens).
  2. Deletar ou anonimizar: users, accounts, transactions (ou anonimizar user_id), categories, goals, envelopes, notifications, insight_cache, insight_feedback, user_insight_preferences, automation_rules.
  3. **Ledger:** manter ledger_entries para auditoria; se política exigir “esquecimento”, anonimizar user_id e account_id (ex.: substituir por UUID fixo “deleted_user”) em vez de DELETE.
  4. Não deletar fisicamente ledger_entries para preservar soma por conta = saldo (consistência contábil).

---

## Logs e terceiros

- **Logs:** retenção 30–90 dias (configurável); sem email, nome, saldo ou amount em texto.
- **Sentry:** sem valores financeiros; sem PII em mensagens de erro.
- **Backup:** criptografar; período de retenção conforme política (ex.: 30 dias).

---

## Referências

- FINANCIAL-RULES.md (ledger append-only, invariantes).
- DATA-CLASSIFICATION.md (classificação de campos).
- Endpoints de privacidade: GET /api/privacy/export, POST /api/privacy/delete-account (implementados na Trilha 2.3).
