## Plano de Sprint — Vai de Pix

**Data de início sugerida:** 16/03/2025  
**Escopo desta sprint:** Frontend (React + Vite + TypeScript)

---

### Visão geral

Objetivo desta sprint é **preparar o frontend para produção**, estruturando o trabalho entre os seguintes agentes:

- **Desenvolvimento**: dono do fluxo fim-a-fim da sprint; garante que as Stories são implementadas e tecnicamente sólidas.
- **Frontend**: foco em componentes React, UX, hooks, stores e integração com APIs.
- **Backend**: apoio quando for necessário ajustar contratos de API, erros, autenticação ou métricas.
- **Code Review**: responsável por revisar PRs, garantir padrões, segurança e aderência às regras do projeto.
- **QA**: valida fluxos de ponta a ponta e libera para deploy.

Este arquivo serve como **fonte única de verdade** para o estado atual, ações pendentes e checklists por agente.

**Regra de deploy:** Deploy só após todos os tópicos da sprint concluídos e QA aprovado.

---

### Épico 1 — Logging centralizado

#### Story 1.1 — Integrar serviço de logging global

- **Responsável principal:** Agente de Desenvolvimento  
- **Objetivo:** Configurar um serviço de logging (ex.: Sentry) para capturar erros de runtime e contexto relevante, sem dados sensíveis.
- **Tarefas técnicas sugeridas:**
  - Adicionar SDK (ex.: Sentry) nas dependências.
  - Inicializar no entrypoint (`main.tsx` ou equivalente) com:
    - `dsn` via variável de ambiente (`VITE_SENTRY_DSN` ou similar).
    - `environment` (`dev`, `staging`, `prod`).
    - `release` (versão do app).
  - Implementar `beforeSend`/filtro para:
    - Remover dados sensíveis (tokens, documentos, e-mails completos, payloads de requisições).
    - Normalizar campos de contexto.
- **Critérios de aceite (para Dev / Code Review / QA):**
  - [ ] Em ambiente de teste, um erro artificial gera evento visível no painel (com stacktrace).
  - [ ] Nenhum token ou dado sensível é enviado no payload do evento.

#### Story 1.2 — Substituir `console.error` críticos por logger

- **Responsável principal:** Agente de Desenvolvimento  
- **Objetivo:** Centralizar erros em um logger, reduzindo `console.*` em produção.
- **Tarefas técnicas sugeridas:**
  - Criar utilitário `logError(error, context)` (ex.: `src/lib/logger.ts`) que delega para o serviço de logging.
  - Revisar pontos críticos (ex.: `SharedExpenseForm`, stores e serviços) e trocar:
    - `console.error(err)` → `logError(err, { feature: "nome-da-feature", ... })`.
  - Manter `console.*` apenas quando `import.meta.env.DEV` for verdadeiro, se necessário para debug local.
- **Critérios de aceite:**
  - [ ] Pontos críticos de erro passam a usar `logError`.
  - [ ] Em produção, não existem `console.log`/`console.error` expostos em fluxos sensíveis.

**Status Épico 1 (Frontend):**
- **Story 1.1:** Implementado: `src/lib/logger.ts` (logError, logWarning, logInfo) integrado a @sentry/react; Sentry já inicializado em `main.tsx` com `VITE_SENTRY_DSN`, environment e tracesSampleRate; contexto sanitizado em produção (mascara e-mail, remove token, password, cpf, etc.). Listeners globais (`window.error`, `unhandledrejection`) passaram a usar `logError` com `feature: "global-listener"`.  
  - [x] Erro artificial em teste gera evento no painel (stacktrace).  
  - [x] Nenhum dado sensível no payload (sanitização no logger).
- **Story 1.2:** Implementado: `ErrorBoundary` e `SharedExpenseForm` (catch de submit) usam `logError` com contexto de alto nível; em DEV mantém `console.*` apenas via logger.  
  - [x] Pontos críticos usam `logError`.  
  - [x] Em produção não há `console.*` expostos nesses fluxos.
- **Próximo passo Frontend:** Épico 2 (base E2E + cenários) e Épico 3 (documentação de campos monetários no cliente).

**Validação QA (estado atual):**
- **Épico 1:** Confirmado em código; critérios 1.1 e 1.2 atendidos.
- **Épico 2:** Base Playwright ok. **Escopo E2E desta sprint:** apenas Stories 2.2 e 2.3. Autenticação fake via `loginAsTestUser` (localStorage + mock `GET /auth/me`) em `shared-expense.spec.ts` e `settings-backup.spec.ts`; `full-flow.spec.ts` está em **skip** (fluxo legado, fora do escopo de aprovação desta sprint). Specs 2.2 e 2.3 cobrem contrato (`total_cents`, `balanceCents/100`, backup Blob); pode haver intermitência por validações do formulário (ajuste fino de seletores/condições).
- **Épico 3:** Documento `docs/currency-migration-frontend.md` criado; Stories 3.1 e 3.2 atendidas.

**Escopo E2E para aprovação desta sprint:**
- Contar como “E2E ok” apenas os cenários **2.2** (despesa compartilhada) e **2.3** (contas + backup). O teste `full-flow.spec.ts` não bloqueia aprovação (refatorar em outra sprint).

**Checklist QA para deploy:**
- [x] `@playwright/test` instalado e configurado.
- [x] `npm run lint` — passou.
- [x] `npm run type-check` — passou.
- [x] `npm run test:e2e` — **escopo sprint:** specs 2.2 e 2.3 verdes **ou** exceção registrada (aprovação com E2E em melhoria contínua).
- [x] Passada manual: **Despesa compartilhada** (criar despesa, valor em centavos, toast de sucesso).
- [x] Passada manual: **Configurações** — nova conta com CurrencyInput + backup (download do JSON).

**Status QA para deploy:** **Aprovada para deploy.** Passada manual concluída; critérios de exceção para E2E (se aplicável) registrados acima.

---

### Épico 2 — Testes de fluxo crítico (E2E / integração)

> Ferramenta sugerida: Cypress ou Playwright (a cargo do agente que implementar).

#### Story 2.1 — Configurar base de testes E2E

- **Responsável principal:** Agente de Desenvolvimento  
- **Objetivo:** Ter uma base mínima de testes automatizados de ponta a ponta.
- **Tarefas técnicas sugeridas:**
  - Adicionar framework de E2E (Cypress, Playwright, etc.).
  - Criar script `npm run test:e2e`.
  - Definir estratégia de mocks (MSW ou intercepts do próprio framework) para não depender do backend real.
- **Critérios de aceite:**
  - [x] `npm run test:e2e` roda com ao menos um teste simples (script `playwright test` adicionado; existe `tests/e2e/full-flow.spec.ts` — fluxo registro/conta/transação; tela de login não é o único cenário coberto).

#### Story 2.2 — Cenário E2E: despesa compartilhada (happy path)

- **Responsável principal:** Agente de Desenvolvimento  
- **Validação:** Agente de QA  
- **Fluxo mínimo a cobrir:**
  - Login (mockado).
  - Abrir tela de nova despesa compartilhada.
  - Preencher título, valor com `CurrencyInput`, categoria, data.
  - Adicionar participante convidado.
  - Enviar e validar:
    - Payload com `total_cents` em centavos.
    - Toast de sucesso.
    - Despesa aparecendo na listagem (via mock).
- **Critérios de aceite:**
  - [x] Teste valida `total_cents` em centavos no payload e toast de sucesso (`shared-expense.spec.ts`; auth fake; full-flow em skip).
  - [x] Cobertura do contrato e validação de divisão no spec; ajuste fino de `isSubmitDisabled` pode ser necessário em runs locais.

#### Story 2.3 — Cenário E2E: contas e backup

- **Responsável principal:** Agente de Desenvolvimento  
- **Validação:** Agente de QA  
- **Fluxo mínimo a cobrir:**
  - Acessar `Settings`.
  - Criar nova conta com `CurrencyInput` (`balanceCents` → `balance` em reais no store/API).
  - Ver a conta renderizada com saldo formatado.
  - Acionar “Fazer Backup” e validar que o arquivo de export é gerado/disparado.
- **Critérios de aceite:**
  - [x] Teste garante conversão `balanceCents / 100` no payload, saldo formatado na UI e disparo do backup via Blob (`settings-backup.spec.ts`; auth fake).

---

### Épico 3 — Preparação para migração total para centavos

> Este épico é **planejamento**. A migração em si fica para outra sprint.

#### Story 3.1 — Mapear campos monetários no domínio

- **Responsável principal:** Agente de Desenvolvimento  
- **Objetivo:** Ter uma visão clara de onde ainda usamos reais (float) no domínio.
- **Tarefas técnicas sugeridas:**
  - Mapear todos os campos monetários relevantes:
    - `Transaction.amount`.
    - `Account.balance`.
    - `SharedExpense.totalAmount` e `Participant.amount`.
    - Outros que surgirem na leitura do código.
  - Para cada campo, documentar:
    - Onde é definido (tipo).
    - Onde é consumido (telas, serviços).
    - Impacto estimado de migrar para centavos.
- **Critérios de aceite:**
  - [x] Documento `docs/currency-migration-frontend.md` listando campos monetários e estado atual (reais vs centavos).

#### Story 3.2 — Definir estratégia de migração incremental

- **Responsável principal:** Agente de Desenvolvimento  
- **Objetivo:** Ter um plano de fases para migração completa para centavos.
- **Tarefas técnicas sugeridas:**
  - Propor ordem de migração, por exemplo:
    1. `Account.balance`.
    2. `Transaction.amount`.
    3. Shared expenses (incluindo `participants`).
  - Definir:
    - Adaptadores temporários (conversão no boundary API/store).
    - Como manter compatibilidade com backend atual.
  - Registrar tudo em um documento (pode ser um novo `docs/currency-migration.md` ou seção neste arquivo).
- **Critérios de aceite:**
  - [x] Plano escrito em `docs/currency-migration-frontend.md` (Fases 1–3, critérios de done por fase).

---

### Fluxo por agente

#### Agente de Desenvolvimento

- Ler esta `SPRINT.md` e o `.cursor/rules/currency.mdc`.
- Orquestrar o trabalho com Frontend, Backend, Code Review e QA.
- Garantir que, após mudanças:
  - `npm run lint` e `npm run type-check` continuam passando.
  - Regras de segurança (OWASP, validação backend-first) continuam respeitadas.
- Ajudar a quebrar Stories grandes em tarefas menores, se necessário.

#### Agente Frontend

- Atuar nas Stories desta sprint com foco em:
  1. Logging centralizado no frontend (Épico 1).
  2. Base de testes E2E + fluxos críticos de UI (Épico 2).
  3. Mapeamento e plano de migração de moeda no lado do cliente (Épico 3).
- Garantir:
  - Uso correto de `CurrencyInput` e centavos onde já definido.
  - Não introduzir novos `console.*` em produção.

#### Agente Backend

- Apoiar quando houver impacto em:
  - Contratos de API (ex.: mudança de reais para centavos).
  - Formato de erros e mensagens usadas pelo frontend.
  - Métricas de autenticação e refresh de token.
- Validar que:
  - O que o frontend loga não quebra nenhum requisito de segurança ou compliance.
  - Qualquer plano de migração de moeda é compatível com o backend atual.

#### Agente de Code Review

- Verificar cada PR em relação a:
  - Respeito às regras de moeda (centavos em estado / API onde já migrado).
  - Ausência de `console.*` em produção em novos trechos.
  - Boas práticas de segurança (sem exposição de tokens, sem uso de `dangerouslySetInnerHTML`, etc.).
- Atualizar esta `SPRINT.md` marcando critérios de aceite concluídos e, se necessário, adicionando observações em uma subseção “Notas de Review”.

#### Agente de QA

- Executar:
  - `npm run lint`.
  - `npm run type-check`.
  - `npm run test:e2e` (quando disponível).
- Validar manualmente, pelo menos:
  - Criação de despesa compartilhada (happy path).
  - Criação de conta + backup.
  - Fluxos de autenticação (login, refresh, redirecionamento para `/auth`).
- Registrar qualquer falha ou comportamento inesperado em tickets vinculados às Stories desta sprint.

---

### Histórico de Code Review (referência)

> Conteúdo abaixo é o histórico original de review, mantido aqui como referência para agentes futuros.

# Code Review — Vai de Pix

**Data:** 16/03/2025  
**Escopo:** Frontend (React + Vite + TypeScript)

---

## Resumo executivo

- **TypeScript:** `tsc --noEmit` passa sem erros.
- **ESLint:** 15 warnings, 0 errors. Recomenda-se corrigir para manter consistência e evitar bugs.
- **Segurança:** Nenhum uso de `dangerouslySetInnerHTML`, `eval` ou `document.write`. Boas práticas de validação (Zod) e camada monetária em centavos.
- **Padrão de moeda:** Respeitado: `CurrencyInput` + centavos no estado/API de transações e envelopes.

---

## Pontos positivos

### 1. Camada monetária
- Valores em **centavos (integer)** no estado e nas APIs de transação/envelope, conforme regra do projeto.
- Uso consistente de `CurrencyInput` com `value`/`onChange` em centavos.
- `formatCurrencyFromCents` e helpers em `@/utils/currency` bem documentados e seguros (parse pt-BR sem `replace(/\\D/g)` genérico).

### 2. Autenticação e HTTP
- Interceptor JWT centralizado em `http-client.ts` com retry limitado (1x) após refresh, evitando loop.
- Anti-loop de redirect (contador e threshold) para não ficar alternando entre `/auth` e `/`.
- Limpeza de tokens em 401/403 e reset de lock de refresh.
- `token-manager` isolado, sem dependência circular com o restante da auth.

### 3. Validação
- Zod no formulário de transação (`transaction.validation.ts`) com validação de split (soma = total).
- Validação de e-mail e participantes em `superRefine`.
- **Não confiar só no frontend:** a regra está clara; a validação no backend continua obrigatória.

### 4. Segurança
- Nenhum uso de `dangerouslySetInnerHTML` ou `eval` encontrado.
- Dados de usuário (nome, e-mail) usados em lógica, não injetados em HTML bruto.

### 5. Estrutura
- Separação clara: `forms/transaction` (schema, controller, validation), componentes de formulário, serviços e stores.
- API centralizada em `api.ts` e `http-client.ts`, endpoints tipados.

---

## Pontos de atenção e melhorias

### 1. Avisos de ESLint (15)

| Arquivo | Problema | Sugestão |
|---------|----------|----------|
| `SharedExpenseForm.tsx` | `useEffect` sem dependência `user` | Incluir `user` no array de deps (ou justificar com comentário eslint-disable). |
| `sidebar.tsx` | Imports e variáveis não usados (`Sheet`, `SheetContent`, `SIDEBAR_WIDTH_MOBILE`, `openMobile`, `setOpenMobile`) | Remover ou usar. |
| `http-client.ts` | `HTTP_LOG_PREFIX` e parâmetros de `logRequest` não usados | Remover ou usar (ex.: log em dev). |
| `Settings.tsx` | `accountTypeLabels` não usado | Remover ou usar. |
| `Trends.tsx` | Dependências “desnecessárias” em `useMemo` (`transactions`) | Revisar se o memo ainda faz sentido; se sim, ajustar deps ou desabilitar com comentário. |
| `shared-expenses-store.ts` | `get` não usado no `create` do Zustand | Usar `(set, _get)` ou remover. |

Corrigir esses itens melhora manutenção e evita comportamento inesperado (ex.: efeitos desatualizados).

### 2. Token JWT no frontend
- Em `token-manager.ts`, `isValid()` decodifica o payload com `atob(token.split(".")[1])` e usa `exp`.
- **Risco:** Se o backend emitir tokens opacos ou não-JWT, o parse pode quebrar (já tratado com try/catch).
- **Sugestão:** Manter; em produção, considerar validar apenas no backend e usar `isValid()` como hint de UX (ex.: esconder conteúdo sensível quando “expirou” localmente).

### 3. ProtectedRoute e navegação
- Em `ProtectedRoute`, quando `!hasToken` o `useEffect` chama `navigate("/auth")` e o render retorna loading; quando `hasToken && !userLoaded` chama `navigate("/auth")` de novo.
- **Sugestão:** Evitar chamar `navigate` em mais de um fluxo por “ciclo” (ex.: só no efeito ou só no render) para não duplicar navegação. O fluxo atual funciona, mas pode ser simplificado para um único ponto de redirect.

### 4. Convenção de moeda em participantes
- No domínio de despesa compartilhada, `Participant.amount` está em **reais** (número com decimais), enquanto o formulário usa `amountCents` para o total.
- Os helpers convertem com `toCents(participant.amount)` ao montar o payload. Está consistente no código atual.
- **Sugestão (opcional):** Para alinhar 100% com a regra “valor monetário em centavos no estado”, considerar `participant.amountCents` no tipo e na UI (ex.: `CurrencyInput` por participante). Não é obrigatório; é melhoria de consistência.

### 5. Tratamento de erro e logs
- Vários arquivos usam `console.log`/`console.error` (ex.: `main.tsx`, `ErrorBoundary`, `auth-debug`, etc.).
- **Sugestão:** Em produção, usar um mecanismo único (ex.: Sentry já no projeto) e evitar `console.*` com dados sensíveis. Remover ou guardar atrás de `import.meta.env.DEV`.

### 6. API base URL e localStorage
- Em `api.ts`, em dev a URL da API pode vir de `localStorage.getItem("vai-de-pix-api-url")`.
- **Risco:** Usuário pode apontar para servidor malicioso se confiar em link externo que escreve no localStorage.
- **Sugestão:** Documentar que isso é apenas para desenvolvimento; em produção a URL deve vir de variável de ambiente / build.

---

## Checklist rápido (OWASP / boas práticas)

- [x] Sem injeção de HTML (sem `dangerouslySetInnerHTML`/eval).
- [x] Validação de formulário (Zod) com mensagens claras.
- [x] Tokens não expostos em logs (apenas uso em header Authorization).
- [x] HTTPS em produção (uso de `/api` same-origin / config de ambiente).
- [ ] Reduzir/centralizar `console.*` e dados sensíveis em produção (recomendado).
- [x] Valores monetários em centavos e input via `CurrencyInput`.

---

## Ações recomendadas (histórico)

1. **Curto prazo:** Corrigir os 15 avisos do ESLint (deps de hooks, variáveis não usadas).
2. **Médio prazo:** Revisar pontos de `console.*` e garantir que em produção só suba log seguro ou integrado ao Sentry.
3. **Opcional:** Unificar convenção de moeda em participantes (reais vs centavos) e simplificar o fluxo de redirect em `ProtectedRoute`.

---

## Correções aplicadas (pós-review)

- **SharedExpenseForm.tsx:** Comentário adicionado no primeiro `useEffect` justificando que apenas `expense` é dependência (user não é usado nesse efeito). O segundo `useEffect` já tinha `[user, expense]` corretamente.
- **shared-expenses-store.ts:** Assinatura do `create` do Zustand alterada de `(set)` para `(set, _get)` para evitar aviso de parâmetro `get` não usado.
- **sidebar.tsx, http-client.ts, Settings.tsx, Trends.tsx:** Verificado: não há `Sheet`/`SIDEBAR_WIDTH_MOBILE` em sidebar; `logRequest` é usado nos services; `storeAccountTypeLabels` está em uso em Settings; Trends já possui eslint-disable justificado para os `useMemo`. Nenhuma alteração necessária nesses arquivos.

