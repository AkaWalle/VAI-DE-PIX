# Classificação de Dados — Vai de Pix

Documento da Trilha 2 (LGPD e Compliance) do Roadmap Técnico.
Objetivo: classificar cada campo para definir tratamento, minimização e retenção.

## Tabela de classificação

| Dado / Campo | Tipo | Sensível? | Observação |
|--------------|------|-----------|------------|
| **users** | | | |
| email | Pessoal (identificador) | Sim | Login; não expor em logs |
| name | Pessoal | Sim | Nome do titular |
| hashed_password | Credencial | Sim | Nunca em log; apenas hash |
| is_active | Operacional | Não | |
| insights_last_notified_at | Operacional | Não | Metadado de notificação |
| **accounts** | | | |
| name | Pessoal/operacional | Sim | Nome da conta |
| type | Operacional | Não | checking, savings, etc. |
| balance | Financeiro | Sim | Valor monetário |
| **transactions** | | | |
| date, amount, type | Financeiro | Sim | Movimentação |
| description | Comportamento | Sim | Pode revelar hábitos |
| category_id | Comportamento | Sim | Padrão de gastos |
| **categories** | | | |
| name, type, color, icon | Comportamento | Sim | Classificação de gastos |
| **goals** | | | |
| name, target_amount, current_amount | Financeiro/comportamento | Sim | Metas e valores |
| **envelopes** | | | |
| name, balance, target_amount | Financeiro | Sim | Caixinhas |
| **ledger_entries** | | | |
| amount, entry_type | Financeiro | Sim | Histórico contábil; append-only |
| **notifications** | | | |
| title, body | Derivado/comportamento | Sim | Conteúdo pode ser sensível |
| **insight_cache** | | | |
| data (JSON) | Derivado | Sim | Agregações de transações/metas |
| **sessions / refresh_token_hash** | | | |
| refresh_token_hash | Credencial | Sim | Nunca o token em claro |

## Resumo por tipo

- **Pessoal:** email, name — identificar titular; tratamento LGPD Art. 5.
- **Financeiro:** balance, amount, target_amount — valores monetários; não enviar para Sentry em corpo de erro.
- **Comportamento:** description, category, goals — padrões de consumo; sensíveis para perfilamento.
- **Derivado:** insights, notificações — gerados a partir de dados sensíveis; tratar como sensíveis.
- **Credencial:** hashed_password, refresh_token_hash — nunca em log; apenas hash.
- **Operacional:** is_active, type, IDs internos — menos sensíveis; não expor em log público.

## Uso

- Logs: não incluir valores financeiros nem email/name em texto de log; usar IDs ou mascaramento.
- Sentry: não enviar payloads com balance, amount, description; usar breadcrumbs sem dados sensíveis.
- Backup: criptografar backups que contenham tabelas com dados sensíveis.
- Exportação (LGPD): incluir apenas dados do titular; ver DATA-RETENTION.md e endpoint de exportação.
