# Auditoria: Modais de Transações/Despesas/Receitas — Mobile

**Data:** 2025-03-07  
**Escopo:** Modais relacionados a criação de transações, despesas ou receitas.  
**Regra:** Não alterar lógica; apenas UI/UX (Tailwind, layout, overflow, scroll).

---

## PASSO 1 — Modais identificados

| # | Componente | Arquivo | Uso |
|---|------------|---------|-----|
| 1 | **TransactionForm** | `src/components/forms/TransactionForm.tsx` | Cria receita, despesa ou despesa compartilhada. Usa `FormDialog`. |
| 2 | **BankImportDialog** | `src/components/forms/BankImportDialog.tsx` | Importa transações via CSV. Usa `Dialog` + `DialogContent` próprio. |
| 3 | **SharedExpenseRespondModal** | `src/components/shared-expenses/SharedExpenseRespondModal.tsx` | Aceitar/recusar despesa compartilhada. Usa `Dialog` + `DialogContent` próprio. |

**Não são modais (fora do escopo desta auditoria):**
- **SharedExpenseForm** — Renderizado inline na página SharedExpenses (`showForm` / `editingExpense`); não usa Dialog.
- **GoalForm, EnvelopeForm, AddGoalValueForm, EnvelopeValueForm** — Usam `FormDialog` (metas/caixinhas); beneficiam do padrão já aplicado em `FormDialog`, mas não são “criação de transação/despesa/receita”.
- **AlertDialog / ConfirmDialog** — Confirmações; conteúdo curto, sem necessidade do mesmo padrão de scroll.
- **Command (combobox)** — `DialogContent` com `overflow-hidden p-0`; uso específico de busca, não formulário de transação.

---

## PASSO 2 — Verificação mobile (por modal)

### 1. TransactionForm (via FormDialog)

| Verificação | Status |
|------------|--------|
| Modal não ultrapassa viewport | OK — `max-h-[90svh]` |
| Altura máxima definida | OK |
| Scroll no body vs no modal | OK — scroll interno no container do form |
| Botões atrás do teclado | OK — footer fixo + `pb-20` na área de conteúdo |
| Overflow interno | OK — `flex-1 min-h-0 overflow-y-auto` no wrapper dos children |
| Quebra em telas pequenas | OK — `w-full`, `sm:max-w-lg` |
| Trava com teclado | OK — `90svh` e overflow no conteúdo |
| Footer some no mobile | OK — `flex-shrink-0` no footer |

**Formulário:** Apenas `<div className="space-y-4">` envolvendo os campos; não controla scroll. OK.

### 2. BankImportDialog

| Verificação | Status |
|------------|--------|
| Modal não ultrapassa viewport | OK — `max-h-[90svh]` |
| Altura máxima definida | OK |
| Scroll no body vs no modal | OK — área central com `flex-1 min-h-0 overflow-y-auto` |
| Botões atrás do teclado | OK — `DialogFooter` com `flex-shrink-0` |
| Overflow interno | OK — `flex-1 min-h-0 overflow-y-auto px-4 pb-20 space-y-6` |
| Quebra em telas pequenas | OK — `max-w-[95vw] sm:max-w-4xl` |
| Trava com teclado | OK |
| Footer some no mobile | OK — `flex-shrink-0` no footer |

### 3. SharedExpenseRespondModal

| Verificação | Status |
|------------|--------|
| Modal não ultrapassa viewport | OK — `max-h-[90svh]` |
| Altura máxima definida | OK |
| Scroll no body vs no modal | OK — conteúdo com `flex-1 min-h-0 overflow-y-auto` |
| Botões atrás do teclado | OK — `DialogFooter` com `flex-shrink-0` |
| Overflow interno | OK — `flex-1 min-h-0 overflow-y-auto px-4 pb-20` |
| Quebra em telas pequenas | OK — `sm:max-w-md` |
| Trava com teclado | OK |
| Footer some no mobile | OK |

---

## PASSO 3 — Padrão seguro (já aplicado)

Todos os modais listados já seguem o padrão:

- **DialogContent:** `flex flex-col w-full max-h-[90svh] overflow-hidden` (+ `sm:max-w-*` conforme necessidade).
- **Header:** `flex-shrink-0`.
- **Conteúdo:** `flex-1 min-h-0 overflow-y-auto px-4 pb-20` (+ `space-y-*` quando fizer sentido).
- **Footer:** `flex-shrink-0` (e no FormDialog: `flex gap-2 justify-end`).

O componente base **FormDialog** (`src/components/ui/form-dialog.tsx`) já implementa esse padrão; TransactionForm e os demais formulários que o usam herdam o comportamento.

---

## PASSO 4 — Formulários

- **TransactionForm:** Conteúdo do modal é apenas um wrapper `<div className="space-y-4">`; não controla scroll. Controle de altura/scroll fica no FormDialog. OK.

---

## PASSO 5 — Testes (comportamento esperado)

Após a auditoria (sem alterações de lógica), devem continuar funcionando:

- Criar despesa  
- Criar receita  
- Criar despesa compartilhada  
- Importar transações  
- Cancelar criação  
- Fechar modal  
- Abrir/fechar modal várias vezes  
- Salvar transação no mobile  
- Salvar transação no desktop  

Nenhuma alteração de lógica foi feita nesta auditoria; apenas conferência do estado atual.

---

## PASSO 6 — Relatório final

### 1. Lista de modais encontrados

1. **TransactionForm** — `src/components/forms/TransactionForm.tsx` (usa FormDialog)  
2. **BankImportDialog** — `src/components/forms/BankImportDialog.tsx`  
3. **SharedExpenseRespondModal** — `src/components/shared-expenses/SharedExpenseRespondModal.tsx`  

### 2. Arquivos modificados

**Nenhum.** Todos os modais relacionados a transações/despesas/receitas já estavam em conformidade com o padrão seguro de modal para mobile (correções feitas em commit anterior).

### 3. Diff das alterações

N/A — nenhuma alteração aplicada nesta auditoria.

### 4. Explicação breve

- **FormDialog:** Já possui `DialogContent` com `flex flex-col w-full max-h-[90svh] sm:max-w-lg overflow-hidden`, header e footer com `flex-shrink-0`, e área de conteúdo com `flex-1 min-h-0 overflow-y-auto px-4 pb-20 space-y-4`.  
- **TransactionForm:** Usa FormDialog e apenas um wrapper `space-y-4` nos campos; scroll é controlado pelo modal.  
- **BankImportDialog e SharedExpenseRespondModal:** Já possuem a mesma estrutura (max-h 90svh, scroll interno, footer fixo).

Nenhum ajuste adicional foi necessário para responsividade mobile nesses fluxos.

### 5. Confirmação

- Nenhuma regra de negócio foi alterada.  
- Nenhuma API foi alterada.  
- Nenhum hook foi alterado.  
- Nenhuma lógica de submissão foi alterada.  
- Nenhuma validação foi alterada.  
- Nenhum nome de função foi alterado.  
- Nenhum estado global foi alterado.  
- Nenhum serviço de backend foi alterado.  
- Nenhum fluxo de criação de transação foi alterado.  
- Nenhum código funcional foi removido.  

**Nenhuma alteração de código foi realizada nesta auditoria.**
