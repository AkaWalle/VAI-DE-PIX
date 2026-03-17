# Sprint — Padronização de botões e UI (VAI DE PIX)

**Objetivo:** Eliminar inconsistência de pixels em botões e elementos interativos. Uma única fonte de verdade para tamanhos, padding e touch targets; zero overrides ad hoc de altura/padding em componentes.

**Regra:** Após a sprint, nenhum botão deve usar `className` com `h-*`, `min-h-*`, `px-*`, `py-*` (exceto via variantes do componente). Se for necessário mudar layout para atingir isso, está no escopo.

---

## Problema atual (resumo do audit)

- **Button base (`button.tsx`):** `default: h-10 px-4 py-2`, `sm: h-9 px-3`, `lg: h-11 px-8`, `icon: h-10 w-10` — valores fixos em Tailwind, sem tokens centralizados.
- **Overrides espalhados:**
  - `h-9 px-3 text-sm` em dezenas de usos (Transactions, Envelopes, Settings, Goals, Reports, Automations, dashboard).
  - `h-9 px-4 text-sm` em Settings, Automations.
  - `min-h-[44px] w-full sm:w-auto` ou `min-h-[44px] w-full touch-manipulation sm:w-auto` em form-dialog, alert-dialog, SharedExpenseForm, BankImportDialog, SharedExpenseRespondModal.
  - `h-9 w-9 min-h-[44px] min-w-[44px]` em header (main-layouts), NotificationBell — mistura tamanho visual (36px) com touch (44px).
  - `h-7 text-xs` em NotificationBell (dropdown).
  - **ActionButton:** `min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0` — em mobile 44px, em desktop volta ao size do Button (inconsistente).
- **Sidebar:** `SidebarMenuButton` com variantes próprias (h-7, h-8, px-2, etc.) — outro sistema de tamanhos.
- **BottomNav / outros:** `min-h-[56px]`, `min-h-[44px]`, `py-2.5`, etc., sem alinhamento com o sistema de botões.

**Resultado:** Alturas e paddings diferentes para ações semelhantes; manutenção difícil; sensação de “não padronizado”.

---

## Épico 1 — Definição e tokens

*Dono: Desenvolvimento / Frontend.*

### Story 1.1 — Documentar tokens de botão e regras de uso

- **Entregável:** Documento (ex.: `docs/design-tokens-buttons.md`) com:
  - **Alturas padrão:** uma tabela única (ex.: default 40px, sm 36px, lg 44px, icon 40px; touch-mobile 44px mínimo quando aplicável).
  - **Padding horizontal:** padrão por size (ex.: default px-4, sm px-3, lg px-8).
  - **Regra de touch:** em viewport touch, botões primários de ação com min-height 44px (acessibilidade); em desktop, usar size do componente sem override.
  - **Onde cada size se aplica:** primary action = default ou lg; ações secundárias em toolbar = sm; ícone só = icon; dentro de dialogs = default com variante “fullWidth” ou “touch” se necessário.
- **Critérios de aceite:** Doc aprovado; nenhum valor “mágico” (tudo nomeado: size default/sm/lg, touch 44px).

### Story 1.2 — Definir variantes no componente Button (e ActionButton)

- **Entregável:** 
  - `button.tsx`: sizes e variantes alinhados ao doc; opcionalmente um variant ou size `touch` que aplica `min-h-[44px]` em mobile e mantém h-* em desktop (via media query ou classe responsiva).
  - `ActionButton`: usar apenas `variant` e `size` do Button; remover override de `min-h-[44px] md:min-h-0` e substituir por size/variant documentados (ex.: size="default" com classe responsiva centralizada no Button).
  - Exportar tokens (ex.: Tailwind theme ou CSS vars) para altura/padding de botão, se fizer sentido no stack atual.
- **Critérios de aceite:** Um único lugar define altura e padding de botão; ActionButton não adiciona dimensões próprias.

---

## Épico 2 — Auditoria e substituição

*Dono: Frontend.*

### Story 2.1 — Listar todos os usos com override de tamanho

- **Entregável:** Lista (no próprio `docs/SPRINT-BUTTONS-UI.md` ou em planilha) de arquivos e trechos onde há:
  - `className` em `<Button` ou `<ActionButton` contendo `h-`, `min-h-`, `px-`, `py-` (exceto utilitários não relacionados a tamanho, ex.: `flex`, `gap`).
  - Componentes que estendem botão (alert-dialog, form-dialog, SharedExpenseRespondModal, etc.) com classes de altura/largura.
- **Critérios de aceite:** Nenhum uso relevante deixado de fora; lista vira backlog da Story 2.2.

### Story 2.2 — Substituir overrides por variantes/sizes ✅

- **Implementado:** Todas as páginas listadas (Transactions, Envelopes, Settings, Goals, Reports, Automations, dashboard, SharedExpenses) tiveram `h-9 px-3 text-sm` (e variantes) trocados por `size="sm"` em Button/ActionButton; classes restantes apenas para layout/cor (ex.: `flex items-center gap-2`, `text-muted-foreground`, `text-destructive`).
- **Entregável:** Em cada arquivo da lista:
  - Remover `className` que define altura/padding de botão; usar apenas `variant` e `size` (e, se criado, `touch` ou `fullWidth`).
  - Em formulários/dialogs: usar um size padrão (ex.: default) e, se o layout exigir botão full width em mobile, usar uma variante “fullWidth” no Button (ou classe única definida no próprio Button) em vez de repetir `min-h-[44px] w-full sm:w-auto`.
  - Ajustar layout (ex.: trocar ordem de botões, largura de container) **se necessário** para não precisar de override.
- **Critérios de aceite:** Zero overrides de altura/padding em botões; build sem regressão visual em telas críticas (lista de telas definida na sprint).

### Story 2.3 — Padronizar componentes que compõem botões (dialog, alert, etc.)

- **Entregável:** 
  - `form-dialog.tsx`, `alert-dialog.tsx`, `SharedExpenseRespondModal.tsx`, etc.: botões de rodapé usam `<Button size="..." variant="...">` (e eventualmente `className="w-full sm:w-auto"` se for a única exceção documentada para largura), sem `min-h-[44px]` repetido — o próprio Button (ou size `touch`) garante 44px em touch.
  - Sidebar: alinhar `SidebarMenuButton` aos tokens (ex.: alturas e padding definidos no doc) ou documentar por que é um sistema separado e quais são os valores equivalentes.
- **Critérios de aceite:** Um clique em qualquer botão de dialog/alert usa o mesmo sistema de tamanhos; sidebar documentada ou unificada.

---

## Épico 3 — Layout e exceções

*Dono: Frontend. Apoio: Design (se houver).*

### Story 3.1 — Decidir e documentar exceções (se houver)

- **Entregável:** No doc de tokens, seção “Exceções”:
  - Ex.: BottomNav pode manter min-height próprio (56px) por ser barra de navegação, não botão de ação.
  - Ex.: Botão “full width em mobile” = uma única classe ou variante, não espalhada em vários arquivos.
- **Critérios de aceite:** Qualquer valor que fuja do padrão está escrito e justificado; não há “exceção implícita”.

### Story 3.2 — Ajustes de layout (se necessário)

- **Entregável:** Se, após remover overrides, alguma tela ficar quebrada ou feia (ex.: botões desalinhados, CTAs pequenos demais), ajustes de layout (flex, grid, largura de container, ordem de elementos) para manter UX sem reintroduzir override de pixel em botão.
- **Critérios de aceite:** Telas revisadas; mudanças de layout mínimas e documentadas (ex.: “Settings: botões do rodapé em flex-wrap”).

---

## Épico 4 — Qualidade e doc final

*Dono: Frontend. Revisão: QA.*

### Story 4.1 — Regra no código e no README ✅

- **Entregável:** 
  - Em `docs/button-usage.md` (ou equivalente): “Botões devem usar apenas o componente Button/ActionButton com variant e size. Não usar className com h-*, min-h-*, px-*, py-* para dimensões de botão.”
  - Opcional: regra no ESLint ou no PR template (“não adicionar className com h-/min-h-/px-/py- em Button”).
- **Critérios de aceite:** Novo código não reintroduz overrides; doc visível para o time.
- **Implementado:** `docs/button-usage.md` criado com regra principal, sizes, variantes, exceções e sugestão de revisão de PR; ESLint opcional citado para etapa posterior.

### Story 4.2 — QA visual e aceite

- **Entregável:** Passada em telas principais (Transactions, Envelopes, Goals, Settings, SharedExpenses, Auth, Dialogs, Header, Notifications): botões consistentes, sem pixels “diferentes” entre ações semelhantes; touch targets respeitados onde aplicável.
- **Critérios de aceite:** QA aprova; sprint de padronização considerada concluída.

**Checklist QA visual (após trocas de botões):**

| Tela / Área | O que conferir |
|-------------|-----------------|
| **Header** | Botão tema e sino de notificações: ícones 44px (touch) em mobile, tamanho normal em desktop; sem “cortes” ou desalinhamento. |
| **Dialogs (FormDialog)** | Rodapé: Cancelar e Enviar full width no mobile, lado a lado no desktop; alturas consistentes; touch ≥ 44px em mobile. |
| **AlertDialog** | Botões Ação e Cancelar: mesma altura e largura (w-full sm:w-auto); sem overlap ou texto cortado. |
| **Transactions** | Filtros, ações em lote, botões de ação: visualmente consistentes (size sm onde aplicável); toque confortável em mobile. |
| **Envelopes** | Transferir, Nova Caixinha, rodapés de formulários: CTA em destaque; secundários com size sm. |
| **Goals** | Nova Meta, Adicionar valor, excluir: botões alinhados ao padrão; rodapés de sheet/dialog ok. |
| **Settings** | Contas, categorias, export, preferências: botões sem h-9/px-3 soltos; uso de size sm/default conforme contexto. |
| **SharedExpenses / Pendências** | Aceitar/Recusar, Fechar, formulários: fullWidthMobile em rodapés; destaque visual do CTA. |
| **Auth (login/registro)** | Botão principal de submit: tamanho adequado (default ou lg); sem override de altura. |
| **BankImportDialog** | Cancelar, Importar, Exemplo Extrato/Cartão: full width no mobile; sem regressão de layout. |
| **Sidebar (desktop)** | Itens de menu e botão Sair: exceção documentada; altura consistente entre itens; colapso (ícone) legível. |
| **BottomNav (mobile)** | Itens com min-h respeitado; exceção documentada; sem sobreposição com conteúdo. |

Executar em pelo menos um viewport mobile (touch) e um desktop; anotar qualquer inconsistência para ajuste na Story 2.2 ou 3.2.

---

## Ordem sugerida

1. **Story 1.1** — Doc de tokens e regras (fonte única de verdade).
2. **Story 1.2** — Ajustar Button e ActionButton para usar esses tokens; criar size/variant “touch” ou “fullWidth” se necessário.
3. **Story 2.1** — Auditoria completa (lista de overrides).
4. **Story 2.2** — Substituir overrides por variant/size (e layout se precisar).
5. **Story 2.3** — Padronizar form-dialog, alert-dialog, sidebar.
6. **Story 3.1** — Documentar exceções.
7. **Story 3.2** — Ajustes de layout pontuais.
8. **Story 4.1** — Doc de uso + regra para novos PRs.
9. **Story 4.2** — QA e aceite.

---

## Checklist rápido

- [x] Doc de tokens (`docs/design-tokens-buttons.md`) criado e aprovado (Story 1.1).
- [x] Button e ActionButton sem overrides internos de altura/padding; sizes/variants alinhados ao doc (Story 1.2).
- [x] Lista de overrides preenchida (Story 2.1) — seção “Lista de overrides — auditoria Story 2.1 (fechamento)” com tabela por arquivo (corrigido, exceção, pendente 2.2).
- [x] Todos os overrides removidos nas páginas; apenas variant/size nos botões (Story 2.2).
- [x] Dialogs/alert padronizados; Sidebar documentada como exceção em `design-tokens-buttons.md` (Story 2.3) — sem alteração de código no Sidebar.
- [x] Exceções documentadas (Story 3.1): Sidebar, BottomNav, inputs; layout ajustado se necessário (Story 3.2).
- [x] Doc de uso de botão (`docs/button-usage.md`) + regra para PR (Story 4.1); ESLint opcional para depois.
- [ ] QA visual aprovada (Story 4.2) — **pendente:** executar checklist na Story 4.2 acima (mobile e desktop) e aprovar.

---

## Referência de arquivos (audit inicial)

| Tipo | Arquivos com overrides de botão / altura |
|------|------------------------------------------|
| UI base | `src/components/ui/button.tsx`, `action-button.tsx`, `form-dialog.tsx`, `alert-dialog.tsx`, `pagination.tsx`, `icon-picker.tsx`, `sidebar.tsx` |
| Páginas | `Transactions.tsx`, `Envelopes.tsx`, `Goals.tsx`, `Settings.tsx`, `SharedExpenses.tsx`, `SharedExpensePendingPage.tsx`, `Reports.tsx`, `Automations.tsx`, `dashboard.tsx`, `Auth.tsx` |
| Forms | `EnvelopeForm.tsx`, `EnvelopeValueForm.tsx`, `GoalForm.tsx`, `AddGoalValueForm.tsx`, `SharedExpenseForm.tsx`, `TransactionForm.tsx`, `BankImportDialog.tsx`, `TransactionFields.tsx`, `ParticipantsList.tsx` |
| Outros | `main-layouts.tsx`, `NotificationBell.tsx`, `ActivityFeedPanel.tsx`, `SharedExpenseRespondModal.tsx`, `ErrorBoundary.tsx`, `BottomNav.tsx`, `app-sidebar.tsx` |

---

## Lista de overrides — auditoria Story 2.1 (fechamento)

Lista de usos com override de tamanho em `<Button>` / `<ActionButton>` (ou componentes que compõem botões). Objetivo: nenhum uso relevante fora da lista; lista vira backlog da Story 2.2.

| Arquivo | Uso / trecho | Status |
|---------|----------------|--------|
| **UI base** | | |
| `button.tsx` | Sizes + touch + fullWidthMobile definidos no componente | ✅ Corrigido (Story 1.2) |
| `action-button.tsx` | Sem override; delega ao Button | ✅ Corrigido (Story 1.2) |
| `form-dialog.tsx` | Rodapé: Cancelar / Enviar | ✅ Corrigido — usam `fullWidthMobile`, sem min-h/w-full (Story 1.2) |
| `alert-dialog.tsx` | Action / Cancel | ✅ Corrigido — `buttonVariants({ size: "default" })` + só `w-full sm:w-auto` (Story 1.2) |
| `sidebar.tsx` | SidebarTrigger `h-7 w-7`; SidebarMenuButton sizes próprios (h-8, h-7, h-12) | 📌 Exceção documentada (Story 2.3) |
| **Layout / header** | | |
| `main-layouts.tsx` | Botão tema | ✅ Corrigido — `size="icon"` (Story 1.2) |
| `NotificationBell.tsx` | Trigger sino; botões dropdown (Marcar lido) | Trigger ✅ `size="icon"`. Dropdown: `h-7 text-xs` em Button — pendente 2.2 (trocar por size) |
| **Dialogs / modais** | | |
| `SharedExpenseRespondModal.tsx` | Fechar / Recusar / Aceitar | ✅ Corrigido — `fullWidthMobile` (Story 1.2) |
| `BankImportDialog.tsx` | Footer e botões de exemplo | ✅ Corrigido — `fullWidthMobile` (Story 1.2) |
| `SharedExpenseForm.tsx` | Cancelar / Submit / Adicionar participante | ✅ Corrigido — `fullWidthMobile` (Story 1.2) |
| **Páginas** | | |
| `Transactions.tsx` | Vários botões com `h-9 px-3 text-sm` (filtros, ações) | ✅ Story 2.2 — `size="sm"` |
| `Envelopes.tsx` | Botões com `h-9 px-3 text-sm` (ex.: Transferir) | ✅ Story 2.2 |
| `Goals.tsx` | Botões com override de tamanho | ✅ Story 2.2 |
| `Settings.tsx` | Botões com `h-9 px-4 text-sm`, etc. | ✅ Story 2.2 |
| `Reports.tsx` | Botões com `h-9 px-3 text-sm` | ✅ Story 2.2 |
| `Automations.tsx` | Botões com override | ✅ Story 2.2 |
| `dashboard.tsx` | Botões com override | ✅ Story 2.2 |
| `SharedExpenses.tsx` / `SharedExpensePendingPage.tsx` | Botões com override | ✅ Story 2.2 |
| **Forms** | | |
| `EnvelopeForm.tsx`, `EnvelopeValueForm.tsx`, `GoalForm.tsx`, `AddGoalValueForm.tsx` | Rodapés já com Button padrão ou fullWidthMobile | ✅ Conferido |
| **Outros** | | |
| `app-sidebar.tsx` | Botão Sair `h-8 w-8 p-0`; SidebarMenuButton com className collapsed | 📌 Exceção Sidebar (Story 2.3) |
| `BottomNav.tsx` | min-h-[56px] etc. | 📌 Exceção documentada (tokens § Exceções) |
| `pagination.tsx`, `icon-picker.tsx`, `ErrorBoundary.tsx`, `ActivityFeedPanel.tsx` | Conferir se há Button com h-/px-/py- | ⏳ Pendente 2.2 se houver |

**Resumo:** Corrigidos = UI base, dialogs, layout tema/sino (trigger), SharedExpenseRespondModal/BankImport/SharedExpenseForm; **páginas = Story 2.2 concluída** (h-9 px-3 text-sm → size="sm"). Pendentes = NotificationBell dropdown (se aplicável); exceções = Sidebar, BottomNav (documentadas).

**Docs:** Tokens = `docs/design-tokens-buttons.md`. Regras de uso (não usar className com dimensões) = `docs/button-usage.md`. QA = checklist em Story 4.2 acima.

---

*Sprint criada para correção definitiva de inconsistência de pixels em botões. Prioridade: sanar o quanto antes; mudança de layout permitida se necessária.*
