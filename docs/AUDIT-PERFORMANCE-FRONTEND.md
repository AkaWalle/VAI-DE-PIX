# Auditoria de performance — Frontend React

**Data:** 2025-03-07  
**Escopo:** Componentes que manipulam grandes volumes de dados (transações, relatórios, gráficos, categorias, contas, envelopes, automações, dashboard).  
**Regra:** Apenas análise e sugestões; nenhuma alteração de lógica.

---

## PASSO 1 — Componentes críticos identificados

| Componente | Arquivo | Dados principais |
|------------|---------|-------------------|
| **Transactions** | `src/pages/Transactions.tsx` | Lista de transações, filtros (busca, tipo, data), export CSV, seleção em lote |
| **Dashboard** | `src/pages/dashboard.tsx` | Saldo, receitas/despesas do mês, cashflow, gastos por categoria (gráficos), metas, insights |
| **Reports** | `src/pages/Reports.tsx` | Totais, cashflow, despesas por categoria, gráficos (Bar, Pie), export relatório |
| **Trends** | `src/pages/Trends.tsx` | Cashflow 3/6/12 meses, tendências receita/despesa/saldo, tendências por categoria, previsões |
| **Envelopes** | `src/pages/Envelopes.tsx` | Lista de envelopes, totais (reduce), transferência entre caixinhas |
| **Goals** | `src/pages/Goals.tsx` | Lista de metas, delete |
| **SharedExpenses** | `src/pages/SharedExpenses.tsx` | Lista de despesas compartilhadas, participantes expansíveis |
| **Automations** | `src/pages/Automations.tsx` | Lista de regras, formulário grande (muitos campos condicionais por tipo) |
| **Settings** | `src/pages/Settings.tsx` | Contas (map), categorias (map), perfil |
| **SharedExpenseForm** | `src/components/forms/SharedExpenseForm.tsx` | Categorias filtradas (expense), participantes |
| **BankImportDialog** | `src/components/forms/BankImportDialog.tsx` | Parse CSV, preview transações (map/filter), categorias |
| **TransactionForm** | `src/components/forms/TransactionForm.tsx` | Categorias (filter + map), accounts (map) — dentro de modal |

**Store global:** `src/stores/financial-store.ts` (Zustand + persist). Contém: transactions, accounts, categories, goals, envelopes, sharedExpenses, etc., e funções computadas (getTotalBalance, getIncomeThisMonth, getExpensesThisMonth, getCashflow).

---

## PASSO 2 — Re-renders desnecessários

### 2.1 Funções criadas dentro do render (sem useCallback)

| Arquivo | Função / uso | Impacto |
|---------|----------------|----------|
| **Transactions.tsx** | `getCategoryName`, `getAccountName` — chamadas a cada linha da tabela; recriadas a cada render | **Médio**: N referências novas por render; podem quebrar memoização de filhos se existir. |
| **Transactions.tsx** | `getAvailableMonths`, `getAvailableYears` — recriadas a cada render; usadas no Select (opções) | **Baixo**: Arrays recalculados a cada render. |
| **Transactions.tsx** | `clearFilters`, `handleSelectTransaction`, `handleSelectAll`, `handleExport`, `handleClearAllTransactions`, etc. | **Baixo a médio**: Handlers passados a Checkbox/Button; sem useCallback qualquer estado do pai re-renderiza e novas funções são criadas. |
| **Goals.tsx** | `getStatusConfig`, `getPeriodLabel` — usadas no map de metas | **Baixo**: Funções puras; impacto maior se filho for memoizado. |
| **SharedExpenses.tsx** | `getStatusConfig`, `toggleParticipants` | **Baixo**: Idem. |
| **Envelopes.tsx** | `handleTransfer`, `handleDeleteEnvelope` | **Baixo**: Passados a botões. |
| **Reports.tsx** | `handleExportReport` | **Baixo**. |

**Sugestão:** Onde handlers são passados a componentes que possam ser memoizados (ex.: linhas da tabela, cards de meta/envelope), considerar `useCallback` com dependências estáveis. Para `getCategoryName`/`getAccountName`, considerar mapa em `useMemo` (id → name) para evitar N `find` por render.

### 2.2 Objetos criados dentro do render

- Nenhum objeto de opções/contexto pesado identificado que seja recriado a cada render e passado como prop a filhos memoizados.
- Objetos inline em props (ex.: `className={...}`) são comuns; impacto geralmente baixo.

### 2.3 Filtros executados em cada render

| Arquivo | Cálculo | Situação |
|---------|---------|----------|
| **Transactions.tsx** | `filteredTransactions = transactions.filter(...)` | **Alto**: Filtro complexo (busca + tipo + data) em toda lista a cada render; sem `useMemo`. |
| **Reports.tsx** | `totalIncome`, `totalExpenses`, `categoryExpenses` (filter + map + reduce + sort) | **Médio**: Vários pipelines em cima de `transactions`/`categories` a cada render; sem `useMemo`. |
| **Trends.tsx** | `last6MonthsData`, `last12MonthsData`, `last3MonthsData` = `getCashflow(6/12/3)`; depois `incomeTrend`, `expenseTrend`, `balanceTrend` = `calculateTrend(...)` | **Médio**: getCashflow e calculateTrend executados a cada render; tendências não memoizadas. |
| **Envelopes.tsx** | `totalBalance`, `totalTarget` = `envelopes.reduce(...)` | **Baixo**: Dois reduces por render; lista de envelopes costuma ser pequena. |
| **SharedExpenseForm.tsx** | `expenseCategories = categories.filter(c => c.type === "expense")` | **Baixo**: Lista pequena; pode ser memoizada por consistência. |

### 2.4 Maps pesados em cada render

| Arquivo | Uso | Observação |
|---------|-----|------------|
| **Transactions.tsx** | `filteredTransactions.map(transaction => <TableRow ...>)` | Lista pode ser grande; cada linha chama `getCategoryName` e `getAccountName` (O(n) find cada). Sem virtualização. |
| **Reports.tsx** | `transactions.map` no export; gráficos com dados derivados | Export só ao clicar; gráficos recebem dados já computados. |
| **Dashboard.tsx** | categoryData e goalProgress já em `useMemo` | OK. |
| **Trends.tsx** | categoryTrends e predictions em `useMemo` | OK. |

**Sugestão:** Em **Transactions**, memoizar `filteredTransactions` com `useMemo`; opcionalmente criar um mapa categoria/conta → nome com `useMemo` e usar na tabela para evitar N finds por linha.

---

## PASSO 3 — useEffect

### 3.1 useEffect rodando em excesso

| Arquivo | Efeito | Dependências | Observação |
|---------|--------|--------------|------------|
| **dashboard.tsx** | `updateDateRangeToCurrentMonth()` | `[]` | OK — só na montagem. |
| **dashboard.tsx** | `fetchInsights()` | `[]` | OK — com flag `cancelled` para evitar setState após unmount. |
| **Automations.tsx** | Carregar regras da API | `[]` ou estável | Carregamento inicial; verificar se não há deps que disparem re-fetch em loop. |
| **SharedExpenseForm.tsx** | Sincronizar expense/participants com estado | `[expense]` | Dependência correta; cuidado para não atualizar estado em excesso. |

Nenhum efeito claramente “em loop” foi identificado.

### 3.2 Efeitos que fazem cálculos grandes

- Cálculos pesados estão sobretudo no **render** (filter/reduce/map), não dentro de useEffect.
- BankImportDialog: parse de CSV ocorre em handler de arquivo (onChange), não em efeito — adequado.

### 3.3 Efeitos que atualizam estado várias vezes

- Não identificado padrão de múltiplos setState sequenciais em um mesmo efeito que cause re-renders em cascata.

---

## PASSO 4 — Listas grandes

### 4.1 Keys estáveis

- **Transactions:** `key={transaction.id}` — OK.
- **Goals, Envelopes, SharedExpenses, Automations:** uso de `id` ou índice estável — OK.
- **BankImportDialog (preview):** `key={index}` em lista de preview — aceitável para lista somente leitura; se a lista for reordenada, preferir id estável.

### 4.2 Listas muito grandes

| Lista | Onde | Risco |
|-------|------|--------|
| **transactions** | Transactions.tsx (tabela), Reports, Trends, Dashboard | Se > centenas de itens, tabela sem virtualização pode travar scroll e layout. |
| **categories / accounts** | Vários formulários e Selects | Listas tipicamente pequenas; risco baixo. |

**Sugestão:** Para a tabela de transações, se houver relato de lentidão com muitas linhas, considerar virtualização (ex.: react-window ou tanstack-virtual) apenas na UI, mantendo a mesma fonte de dados e lógica.

### 4.3 Renderização completa a cada atualização

- Toda vez que o estado do componente ou do store (transactions, filtros) muda, a tabela em **Transactions** re-renderiza todas as linhas.
- Sem `React.memo` nas linhas e sem virtualização, listas grandes re-renderizam tudo.

**Sugestão:** Memoizar `filteredTransactions`; opcionalmente extrair linha da tabela para componente com `React.memo` e passar apenas props estáveis (id, descrição, valor, etc.) + mapa de nomes (categoria/conta) memoizado.

---

## PASSO 5 — Cálculos pesados no render

### 5.1 Executados em cada render (candidatos a useMemo)

| Arquivo | Cálculo | Sugestão |
|---------|---------|----------|
| **Transactions.tsx** | `filteredTransactions` (filter em transactions) | `useMemo([transactions, searchTerm, selectedType, dateFilter, specificDate, selectedMonth, selectedYear])`. |
| **Transactions.tsx** | `getAvailableMonths()`, `getAvailableYears()` | `useMemo` dependendo de `transactions` (ex.: `availableMonths`, `availableYears`). |
| **Reports.tsx** | `totalIncome`, `totalExpenses`, `netBalance`, `categoryExpenses` | Um único `useMemo` que retorne `{ totalIncome, totalExpenses, netBalance, categoryExpenses }` com deps `[transactions, categories]`. |
| **Trends.tsx** | `last6MonthsData`, `last12MonthsData`, `last3MonthsData` (getCashflow) | Memoizar com `useMemo` por número de meses; ex.: `cashflow6 = useMemo(() => getCashflow(6), [getCashflow, transactions])` — atenção: getCashflow vem do store (referência estável). |
| **Trends.tsx** | `incomeTrend`, `expenseTrend`, `balanceTrend` | `useMemo` com dependência do resultado de getCashflow (ex.: `last6MonthsData`). |
| **Envelopes.tsx** | `totalBalance`, `totalTarget` | `useMemo([envelopes])` — impacto baixo, mas consistente com o padrão. |
| **SharedExpenseForm.tsx** | `expenseCategories` | `useMemo(() => categories.filter(c => c.type === "expense"), [categories])`. |

### 5.2 Store (getCashflow, getTotalBalance, etc.)

- `getCashflow(months)` no store percorre `transactions` e monta um array por mês — é chamado em Dashboard (1x), Reports (1x), Trends (3x: 3, 6, 12 meses).
- Cada chamada no componente é feita no render; em **Trends** são 3 chamadas por render.
- **Sugestão:** Não alterar a lógica do store; nos componentes que chamam getCashflow várias vezes (ex.: Trends), memoizar os resultados com `useMemo` dependendo de `transactions` (e da função do store, se necessário).

---

## PASSO 6 — Contexto / estado global

### 6.1 Zustand (financial-store)

- **Padrão de uso:** Componentes fazem destructuring de várias fatias: `const { transactions, categories, accounts, ... } = useFinancialStore()`.
- **Re-render:** Com Zustand, o componente re-renderiza quando qualquer uma das fatias usadas (transactions, categories, etc.) muda. Não há seletor fino (ex.: por id); quem usa muitas fatias re-renderiza em qualquer atualização dessas fatias.
- **Impacto:** Esperado; evita prop drilling. Se no futuro houver componentes que precisem apenas de um subconjunto pequeno (ex.: só `transactions.length`), considerar seletores (ex.: `useShallowEqualSelector`) para reduzir re-renders.

### 6.2 Persist (localStorage)

- Store com persist: reidratação na inicialização pode causar um re-render após carregar do localStorage; não foi identificado efeito colateral pesado.

---

## PASSO 7 — Mobile / dispositivos fracos

### 7.1 Loops pesados

- Filtros e reduces em listas grandes (transactions) executam no thread principal; em mobile com muitos itens pode causar frame drops.
- **Sugestão:** Memoizar filtros e derivados (useMemo) para não refazer trabalho a cada render; em listas muito grandes, considerar virtualização da tabela.

### 7.2 Cálculos repetidos

- `getCategoryName` / `getAccountName` em Transactions: O(1) por find, mas chamados N vezes (uma por linha) — na prática N finds por render. Um mapa em useMemo reduziria a O(N) total para construção do mapa + O(1) por célula.

### 7.3 Renderizações grandes

- Tabela de transações: muitas linhas = muitos nós DOM; em mobile isso pode pesar.
- **Sugestão:** Virtualização ou paginação apenas na camada de apresentação, sem mudar regra de negócio.

---

## PASSO 8 — Resultado consolidado

### 1. Lista de componentes analisados

- **Transactions** — `src/pages/Transactions.tsx`
- **Dashboard** — `src/pages/dashboard.tsx`
- **Reports** — `src/pages/Reports.tsx`
- **Trends** — `src/pages/Trends.tsx`
- **Envelopes** — `src/pages/Envelopes.tsx`
- **Goals** — `src/pages/Goals.tsx`
- **SharedExpenses** — `src/pages/SharedExpenses.tsx`
- **Automations** — `src/pages/Automations.tsx`
- **Settings** — `src/pages/Settings.tsx`
- **SharedExpenseForm** — `src/components/forms/SharedExpenseForm.tsx`
- **BankImportDialog** — `src/components/forms/BankImportDialog.tsx`
- **TransactionForm** — `src/components/forms/TransactionForm.tsx`
- **Store** — `src/stores/financial-store.ts`

### 2. Problemas encontrados (resumo)

| # | Problema | Onde | Impacto |
|---|----------|------|---------|
| 1 | `filteredTransactions` recalculado a cada render (sem useMemo) | Transactions.tsx | **Alto** |
| 2 | `getCategoryName` / `getAccountName` = N finds por render na tabela | Transactions.tsx | **Médio** |
| 3 | `getAvailableMonths` / `getAvailableYears` recalculados a cada render | Transactions.tsx | **Baixo** |
| 4 | totalIncome, totalExpenses, categoryExpenses recalculados a cada render | Reports.tsx | **Médio** |
| 5 | getCashflow(3/6/12) e tendências (income/expense/balance) a cada render | Trends.tsx | **Médio** |
| 6 | totalBalance, totalTarget (reduce) a cada render | Envelopes.tsx | **Baixo** |
| 7 | expenseCategories (filter) a cada render | SharedExpenseForm.tsx | **Baixo** |
| 8 | Handlers e funções auxiliares recriadas a cada render (sem useCallback/useMemo) | Vários | **Baixo a médio** (depende de memoização de filhos) |
| 9 | Tabela de transações sem virtualização | Transactions.tsx | **Médio** com listas grandes |
| 10 | Store: getCashflow chamado múltiplas vezes por render em Trends | Trends.tsx | **Médio** |

### 3. Nível de impacto

- **Alto:** Filtro pesado em toda a lista de transações a cada render (Transactions).
- **Médio:** Cálculos derivados em Reports/Trends sem useMemo; N lookups (getCategoryName/getAccountName) na tabela; múltiplas chamadas getCashflow em Trends; tabela sem virtualização com muitas linhas.
- **Baixo:** Reduces em listas pequenas (Envelopes); funções/handlers recriados; getAvailableMonths/Years; expenseCategories.

### 4. Sugestões seguras de otimização (sem alterar lógica)

1. **Transactions.tsx**
   - Envolver `filteredTransactions` em `useMemo` com deps: `[transactions, searchTerm, selectedType, dateFilter, specificDate, selectedMonth, selectedYear]`.
   - Criar `categoryNameMap` e `accountNameMap` em `useMemo` (a partir de categories/accounts) e usar na tabela em vez de getCategoryName/getAccountName por id.
   - Opcional: memoizar `getAvailableMonths` e `getAvailableYears` com `useMemo` (ex.: `availableMonths = useMemo(() => ..., [transactions])`).
   - Opcional: extrair linha da tabela para componente com `React.memo` e passar apenas props necessárias + mapas de nome.

2. **Reports.tsx**
   - Calcular `totalIncome`, `totalExpenses`, `netBalance`, `categoryExpenses` em um único `useMemo` com deps `[transactions, categories]`.

3. **Trends.tsx**
   - Memoizar resultados de getCashflow: ex. `cashflow6 = useMemo(() => getCashflow(6), [transactions])` (e idem para 3 e 12, ou um useMemo que retorne os três).
   - Memoizar `incomeTrend`, `expenseTrend`, `balanceTrend` com useMemo dependendo dos dados de cashflow memoizados.

4. **Envelopes.tsx**
   - `totalBalance` e `totalTarget` em `useMemo([envelopes])`.

5. **SharedExpenseForm.tsx**
   - `expenseCategories` em `useMemo(() => categories.filter(...), [categories])`.

6. **Handlers (opcional)**
   - Onde handlers forem passados a filhos que possam ser memoizados (ex.: linhas da tabela, cards), considerar `useCallback` com dependências corretas.

7. **Virtualização (opcional, apenas UI)**
   - Se a lista de transações puder ser muito grande (> ~100–200 itens) e houver queixa de performance, considerar virtualização da tabela (react-window ou similar), mantendo a mesma fonte de dados e lógica.

### 5. Arquivos que poderiam ser melhorados

| Prioridade | Arquivo | Melhorias sugeridas |
|------------|---------|----------------------|
| 1 | `src/pages/Transactions.tsx` | useMemo filteredTransactions; mapas categoria/conta; useMemo availableMonths/Years; opcional: React.memo na linha, virtualização |
| 2 | `src/pages/Reports.tsx` | useMemo para totais e categoryExpenses |
| 3 | `src/pages/Trends.tsx` | useMemo para getCashflow(3/6/12) e para income/expense/balance trend |
| 4 | `src/pages/Envelopes.tsx` | useMemo totalBalance, totalTarget |
| 5 | `src/components/forms/SharedExpenseForm.tsx` | useMemo expenseCategories |
| 6 | Diversos | useCallback em handlers passados a filhos (quando houver memoização de filhos). |

---

## Confirmação

- Nenhuma regra de negócio, API, hook existente, estado global, validação, fluxo de criação de transações ou cálculo financeiro foi alterado.
- Esta auditoria apenas identifica gargalos e sugere otimizações (useMemo, useCallback, mapas de lookup, virtualização de lista) mantendo o comportamento atual do sistema.
