---
title: Migração de Moeda para Centavos — Frontend
---

## 1. Mapeamento de campos monetários no frontend (estado + contratos)

### 1.1. Transações (`Transaction`)

- **Formulário de transação** (`TransactionForm` / `TransactionFields`):
  - Input de valor: `CurrencyInput` em **centavos**.
  - Estado local: campos em centavos (integers) conforme regra global.
  - Validação (`transaction.validation.ts`): assume centavos para cálculos e splits.
- **Store / serviços**:
  - `transactions.service.ts` envia/consome valores já em centavos onde o backend assim espera.

### 1.2. Contas (`Account.balance`)

- **Tela `Settings`**:
  - Campo `newAccount.balanceCents`:
    - Input: `CurrencyInput` trabalhando em centavos.
    - Estado: `balanceCents: number` (centavos).
  - Conversão no ponto de chamada:
    - `const balanceReais = newAccount.balanceCents / 100;`
    - `addAccount({ name, type, balance: balanceReais })` → **store/backend ainda trabalham em reais (float)**.
  - Renderização:
    - `formatCurrency(account.balance)` → espera reais (float) e apenas formata para exibição.

### 1.3. Despesa compartilhada (`SharedExpense`)

- **Formulário `SharedExpenseForm`**:
  - Estado:
    - `formData.totalAmountCents: number` — centavos (integer).
    - `participants[].amount: number` — **reais** por participante (float), usados apenas para UI/divisão.
  - Inputs:
    - `CurrencyInput` para `totalAmountCents` (centavos).
    - `CurrencyInput` para cada participante, via `toCents`/`fromCents`:
      - UI em centavos, estado de participante ainda em reais.
  - Payload para API (`SharedExpenseCreatePayload` em `sharedExpenseApi`):
    - `total_cents: formData.totalAmountCents` (centavos, integer).
    - `participants[].amount`: convertido via `toCents(p.amount)` quando `split_type === "custom"`.
    - `participants[].percentage`: calculado a partir dos valores em reais, mas enviado em `%` (0–100).

### 1.4. Envelopes (`Envelope.balance`, `Envelope.targetAmount`)

- **`EnvelopeForm`**:
  - Estado:
    - `balanceCents`, `targetAmountCents`: centavos (integer).
  - Input:
    - `CurrencyInput` sempre em centavos.
  - Payload API:
    - `balance`: `balanceCents` (já em centavos) — backend de envelopes espera centavos.
    - `target_amount`: `targetAmountCents` ou `null` — também em centavos.
  - Store:
    - Valores mantidos como inteiros em centavos, conversão para exibição via utils.

### 1.5. Metas (`Goal.targetAmount`)

- **`GoalForm`**:
  - Estado:
    - `targetAmountCents`: centavos (integer).
  - Input:
    - `CurrencyInput` em centavos.
  - Payload API (`goals.service.ts`):
    - `target_amount_cents`: `formData.targetAmountCents` (centavos).
  - Store:
    - `targetAmount` e `currentAmount` refletindo o contrato do backend (centavos), com exibição via `formatCurrencyFromCents`.

## 2. Estado atual — reais vs centavos

Resumo do estado atual no frontend:

- **100% em centavos (estado + API)**:
  - Envelopes (`balanceCents`, `targetAmountCents` + contratos de API).
  - Metas (`targetAmountCents` + `target_amount_cents`).
  - Valores de formulários recentes que já usam `CurrencyInput` com `_Cents`.
- **Misto (front em centavos + domínio em reais)**:
  - `SharedExpenseForm`:
    - Total em centavos (`totalAmountCents` / `total_cents`).
    - `Participant.amount` ainda em reais na camada de domínio/estado, com conversão `toCents` apenas no payload custom.
- **Reais (float) no domínio, centavos apenas na borda de input**:
  - `Account.balance`:
    - Estado/store: reais (float).
    - Input: `balanceCents` (centavos) convertido para reais no ponto de chamada.

## 3. Estratégia de migração incremental (frontend)

> Objetivo: alinhar todo o **estado de UI + stores** para centavos, usando reais apenas quando algum contrato de API legado ainda exigir.

### Fase 1 — Contas (`Account.balance`)

1. **Estado em centavos no store**:
   - Alterar `Account` no `financial-store` para usar `balanceCents` em vez de `balance` em reais.
   - Manter helper de migração interna:
     - Quando carregar dados existentes (reais), converter para centavos (`Math.round(balance * 100)`).
2. **Adaptadores de API no `accounts.service.ts`**:
   - Input:
     - Receber `balanceCents` nos chamadores.
     - Converter para reais apenas na borda da API enquanto o backend ainda esperar `balance` em reais:
       - `balance: balanceCents / 100`.
   - Output:
     - Converter `balance` em reais vindo da API para `balanceCents` no mapeamento para o store.
3. **UI**:
   - Exibição de saldos de conta:
     - Usar `formatCurrencyFromCents` quando o store já estiver em centavos.
   - Formulários:
     - Já usam `CurrencyInput` em centavos; apenas alinhar tipos e nomes (`balanceCents`).

**Critério de done da Fase 1**:

- Nenhum lugar no frontend usa mais `Account.balance` em reais.
- Todo saldo de conta no store e formulários está em centavos (`balanceCents`).
- A única conversão reais ↔ centavos fica encapsulada em `accounts.service.ts` até o backend migrar.

### Fase 2 — Participantes de despesa compartilhada (`Participant.amount`)

1. **Modelo de participante no frontend**:
   - Mudar `Participant.amount` para `amountCents` (integer) em todos os tipos usados na UI/estado:
     - `SharedExpenseForm`.
     - Helpers de shared expense (`sharedExpense.helpers.ts`, `sharedExpense.types.ts`, etc.).
2. **Fluxo de UI**:
   - `CurrencyInput` por participante já opera em centavos:
     - Remover conversões `toCents`/`fromCents` intermediárias.
     - Trabalhar diretamente com `amountCents` em todo o fluxo.
3. **Payloads**:
   - `split_type === "custom"`:
     - `participants[].amount` já está em centavos (`amountCents`).
   - `split_type === "percentage"`:
     - Calcular porcentagem a partir de centavos (evitar floats intermediários).

**Critério de done da Fase 2**:

- Nenhum campo `Participant.amount` em reais no frontend.
- Validações e helpers de split operam apenas em centavos e/ou porcentagens.

### Fase 3 — Limpeza de legados e alinhamento total

1. **Remover conversões redundantes**:
   - Eliminar locais onde ainda se converte centavos → reais → centavos sem necessidade.
2. **Documentar contratos que ainda são em reais**:
   - Enquanto o backend não migrar de fato, manter uma seção clara:
     - Endpoints que ainda esperam reais (float).
     - Adaptadores responsáveis pela conversão.
3. **Checks automatizados**:
   - Adicionar testes unitários simples para garantir:
     - `CurrencyInput` sempre ligado a campos `_Cents` no estado.
     - Nenhum novo campo monetário é criado em reais no frontend.

**Critério de done da Fase 3**:

- Estado e UI do frontend usam **apenas centavos** para valores monetários.
- Todos os usos de reais (float) estão isolados em adaptadores de API bem documentados.

---

## 4. Regras que devem continuar válidas

- Todo valor monetário em **estado, stores e payloads modernos** deve ser integer em centavos.
- `CurrencyInput` é o único componente autorizado para input de moeda.
- Conversões reais ↔ centavos devem acontecer:
  - Apenas em adaptadores de API temporários.
  - Nunca espalhadas pela UI ou lógica de componente.

