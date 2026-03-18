# Tokens de botão — VAI DE PIX

**Objetivo:** Uma única fonte de verdade para alturas, padding e touch targets de botões. Nenhum valor “mágico” em componentes; tudo referenciado aqui.

**Referência:** Sprint em `docs/SPRINT-BUTTONS-UI.md`. Este doc é o entregável da Story 1.1 e a referência para implementação (Story 1.2) e substituição de overrides (Story 2.x).

---

## 1. Tamanhos (sizes)

| Size   | Altura  | Largura (icon) | Padding horizontal | Uso principal                          |
|--------|---------|----------------|--------------------|----------------------------------------|
| `sm`   | 36px (h-9)  | 36×36 (icon)   | 12px (px-3)        | Ações secundárias, toolbars, tabelas   |
| `default` | 40px (h-10) | 40×40 (icon)   | 16px (px-4)        | Botões primários em formulários, CTAs |
| `lg`   | 44px (h-11) | —              | 32px (px-8)        | CTA principal em telas (ex.: “Criar”)  |
| `icon` | 40px (h-10 w-10) | 40×40   | —                  | Apenas ícone (header, notificações)   |

- **Tailwind:** usar classes `h-9`, `h-10`, `h-11`, `px-3`, `px-4`, `px-8` conforme a tabela. Não inventar `h-8`, `px-5`, etc., sem adicionar ao doc.
- **Componente:** `Button` e `ActionButton` expõem apenas `size="sm" | "default" | "lg" | "icon"`. Nenhum `className` com `h-*` ou `px-*` no uso.

---

## 2. Touch targets (acessibilidade)

- **Recomendação (WCAG / boas práticas):** mínimo 44×44px para alvos de toque em mobile.
- **Regra no projeto:**
  - Em viewport **touch** (mobile): botões de ação (submit, cancel, primary) devem ter **min-height 44px** (e min-width 44px quando for botão quadrado). Isso pode ser feito com um size `touch` ou com classes responsivas no próprio `Button` (ex.: `min-h-[44px] md:min-h-0` para não forçar 44px em desktop).
  - Em **desktop:** usar apenas o size (`sm` = 36px, `default` = 40px, `lg` = 44px). Não misturar `h-9` com `min-h-[44px]` no mesmo botão de forma que quebre a consistência visual.
- **Implementação sugerida:** um size `defaultTouch` ou variant que aplica `min-h-[44px] min-w-[44px] touch-manipulation` em mobile e `md:min-h-0 md:min-w-0` em desktop, mantendo o `h-10` (ou h-11) como altura visual em desktop. Assim um único size cobre “botão padrão com touch seguro”.

---

## 3. Largura (full width em mobile)

- **Regra:** Em dialogs/formulários, botões de rodapé podem ser “full width no mobile, auto no desktop”. Uma única classe ou variante (ex.: `fullWidthMobile`) no componente Button: `w-full sm:w-auto`. Não repetir em cada `form-dialog` ou `alert-dialog`.
- **Valor:** evita dezenas de `className="min-h-[44px] w-full sm:w-auto"` espalhados.

---

## 4. Variantes (variant)

- Manter as atuais: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`.
- Variantes definem **cor e borda**, não altura ou padding. Altura/padding vêm só de `size`.

---

## 5. Exceções (documentadas)

- **BottomNav:** itens de navegação podem ter `min-h-[56px]` e padding próprio; é barra de navegação, não botão de ação. Manter fora do sistema de sizes do Button.
- **Sidebar (Story 2.3 — exceção):** O sidebar usa um sistema próprio de tamanhos para densidade visual (menu compacto em desktop). Não utiliza o `Button` para itens de menu.
  - **SidebarMenuButton** (`sidebar.tsx`): variantes CVA próprias — `default: h-8 text-sm`, `sm: h-7 text-xs`, `lg: h-12 text-sm`; padding `p-2`; no modo colapsado (icon) aplica `!size-8 !p-2`. Equivalência aproximada: default ≈ entre sm e default do Button (32px); sm = 28px; lg = 48px.
  - **SidebarTrigger:** usa `Button variant="ghost" size="icon"` com override intencional `h-7 w-7` (28px) para ser um controle menor ao lado do logo; documentado como exceção de dimensão no próprio sidebar.
  - **SidebarMenuSubButton:** `h-7`, `px-2` (subitens do menu).
  - **app-sidebar.tsx:** botão Sair no footer usa `Button size="sm"` com `className="h-8 w-8 p-0"` para caber no header do sidebar; considerado parte da exceção Sidebar.
  - **Justificativa:** Sidebar não é “tela de ação”; é navegação lateral com muitos itens. Valores menores evitam scroll e mantêm hierarquia visual. Em mobile a sidebar não é exibida (navegação via BottomNav).
- **Inputs/SelectTrigger:** `min-h-[44px]` para touch em formulários é aceitável; não é botão, mas alvo de toque. Manter consistente em todos os forms (todos 44px ou todos 40px).

---

## 6. O que não fazer

- Não usar `className` em `<Button>` ou `<ActionButton>` com:
  - `h-*`, `min-h-*`, `max-h-*`
  - `w-*`, `min-w-*` (exceto variante fullWidth documentada)
  - `px-*`, `py-*` (padding de botão vem do size)
- Não criar novos sizes (ex.: `xs`, `xl`) sem atualizar este doc e o componente.
- Não aplicar `min-h-[44px]` em um botão que já usa `size="sm"` (h-9) sem usar o size “touch” ou equivalente documentado — senão o botão fica 44px em mobile e 36px em desktop, e o visual fica inconsistente; preferir size `default` ou `lg` com regra de touch.

---

*Documento criado para a Sprint de Padronização de Botões. Atualizar conforme decisões de implementação (Story 1.2 e 2.x).*
