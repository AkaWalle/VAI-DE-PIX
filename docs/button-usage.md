# Uso de botões — VAI DE PIX

**Objetivo:** Garantir que todos os botões usem o sistema padronizado (`Button` / `ActionButton`) e que novos códigos não reintroduzam overrides de dimensão.

**Referências:** `docs/design-tokens-buttons.md` (tokens e exceções), `docs/SPRINT-BUTTONS-UI.md` (sprint de padronização).

---

## Regra principal

**Botões devem usar apenas o componente `Button` ou `ActionButton` com `variant` e `size`.**

- **Não usar** `className` em `<Button>` ou `<ActionButton>` com dimensões de botão:
  - `h-*`, `min-h-*`, `max-h-*`
  - `w-*`, `min-w-*` (exceto quando a variante documentada exigir, ex.: layout específico)
  - `px-*`, `py-*` (o padding vem do `size`)

- **Permitido:** `className` para coisas que **não** são dimensão do botão, por exemplo:
  - alinhamento: `flex-1`, `w-full` em contexto de grid/flex (quando for a prop `fullWidthMobile` do Button, usar a prop em vez de classe)
  - posicionamento: `relative`, `absolute`
  - cor/borda específica em um único uso: desde que não altere altura/largura do botão
  - acessibilidade: `sr-only`, etc.

- **Largura em mobile:** Para “full width no mobile, auto no desktop” use a prop **`fullWidthMobile`** do `Button` (um único lugar), não `className="w-full sm:w-auto"`.

---

## Tamanhos (size)

| Size     | Uso |
|----------|-----|
| `sm`     | Ações secundárias, toolbars, tabelas (ex.: filtros, “Limpar”). |
| `default`| Botões primários em formulários, CTAs em dialogs. |
| `lg`     | CTA principal em telas (ex.: “Criar transação”, “Nova meta”). |
| `icon`   | Apenas ícone (ex.: tema, notificações, toggle sidebar). |

Não criar novos sizes sem atualizar `docs/design-tokens-buttons.md` e o componente.

---

## Variantes (variant)

Usar apenas as definidas: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`. Variantes definem **cor e borda**, não altura ou padding.

---

## Exceções

- **Sidebar / BottomNav:** Valores próprios documentados em `docs/design-tokens-buttons.md` (§ Exceções). Não replicar esses valores em botões de tela.
- **Componentes que compõem botões** (ex.: `AlertDialogAction`): usam `buttonVariants()` e classes de largura documentadas; não adicionar `min-h-*`/`px-*`/`py-*` redundantes.

---

## Revisão de PRs (opcional)

Em PRs que toquem em botões, checar:

- Nenhum `<Button` ou `<ActionButton` com `className` contendo `h-`, `min-h-`, `px-`, `py-` (salvo exceções documentadas).
- Uso de `fullWidthMobile` em rodapés de dialog em vez de `w-full sm:w-auto` solto.

**Opcional (ESLint):** Regra customizada que alerte ou falhe quando `className` em elemento que usa `buttonVariants` ou componente `Button` contiver padrões como `h-\d`, `min-h-`, `px-\d`, `py-\d`. Pode ser implementada em etapa posterior da sprint.

---

*Documento criado para a Sprint de Padronização de Botões (Story 4.1). Manter alinhado a `design-tokens-buttons.md` e `SPRINT-BUTTONS-UI.md`.*
