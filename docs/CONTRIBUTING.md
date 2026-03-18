> Última atualização: 2025-03-16

# Contribuindo

## Padrão de branches

- **feat/** — Nova funcionalidade (ex.: `feat/envelope-filters`).
- **fix/** — Correção de bug (ex.: `fix/login-redirect`).
- **chore/** — Tarefas de manutenção, dependências, config, docs (ex.: `chore/update-deps`).
- **docs/** — Apenas documentação (ex.: `docs/api-endpoints`).

Criar branch a partir da principal (ex.: `main` ou `develop`); um PR por branch.

## Formato de commits (Conventional Commits)

- **feat:** nova funcionalidade.
- **fix:** correção de bug.
- **chore:** alteração que não impacta código de produção (build, tooling, docs).
- **docs:** só documentação.
- **refactor:** refatoração sem mudança de comportamento observável.
- **test:** adição ou alteração de testes.

Exemplos: `feat(transactions): add monthly summary filter`, `fix(auth): redirect after logout`, `chore(deps): bump axios`.

Mensagem em português ou inglês conforme convenção do time; manter consistência no mesmo PR.

## Checklist antes de abrir PR

- [ ] Código segue os padrões do projeto (lint e type-check passando).
- [ ] Testes unitários/integração relevantes adicionados ou atualizados (quando aplicável).
- [ ] Nenhum dado sensível ou credencial no código ou em commits.
- [ ] Documentação atualizada se a mudança alterar comportamento, API ou setup (ex.: [docs/](./README.md)).
- [ ] Build do frontend e backend bem-sucedidos localmente (ex.: `npm run build`, backend rodando com migrations aplicadas).

## Como rodar os testes

### Frontend

- **Unitários (Vitest):** `npm run test` ou `npm run test:unit` — roda testes em `tests/unit/`.
- **Todos os testes Vitest:** `npm run test:all`.
- **Teste de API de produção:** `npm run test:prod` (config em `vitest.config.ts`).
- **E2E (Playwright):** `npm run test:e2e` — exige backend e frontend rodando (ou URL configurada). Cenários em `tests/e2e/`.

### Backend

- Na pasta `backend/`, com venv ativo e `DATABASE_URL` configurada (pode ser SQLite em memória em testes):
  - **Todos os testes pytest:** `pytest` ou `pytest -v`.
  - **Com cobertura:** `pytest --cov=. --cov-report=term-missing` (se configurado).
- CI: workflow em `.github/workflows/` (ex.: `backend-postgres-ci.yml`) roda testes do backend; conferir no repositório.

## Quem revisar e critérios de aprovação

- **Revisor:** Definido pelo time ou dono do repositório (ex.: mantenedor ou pessoa indicada no PR). Em projetos solo, o próprio autor pode revisar após checklist; em time, outra pessoa deve aprovar.
- **Critérios de aprovação:**
  - PR aprovado por pelo menos um revisor (quando aplicável).
  - CI verde (lint, type-check, testes automatizados).
  - Sem conflitos com a branch base; mudanças alinhadas ao propósito do PR.
  - Comportamento crítico (auth, dinheiro, dados do usuário) sem regressões; testes cobrindo fluxos alterados quando fizer sentido.

Documentação técnica do projeto está em [README.md](./README.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [API.md](./API.md), [DATABASE.md](./DATABASE.md), [FRONTEND.md](./FRONTEND.md) e [INTEGRATIONS.md](./INTEGRATIONS.md).
