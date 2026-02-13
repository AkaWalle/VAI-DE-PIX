# Arquivo morto (_archive)

Arquivos movidos para cá em **limpeza de documentação** — **não foram apagados**.  
Objetivo: reduzir ruído na raiz e em `docs/`, mantendo só o que importa para o dia a dia.

## Estratégia segura

1. **Primeiro:** mover para `_archive/` (feito).
2. **Rodar o sistema 1–2 dias** — se nada quebrar, pode apagar definitivamente esta pasta (ou manter como histórico).

## O que foi movido

### `_archive/relatorios/` (13 arquivos)

Relatórios intermediários ou de correção; versões finais estão em **`docs/reports/`**.

| Arquivo | Tipo |
|---------|------|
| RELATORIO_ALEMBIC_DOCKER.md | Intermediário (Alembic) |
| RELATORIO_ALEMBIC_UPGRADE.md | Intermediário (Alembic) |
| RELATORIO_CORRECAO_ALEMBIC.md | Correção |
| RELATORIO_CORRECAO_CONCORRENCIA_SALDO.md | Correção |
| RELATORIO_CORRECAO_DOWN_REVISION_IDEM_TRILHA5.md | Correção |
| RELATORIO_CORRECAO_ORM_TAGS.md | Correção |
| RELATORIO_ENCODING_ALEMBIC.md | Intermediário (Alembic) |
| RELATORIO_MERGE_ALEMBIC.md | Intermediário (Alembic) |
| RELATORIO_START_STAGING_LOCAL.md | Start staging (histórico) |
| RELATORIO_VALIDACAO_ETAPAS_1_2.md | Validação parcial |
| RELATORIO_VALIDACAO_FUNCIONAL_POS_CORRECAO_TAGS.md | Validação pós-correção |
| RELATORIO_VALIDACAO_PRE_PRODUCAO.md | Pré-produção (cópia final em docs/reports/) |
| RELATORIO_VALIDACAO_STAGING.md | Staging (cópia final em docs/reports/) |

**Relatórios finais mantidos no projeto:**  
→ `docs/reports/staging-final.md`  
→ `docs/reports/validation-pre-producao.md`

### `_archive/docs-temp/` (4 arquivos)

Documentos temporários ou de teste manual.

| Arquivo | Tipo |
|---------|------|
| CONFIRMACAO-PRE-PUSH.md | Checklist temporário |
| LIMPAR-DOCUMENTACAO.md | Meta (limpeza) |
| TESTE-NOTIFICACOES.md | Teste manual |
| VERIFICACAO-MELHORIAS-PENDENTES.md | Verificação temporária |

---

**Data da limpeza:** 2026-02-05  
**Regra:** Nenhum arquivo com decisões técnicas, contratos, arquitetura ou setup crítico foi removido; apenas relatórios intermediários e docs temporários.
