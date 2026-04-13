# Bug Report — apagar selecionadas falha + saldo inconsistente + 422 saldo insuficiente

- **Data**: 2026-04-10
- **Área**: Transações / Contas (wallet)
- **Severidade**: Alta (impacta operação básica: excluir e lançar despesa)
- **Status**: Aberto (correção futura)

---

## Outro problema (UI) — baixo contraste no tema claro (light theme)

- **Sintoma**: no modo claro, cards/KPIs ficam com **fundo quase idêntico** ao background da página, sem contraste. Visualmente “apagados”/invisíveis.
- **Onde foi visto**: página **Metas Financeiras** — cards **“Total de Metas”** e **“Atingidas”** somem no fundo bege/branco.
- **Impacto**: perda de legibilidade e usabilidade (A11y), especialmente em telas com resumos.

### Hipóteses técnicas (UI)

- Variáveis do tema claro (em `src/index.css`) para `--card`/`--surface`/`--background` estão **muito próximas** (mesmo tom/valor).
- Componentes (cards, modais, dropdowns, painéis) podem estar usando a mesma variável de fundo, sem borda/sombra no light mode.

### Requisitos de correção (futuro)

- **Apenas tema claro** (não alterar dark mode).
- Ajustar CSS Variables para que cards/KPIs tenham:
  - **Fundo** levemente diferente do background (sem hardcode em componentes; via variáveis)
  - **Borda** sutil (via variável) equivalente a `1px solid rgba(0,0,0,0.08)`
  - **Sombra** leve (via variável) equivalente a `0 1px 3px rgba(0,0,0,0.08)`
- Verificar e corrigir **outros componentes** que usem “surface” (modais, dropdowns, painéis laterais) e estejam sem contraste no light mode.

### Critérios de aceite (UI)

1. Em light theme, cards/KPIs ficam claramente distinguíveis do background em:
   - Metas Financeiras
   - Transações (resumos, listas)
   - Modais e dropdowns principais
2. Dark theme permanece **idêntico** ao atual.
3. Alteração feita **somente via CSS variables** do tema claro (sem cores hardcoded em componentes).

---

## Contexto / Relato do usuário

- Ao **selecionar transações** e clicar em **“apagar as selecionadas”**, a ação **não funciona**.
- Só consegue excluir ao usar **“apagar todas”** (ou equivalente).
- Mesmo após exclusões, o **Saldo Total** continua exibindo valor (“fica dinheiro aparecendo em saldo total”).
- Mesmo com **dinheiro cadastrado em contas**, ao criar despesa ocorre erro de **saldo insuficiente**.

---

## Evidências (logs)

### Falha/rollback por concorrência (HTTP 409)

```
2026-04-10 14:32:16.039 [info] [DB-RUNTIME] get_db: connection start
2026-04-10 14:32:16.049 [info] [DB-RUNTIME] get_db: connection success
2026-04-10 14:32:16.184 [warning] Rollback por validação/regra de negócio (status=409): Conta feae56d8-e69c-49af-993e-7d24b880a260 foi alterada por outra transação; refaça a operação.
2026-04-10 14:32:16.185 [info] [DB-RUNTIME] get_db: closing session
```

### Erro ao criar despesa (HTTP 422 — saldo insuficiente)

```
2026-04-10 14:34:05.062 [info] [DB-RUNTIME] get_db: connection start
2026-04-10 14:34:05.066 [info] [DB-RUNTIME] get_db: connection success
2026-04-10 14:34:05.077 [info] create_transaction: payload recebido | user_id=6bc374e0-79ec-43c1-a467-157c42065926 wallet_id=feae56d8-e69c-49af-993e-7d24b880a260 amount=100.0 type=expense
2026-04-10 14:34:05.089 [warning] Rollback por validação/regra de negócio (status=422): Saldo insuficiente para esta despesa.
2026-04-10 14:34:05.089 [info] [DB-RUNTIME] get_db: closing session
```

---

## Sintomas (o que está errado)

1. **UI/Frontend**: “Apagar selecionadas” não remove as transações selecionadas (ou não reflete na UI).
2. **Backend/API**: Operação de delete (provavelmente em lote) pode retornar **409** indicando **conflito/concorrência** no recurso “Conta”.
3. **Cálculo de saldo**: Saldo total exibido não bate com o estado real após exclusões (UI e/ou API).
4. **Criação de despesa**: Backend bloqueia com **422** (saldo insuficiente) mesmo quando há saldo aparente em conta.

---

## Impacto

- Usuário não consegue operar o módulo de transações de forma confiável.
- Percepção de inconsistência (saldo “fantasma”) degrada confiança do sistema financeiro.
- Pode indicar problema de **concorrência**, **cálculo de saldo** e/ou **sincronização de estado**.

---

## Hipóteses técnicas (ordenadas por probabilidade)

### H1) Delete em lote não está usando IDs corretos (frontend → API)

- “Apagar selecionadas” pode estar enviando lista vazia, IDs incorretos, ou payload incompatível.
- A UI pode estar selecionando linhas, mas o handler está lendo outra fonte (state desatualizado).
- Possível diferença entre “apagar todas” (endpoint/fluxo diferente) e “apagar selecionadas”.

**Como validar**
- No frontend, inspecionar o request do botão “apagar selecionadas”:
  - método + URL
  - corpo enviado (IDs)
  - resposta HTTP
- Comparar com “apagar todas” (se existir endpoint/rota diferente).

### H2) Conflito 409 por concorrência/otimista na entidade “Conta”

O log:
> “Conta ... foi alterada por outra transação; refaça a operação.”

Isso sugere:
- lock/controle de concorrência otimista (ex: versão/updated_at) na conta; ou
- saldo/cache de conta recalculado/atualizado durante delete; ou
- operações paralelas (delete em lote chama múltiplas transações/commits) causando corrida.

**Como validar**
- Reproduzir com duas ações simultâneas (ou múltiplos deletes rápidos).
- Verificar se o backend atualiza a conta durante delete/criação de transação.
- Verificar se existe `version_id`/`updated_at` sendo usado como “ETag” interno.

### H3) Saldo exibido na UI está vindo de cache/stale (React Query/Zustand) após delete

Mesmo que o delete ocorra, o saldo pode:
- não invalidar queries; ou
- recalcular com base em uma lista antiga; ou
- usar agregação local (frontend) e não refletir o backend.

**Como validar**
- Após delete, forçar refresh (hard reload) e comparar.
- Verificar invalidação/`queryKey` de:
  - lista de transações
  - resumo/insights/saldos
  - contas (wallet)

### H4) Regras de negócio usam o “saldo derivado do ledger”, e o saldo “cadastrado na conta” não entra no cálculo

O projeto tem invariantes do ledger (append-only) e saldo derivado por somatório.
Se o usuário “cadastra dinheiro na conta” por outro caminho (ex: campo estático),
mas o backend valida despesa com base no **ledger**, o saldo pode ser diferente do esperado.

**Como validar**
- Confirmar qual fonte o backend usa para validar saldo (ledger vs campo em tabela).
- Verificar se “adicionar dinheiro na conta” cria **lançamento** (entrada no ledger) ou só altera metadados.

---

## Riscos de segurança/consistência (importante)

- **Integridade financeira**: saldo inconsistente pode levar a decisões erradas do usuário.
- **Concorrência**: 409 pode ser sintoma de falta de idempotência/atomicidade em operações em lote.
- **Não confiar no frontend**: exclusão e validação de saldo devem ser **sempre** conferidas no backend (já ocorre no 422, mas precisamos alinhar expectativas e estado).

---

## Plano de correção (futuro) — abordagem recomendada

### Parte A — Corrigir “apagar selecionadas”

- Garantir que o frontend envie **lista de IDs** das transações selecionadas.
- No backend, suportar delete em lote de forma **atômica**:
  - Uma transação DB para o lote inteiro
  - Validar ownership (`user_id`) e `wallet_id` para cada ID
  - Retornar resultado determinístico (quantidade apagada, IDs não encontrados)
- Se houver atualizações na conta/ledger como efeito colateral, garantir ordem e consistência (ex: recalcular após batch).

### Parte B — Pós-delete: sincronizar estado e saldo

- Após sucesso:
  - invalidar/refetch de “lista de transações”
  - invalidar/refetch de “resumo/saldo total/contas”
- Evitar cálculo local de saldo se o backend é a fonte de verdade (ou garantir que a UI derive do mesmo dataset).

### Parte C — Ajustar UX para 409 e 422

- **409**: mostrar mensagem “Houve atualização concorrente. Recarregue e tente novamente.” e oferecer botão “Recarregar”.
- **422 saldo insuficiente**:
  - exibir saldo disponível usado na validação (se seguro) para reduzir confusão
  - guiar usuário a lançar “entrada” correta (via transação/ledger) caso hoje ele esteja só “cadastrando saldo”

---

## Critérios de aceite (Definition of Done)

1. **Apagar selecionadas** remove exatamente as transações selecionadas e atualiza a lista sem recarregar a página.
2. Após excluir, **Saldo Total** e **saldos por conta** refletem o backend (sem valores “fantasma”).
3. Ao criar despesa com saldo suficiente, request retorna 2xx e saldo é reduzido corretamente.
4. Em casos de concorrência, **409** é tratado no frontend com UX clara e refetch.
5. Testes:
   - unit/integration no backend para delete em lote + validações
   - teste de UI (ou e2e) cobrindo selecionar → apagar selecionadas → saldo atualizado

---

## Notas / Próximos passos técnicos (para quem for corrigir)

- Mapear endpoints envolvidos:
  - delete selecionadas (batch) vs delete todas
  - endpoint(s) de saldo/resumo
  - endpoint de criação de transação (já loga `create_transaction`)
- Instrumentação recomendada:
  - logar IDs recebidos no batch delete (com cuidado para não vazar dados sensíveis)
  - logar `wallet_id`, `user_id`, quantidade de itens processados, e resultado final

