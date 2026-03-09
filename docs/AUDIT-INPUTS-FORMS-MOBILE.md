# Auditoria: Inputs e Formulários — Mobile, Performance e UX

**Data:** 2025-03-07  
**Escopo:** Todos os inputs, selects, textareas, campos monetários e formulários do projeto.  
**Regra:** Apenas análise e sugestões; nenhuma alteração de lógica.

---

## PASSO 1 — Inputs e componentes identificados

### Componentes base (UI)

| Arquivo | Componente | Tipo |
|---------|------------|------|
| `src/components/ui/input.tsx` | `Input` | input nativo (encaminha type, className, ...props) |
| `src/components/ui/textarea.tsx` | `Textarea` | textarea nativo |
| `src/components/ui/CurrencyInput.tsx` | `CurrencyInput` | input type="text" + inputMode="numeric", valor em centavos |
| `src/components/ui/select.tsx` | `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` | Radix Select |
| `src/components/ui/command.tsx` | `Command`, `CommandInput`, `CommandDialog` | cmdk (busca) |
| `src/components/ui/label.tsx` | `Label` | label |

### Formulários e páginas com inputs

| Arquivo | Campos |
|---------|--------|
| **TransactionForm** | Tipo (Select), Valor (CurrencyInput), Descrição (Input), Despesa compartilhada (Switch), E-mail (Input type=email), Categoria (Select), Conta (Select), Data (Input type=date), Tags (Input) |
| **BankImportDialog** | Arquivo (Input type=file), Categoria por linha (Select em tabela) |
| **SharedExpenseForm** | Categoria (Select), Descrição (Textarea), Valor Total (CurrencyInput), Data (Input type=date), Tipo Divisão (Select), Nome participante (Input), Email participante (Input type=email) |
| **GoalForm** | Nome (Input), Valor da Meta (CurrencyInput), Data Objetivo (Input type=date), Categoria (Select), Prioridade (Select), Descrição (Textarea) |
| **EnvelopeForm** | Nome (Input), Saldo Inicial (CurrencyInput), Meta (CurrencyInput), Cor (buttons), Descrição (Textarea) |
| **AddGoalValueForm** | Valor (CurrencyInput), Data (Input type=date), Descrição (Textarea) |
| **EnvelopeValueForm** | Valor (CurrencyInput), Data (Input type=date), Descrição (Textarea) |
| **Auth** | Login: Email (Input type=email), Senha (Input type=password). Register: Nome (Input type=text), Email (Input type=email), Senha (Input type=password) |
| **Settings** | Nome (Input), Email (Input type=email), Tema (Select), Nova Conta: Nome da Conta (Input), Tipo (Select), Saldo Inicial (CurrencyInput) |
| **Automations** | Nome da Regra (Input), Tipo (Select), Descrição (Input), Frequência/Data início/Data fim (Input type=date), Valor (CurrencyInput), Categoria/Conta (Select), E-mail destino (Input type=email), Lembrar após dias (Input type=number), Caixinha/Arredondar (Select), Limite (CurrencyInput), etc. |
| **Transactions** | Busca (Input), Data específica (Input type=date), Mês/Ano (Select) |
| **Reports** | Período (Select) |
| **Envelopes** | Transferência: select nativo "De"/"Para", CurrencyInput valor |
| **IconPicker** | Botões de ícone (sem input de texto) |

### Resumo por tipo

- **Input (texto, email, password, date, number, file):** Auth, TransactionForm, SharedExpenseForm, GoalForm, EnvelopeForm, AddGoalValueForm, EnvelopeValueForm, BankImportDialog, Settings, Automations, Transactions.
- **CurrencyInput:** TransactionForm, SharedExpenseForm, GoalForm, EnvelopeForm, AddGoalValueForm, EnvelopeValueForm, Automations, Settings, Envelopes.
- **Textarea:** TransactionForm (não usado), SharedExpenseForm, GoalForm, EnvelopeForm, AddGoalValueForm, EnvelopeValueForm, Automations (Descrição).
- **Select (Radix):** TransactionForm, SharedExpenseForm, GoalForm, EnvelopeForm, BankImportDialog, Settings, Automations, Transactions, Reports.
- **Select nativo:** Envelopes (transferência De/Para).
- **Command/CommandInput:** Definido em `command.tsx`; não encontrado uso em formulários no escopo atual.

---

## PASSO 2 — Verificação de problemas mobile

### 1. Teclado correto para mobile

| Local | Campo | Situação | Observação |
|-------|--------|----------|------------|
| CurrencyInput | Valor | OK | `inputMode="numeric"` (apenas dígitos; formatação interna). |
| Vários | Email | OK | `type="email"` usado onde há campo e-mail. |
| Auth / Settings | Senha | OK | `type="password"`. |
| Vários | Data | OK | `type="date"` (date picker nativo). |
| Automations | Lembrar após (dias) | OK | `type="number"` (teclado numérico). |
| TransactionForm / outros | Descrição, Tags, Nome | Parcial | Sem `inputMode`. Para texto livre, `type="text"` (padrão) é aceitável; `inputMode="text"` opcional. |
| Transactions | Busca | Parcial | Sem `type="search"` nem `inputMode="search"`; poderia melhorar teclado em alguns dispositivos. |

**Sugestão (apenas UI):** Em campos de busca (ex.: Transactions), considerar `type="search"` ou `inputMode="search"` para melhorar teclado em mobile. Opcional.

### 2. Inputs monetários (CurrencyInput)

- **Vírgula/ponto:** O componente não aceita vírgula/ponto na digitação; só dígitos. Formata em pt-BR (R$ 1.234,56). **OK.**
- **Mobile:** `inputMode="numeric"` exibe teclado numérico. **OK.**
- **Caracteres inválidos:** Bloqueados em `onKeyDown`; apenas 0-9. **OK.**
- **Paste:** `onPaste` extrai só dígitos. **OK.**

Nenhuma alteração necessária em lógica; componente já adequado para mobile.

### 3. Foco e teclado (modais)

- Modais já possuem `max-h-[90svh]`, scroll interno e footer fixo (auditoria anterior).
- `pb-20` na área de conteúdo reduz risco de botão “Salvar” ficar atrás do teclado.
- Nenhum problema adicional detectado apenas em “foco do teclado”.

### 4. Selects customizados (Radix)

- **Scroll:** SelectContent usa `max-h-96 overflow-hidden` e Viewport; Radix gerencia scroll interno. **OK.**
- **Fechar:** Comportamento nativo do Radix (clique fora, Escape). **OK.**
- **Dentro de modais:** Select usa Portal; z-50. Em modais com z-50, o dropdown pode ficar atrás em alguns stacks. **Risco baixo;** em uso atual não foi reportado problema. Se surgir, conferir z-index do modal vs. SelectContent.
- **Label/associação:** Em vários formulários o `Label` tem `htmlFor="category"` (ou similar), mas o `SelectTrigger` não recebe `id="category"`. O Radix Select associa label via contexto interno; para acessibilidade explícita, pode-se passar `id` no `SelectTrigger` igual ao `htmlFor` do Label. **Sugestão de melhoria (só UI/a11y).**

### 5. Performance

- Nenhum `onChange` encontrado que faça filtro pesado ou cálculo custoso em tempo real sem debounce.
- Selects com listas grandes (ex.: categorias, contas) são listas pequenas/médias; sem virtualização necessária no escopo atual.
- **Conclusão:** Nenhum problema de performance identificado nos inputs.

### 6. Autocomplete

| Local | Campo | autocomplete atual | Sugestão (seguro) |
|-------|--------|--------------------|-------------------|
| Auth (login) | Email | não definido | `autocomplete="email"` |
| Auth (login) | Senha | não definido | `autocomplete="current-password"` |
| Auth (register) | Nome | não definido | `autocomplete="name"` |
| Auth (register) | Email | não definido | `autocomplete="email"` |
| Auth (register) | Senha | não definido | `autocomplete="new-password"` |
| Settings (perfil) | Nome / Email | não definido | `autocomplete="name"` e `autocomplete="email"` |
| TransactionForm | E-mail divide | não definido | `autocomplete="email"` |
| Demais campos | - | - | Manter ou usar valores semânticos (ex.: `off` onde não fizer sentido). |

**Sugestão:** Adicionar atributos `autocomplete` apenas nos campos acima; não altera lógica, só UX e preenchimento pelo navegador.

### 7. Acessibilidade (label / aria / placeholder)

| Problema | Onde | Sugestão |
|----------|------|----------|
| Label sem `htmlFor` / Input sem `id` | Automations (Nome da Regra, Descrição, Data início/fim, Valor, E-mail destino, Lembrar após dias, etc.) | Associar: `Label htmlFor="id-x"` e `Input id="id-x"`. |
| Label sem `htmlFor` / Input sem `id` | SharedExpenseForm (Nome e Email do participante) | Adicionar `id` e `htmlFor` (ex.: `participant-name`, `participant-email`). |
| Label sem `htmlFor` / Select sem `id` no trigger | Vários (GoalForm, EnvelopeForm, Automations, Settings – Selects) | O Radix já expõe acessibilidade; para vínculo explícito, usar `id` no `SelectTrigger` igual ao `htmlFor` do Label. |
| Transactions (filtros) | Data específica: `<label>` com texto "Data:" e Input sem `id` | Adicionar `id` no Input e `htmlFor` no label. |
| Transactions (busca) | Input de busca sem label visível | Adicionar `aria-label="Buscar transações"` ou label associado (ex. sr-only). |
| Settings (Nova Conta) | Nome da Conta, Tipo, Saldo: Label presente mas Input/Select sem `id` | Adicionar `id` nos controles e `htmlFor` nos Labels. |
| Envelopes (transferência) | `<label>` + `<select>` sem `id`/`htmlFor` | Associar: `label htmlFor="transfer-from"` e `select id="transfer-from"` (e idêntico para "Para"). |

Placeholders estão presentes e claros nos formulários críticos; nenhuma alteração obrigatória.

---

## PASSO 3 — Campos críticos do sistema financeiro

### TransactionForm (Nova Transação)

| Campo | Teclado | Monetário | Select | Observação |
|-------|---------|-----------|--------|------------|
| Tipo | N/A (Select) | - | OK | - |
| Valor | OK (CurrencyInput numeric) | OK | - | - |
| Descrição | OK (text) | - | - | - |
| Despesa compartilhada | Switch | - | - | - |
| E-mail quem divide | OK (type=email) | - | - | Sugestão: autocomplete="email" |
| Categoria | - | - | OK | Label htmlFor="category" existe; SelectTrigger sem id (Radix cuida de a11y). |
| Conta | - | - | OK | Idem. |
| Data | OK (type=date) | - | - | - |
| Tags | OK (text) | - | - | - |

Nenhum problema de “teclado errado”, “campo monetário quebrando” ou “select travando”. Date nativo é adequado no mobile.

### Outros fluxos (importar, despesa compartilhada, metas, caixinhas)

- **BankImportDialog:** Arquivo (type=file) e Select de categoria por linha; comportamento esperado em mobile.
- **SharedExpenseForm:** CurrencyInput, type=date, type=email; Selects e Textarea; mesmo padrão do acima.
- **GoalForm / EnvelopeForm / AddGoalValueForm / EnvelopeValueForm:** CurrencyInput e Input type=date já verificados; Selects e Textareas sem problema de teclado ou monetário.

---

## PASSO 4 — UX mobile

- **Campos próximos:** Formulários usam `space-y-2` / `space-y-4` e `gap-4`; espaçamento adequado.
- **Botões:** Altura mínima em geral ≥ h-9/h-10; SharedExpenseForm já usa `min-h-[44px] touch-manipulation` no botão “Adicionar” participante. **OK.**
- **Inputs cortados:** Não identificado; modais com overflow e scroll interno já tratados.
- **Scroll em modais:** Já corrigido em auditoria anterior (scroll só no conteúdo, footer fixo).
- **Select em telas pequenas:** SelectTrigger com `w-full` onde necessário (ex.: Transactions filtros); BankImportDialog usa `h-8 text-xs` no Select da tabela, ainda utilizável.

Nenhum ajuste obrigatório de layout; sugestões abaixo são opcionais (ex.: garantir `min-h-[44px]` ou `touch-manipulation` em botões críticos em outras telas).

---

## PASSO 5 — Resultado consolidado

### 1. Lista de todos os inputs encontrados (resumida)

- **Input:** TransactionForm (descrição, email, date, tags), Auth (email, password, name), SharedExpenseForm (date, participant name/email), GoalForm (name, targetDate), EnvelopeForm (name), AddGoalValueForm (date), EnvelopeValueForm (date), BankImportDialog (file), Settings (name, email), Automations (name, description, date, email, number), Transactions (search, date).
- **CurrencyInput:** TransactionForm, SharedExpenseForm, GoalForm, EnvelopeForm, AddGoalValueForm, EnvelopeValueForm, Automations, Settings, Envelopes.
- **Textarea:** SharedExpenseForm, GoalForm, EnvelopeForm, AddGoalValueForm, EnvelopeValueForm, Automations.
- **Select (Radix):** TransactionForm, SharedExpenseForm, GoalForm, EnvelopeForm, BankImportDialog, Settings, Automations, Transactions, Reports.
- **Select nativo:** Envelopes (transferência).
- **Command/CommandInput:** Apenas definido; não usado em formulários no escopo auditado.

### 2. Problemas detectados

| Severidade | Problema |
|------------|----------|
| Baixa | Vários Labels sem associação explícita (htmlFor + id) em Automations, SharedExpenseForm, Settings, Transactions, Envelopes. |
| Baixa | Autocomplete ausente em Auth e em campos de e-mail/nome em Settings e TransactionForm. |
| Muito baixa | Campo de busca (Transactions) sem type="search" ou aria-label. |
| Muito baixa | SelectTrigger sem id onde o Label já tem htmlFor (melhoria de a11y). |

Nenhum problema de lógica, validação ou backend.

### 3. Riscos para mobile

- **Baixo:** Preenchimento automático (autocomplete) pior sem os atributos corretos.
- **Baixo:** Leitores de tela e navegação por teclado podem se beneficiar de label + id em todos os controles.
- **Muito baixo:** Em dispositivos específicos, busca sem `type="search"` pode não otimizar o teclado (não quebra uso).
- **Nenhum:** CurrencyInput, type=date, type=email, type=number e Selects estão adequados para mobile.

### 4. Sugestões de melhoria seguras (apenas UI)

1. **Autocomplete (sem mudar lógica):**  
   - Auth: `autocomplete="email"`, `autocomplete="current-password"`, `autocomplete="name"`, `autocomplete="new-password"` nos campos correspondentes.  
   - Settings (perfil): `autocomplete="name"` e `autocomplete="email"`.  
   - TransactionForm (e-mail quem divide): `autocomplete="email"`.

2. **Acessibilidade (label + id):**  
   - Automations: adicionar `id` em cada Input/Select e `htmlFor` no Label correspondente.  
   - SharedExpenseForm: `id` e `htmlFor` nos campos Nome e Email do participante.  
   - Settings (Nova Conta): `id` nos inputs e `htmlFor` nos labels.  
   - Transactions: `id` no Input de data específica e no Input de busca; `htmlFor` no label de data; `aria-label="Buscar transações"` no busca (ou label sr-only).  
   - Envelopes: `id` nos dois selects e `htmlFor` nos labels “De” e “Para”.

3. **Select (Radix) + Label:**  
   Onde já existir `Label htmlFor="xxx"`, passar `id="xxx"` no `SelectTrigger` do mesmo campo (ex.: TransactionForm categoria/conta, GoalForm categoria/prioridade). Opcional; Radix já oferece a11y básica.

4. **Busca (Transactions):**  
   No Input de busca: `type="search"` e/ou `aria-label="Buscar transações"`. Opcional.

Nenhuma dessas sugestões altera regras de negócio, APIs, hooks, validações ou fluxo de criação de transações.

### 5. Arquivos que poderiam ser corrigidos (apenas UI)

| Arquivo | Correções sugeridas |
|---------|---------------------|
| `src/pages/Auth.tsx` | autocomplete em email e password (login e register). |
| `src/pages/Settings.tsx` | autocomplete name/email no perfil; id/htmlFor em Nome da Conta, Tipo, Saldo Inicial (Nova Conta). |
| `src/components/forms/TransactionForm.tsx` | autocomplete="email" no campo e-mail quem divide; opcional: id no SelectTrigger para categoria/conta. |
| `src/components/forms/SharedExpenseForm.tsx` | id + htmlFor nos inputs Nome e Email do participante. |
| `src/pages/Automations.tsx` | id em todos os Input/CurrencyInput/Select e htmlFor nos Labels. |
| `src/pages/Transactions.tsx` | id + htmlFor no filtro “Data específica”; aria-label ou label no Input de busca; opcional type="search". |
| `src/pages/Envelopes.tsx` | id nos dois selects de transferência e htmlFor nos labels. |

Nenhum outro arquivo precisa de alteração para os itens listados; componentes base (Input, CurrencyInput, Textarea, Select) estão adequados.

### 6. Correções recomendadas (apenas UI) — checklist

- [ ] Auth: adicionar `autocomplete` em email e password (login e register).
- [ ] Settings: `autocomplete` em nome e email do perfil; `id`/`htmlFor` no bloco Nova Conta.
- [ ] TransactionForm: `autocomplete="email"` no campo e-mail quem divide.
- [ ] SharedExpenseForm: `id` e `htmlFor` em Nome e Email do participante.
- [ ] Automations: `id` nos controles e `htmlFor` nos Labels do formulário de regra.
- [ ] Transactions: `id`/`htmlFor` no filtro de data; `aria-label` (ou label) no campo de busca.
- [ ] Envelopes: `id` nos selects “De”/“Para” e `htmlFor` nos labels.
- [ ] (Opcional) SelectTrigger: `id` igual ao `htmlFor` do Label onde já existir Label.
- [ ] (Opcional) Input de busca Transactions: `type="search"`.

---

## Confirmação

- Nenhuma regra de negócio foi alterada.  
- Nenhuma API, hook, validação, serviço de backend ou estado global foi alterado.  
- Nenhum fluxo de criação de transações foi alterado.  
- Esta auditoria apenas analisa e sugere melhorias de UI (teclado, autocomplete, acessibilidade, placeholders e estrutura de labels).  
- **CurrencyInput, Input, Textarea e Select estão corretos para uso em produção;** as sugestões são melhorias incrementais de UX e acessibilidade.
