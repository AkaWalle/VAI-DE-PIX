# Spec: Redesign Visual "Neon Identity"
**Projeto**: VAI DE PIX  
**Data**: 2026-03-23  
**Branch**: `feat/visual-redesign-neon-identity`  
**Status**: Aprovado para execução  

---

## 1. Objetivo

Uniformizar a identidade visual "neon identity" em **todas** as telas e componentes do sistema. A fundação (tokens, fontes, sidebar, bottom nav) já existe — o trabalho é **finalização e consistência**, não redesign do zero. Nenhuma lógica de negócio, store, hook ou contrato de API será alterado.

---

## 2. Identidade Visual (referência única)

| Elemento | Valor | Uso |
|---|---|---|
| Neon green | `#c8ff00` / `var(--neon-green)` | Acento primário, valores positivos, estados ativos |
| Neon subtle | `rgba(200,255,0,0.08)` | Backgrounds de hover, highlight suave |
| Neon border | `rgba(200,255,0,0.15)` | Bordas de cards em foco/ativo |
| Neon glow | `rgba(200,255,0,0.04)` | Sombra difusa em elementos destacados |
| Tipografia display | `font-serif` → Playfair Display | Valores monetários, títulos de seção, headlines |
| Tipografia funcional | `font-mono` → JetBrains Mono | Labels de métricas, numeração, status badges, navegação |
| Tipografia corpo | `font-sans` (padrão body) | Textos corridos, descrições, parágrafos |
| Fundo base | `hsl(240 10% 3.9%)` ≈ `#09090f` | Dark mode — padrão do sistema |

### Regra tipográfica de uso
```
Número / valor monetário  → font-serif italic
Label / categoria / status → font-mono uppercase tracking-wider text-xs
Texto corrido / descrição  → font-sans (herda do body)
Título de página           → font-serif (não italic)
```

### Regra de cor para valores
```
Positivo / receita / entrada → text-[#c8ff00]  ou  text-income
Negativo / despesa / saída   → text-expense (vermelho existente)
Neutro / pendente            → text-muted-foreground
```

---

## 3. Estado atual da branch

### ✅ Já implementado (não tocar)
| Arquivo | O que já tem |
|---|---|
| `src/index.css` | Tokens `--neon-green*`, modo dark como padrão, variáveis completas |
| `tailwind.config.ts` | `neon-green`, `neon-green-subtle`, `neon-green-border`, `font-serif`, `font-mono` |
| `src/components/app-sidebar.tsx` | Item ativo, avatar e labels em neon |
| `src/components/layout/BottomNav.tsx` | Estados ativos e FAB em neon |
| `src/components/Logo.tsx` | "vai de pix" em serif itálico, "pix" em `#c8ff00` |
| `src/components/SectionLabel.tsx` | Numeração mono + texto serif |
| `src/components/ui/financial-card.tsx` | Tokens aplicados |
| `src/components/ui/StatusBadge.tsx` | Tokens aplicados |
| `src/components/GoalCard.tsx` | Ícone de fundo, valor serif, barra gradiente |
| `src/components/dashboard/InsightsRow.tsx` | Acentos neon |
| `src/pages/dashboard.tsx` | Pincelado com identidade |
| `src/pages/Auth.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx` | Pincelado |
| `src/pages/Goals.tsx`, `Transactions.tsx`, `Envelopes.tsx` | Pincelado |
| `src/pages/SharedExpenses.tsx`, `Trends.tsx`, `Reports.tsx` | Pincelado |
| `src/pages/Automations.tsx`, `Settings.tsx` | Pincelado |

### ⚠️ Incompleto ou ausente
| Arquivo | Problema |
|---|---|
| `src/components/layout/PageLayout.tsx` | Título usa `font-bold text-foreground` — sem serif/mono da identidade |
| `src/pages/ActivityFeedPage.tsx` | Sem marcadores da identidade neon |
| `src/pages/SharedExpensePendingPage.tsx` | Sem marcadores da identidade neon |
| `src/pages/NotFound.tsx` | Sem marcadores da identidade neon |
| `src/components/ui/` (Button, Input, Badge) | Verificar herança via `--primary` |

---

## 4. Plano de execução — 5 etapas, 5 PRs

### Etapa 0 — Auditoria de primitivos UI
**PR tamanho**: XS — só leitura + correções mínimas  

Verificar que componentes shadcn/Radix herdam via `--primary` (= `#c8ff00`) sem hardcode:

1. `src/components/ui/button.tsx` — variant `default`: `bg-primary text-primary-foreground` ✓
2. `src/components/ui/input.tsx` — `focus-visible:ring-ring` aponta para `--ring` (verde) ✓
3. `src/components/ui/badge.tsx` — variant `default`: `bg-primary` ✓
4. Se qualquer um usar cor hardcoded → substituir pela variável CSS correspondente

**Regra**: não alterar aparência intencional, só corrigir desvios de token.

---

### Etapa 1 — PageLayout (maior alavanca)
**PR tamanho**: S — 1 arquivo, alto impacto  

`src/components/layout/PageLayout.tsx`:
1. Título de página: `font-bold text-foreground` → `font-serif text-foreground`
2. Subtítulo/descrição: manter `font-sans text-muted-foreground`
3. Label de seção (se houver): `font-mono uppercase tracking-wider text-xs text-[#c8ff00]`
4. Não alterar props nem estrutura JSX — apenas classNames

**Por que é a maior alavanca**: corrigir aqui uniformiza automaticamente todas as telas que passam por esse layout, sem tocar em cada página individualmente.

---

### Etapa 2 — Páginas órfãs
**PR tamanho**: S — 3 arquivos  

`src/pages/ActivityFeedPage.tsx`:
- Título: `font-serif`
- Labels de tipo/categoria: `font-mono uppercase text-xs text-muted-foreground`
- Valores monetários: `font-serif italic` + cor por tipo (positivo/negativo/neutro)
- Ícones de status confirmado: `text-[#c8ff00]`

`src/pages/SharedExpensePendingPage.tsx`:
- Título: `font-serif`
- Labels de status ("pendente", "aprovado"): `font-mono uppercase text-xs`
- Valores: regra padrão de cores

`src/pages/NotFound.tsx`:
- Número "404": `font-serif text-[#c8ff00]` — momento memorável da identidade
- Texto de suporte: `font-sans text-muted-foreground`
- Botão de volta: `Button` padrão (herda `primary` automaticamente)

---

### Etapa 3 — Revisão de consistência (páginas pinceladas)
**PR tamanho**: M — revisão em 10+ páginas  

Para cada página já pincelada (Dashboard, Goals, Transactions, Envelopes, SharedExpenses, Trends, Reports, Automations, Settings, Auth):

| O que verificar | Esperado |
|---|---|
| Valores monetários | `font-serif italic` + cor correta |
| Labels de métricas | `font-mono uppercase tracking-wider text-xs` |
| Títulos de seção | `font-serif` (sem italic) |
| Estados ativos | `text-[#c8ff00]` ou `text-neon-green` |
| `#c8ff00` hardcoded em `style={}` | Migrar para classe Tailwind |
| Cor `primary` usada corretamente | Não duplicar com hardcode |

**Regra**: página já correta → documentar como "aprovada", não tocar. Zero refactoring gratuito.

---

### Etapa 4 — Componentes de domínio restantes
**PR tamanho**: S — componentes pontuais  

`src/components/NotificationBell.tsx`:
- Badge de contagem: `font-mono text-xs` com `bg-neon-green-subtle text-[#c8ff00]`

`src/components/pix/ConfirmationRow.tsx`:
- Label da linha: `font-mono uppercase text-xs text-muted-foreground`
- Valor: `font-serif italic` + cor por tipo

`src/components/pix/PixKeyCard.tsx`:
- Label "Chave PIX" / tipo: `font-mono uppercase text-xs`
- Valor da chave: `font-mono text-sm` (dados técnicos = mono)
- Borda quando selecionado: `border-neon-green-border`

`src/components/forms/SharedExpenseForm.tsx`:
- Verificar somente labels de categoria — se houver, `font-mono uppercase text-xs`
- Inputs e textos de formulário: manter `font-sans` (correto)

---

## 5. Checklist de validação final

Executar na Preview antes de qualquer merge em `main`:

### Funcional
- [ ] Login / logout
- [ ] Envio de PIX completo
- [ ] Histórico de transações
- [ ] Envelopes e Metas
- [ ] Formulários sem regressão

### Identidade visual
- [ ] Títulos em Playfair Display em todas as telas
- [ ] Labels de métricas em JetBrains Mono uppercase
- [ ] Valores positivos em `#c8ff00`, negativos em vermelho
- [ ] Sidebar: item ativo em neon green
- [ ] BottomNav: indicador ativo em neon green
- [ ] Logo: "pix" em `#c8ff00` serif itálico
- [ ] 404: número em neon green serif

### Mobile (375px)
- [ ] Sem overflow horizontal em nenhuma tela
- [ ] BottomNav não sobrepõe conteúdo
- [ ] Tipografia legível sem truncamento indevido

### Acessibilidade
- [ ] Foco visível em todos os elementos interativos
- [ ] Contraste `#c8ff00` / `#09090f` ≈ 12:1 — WCAG AAA ✅
- [ ] Estado não indicado apenas por cor

---

## 6. Fora do escopo (explícito)

- Stores, hooks, lógica de negócio
- Backend e APIs
- Schemas Zod e validações
- Testes existentes
- `.env`, `docker-compose.yml`, `src/main.tsx`, `src/App.tsx`

---

## 7. Convenção de commits

```
style(ui): audit shadcn primitives for primary token inheritance
style(layout): apply serif typography to PageLayout title
style(pages): apply neon identity to ActivityFeedPage
style(pages): apply neon identity to SharedExpensePendingPage
style(pages): 404 neon hero — NotFound redesign
style(consistency): align neon usage across dashboard and feature pages
style(domain): mono labels and serif values in PixKeyCard and ConfirmationRow
```

---

## 8. Nota sobre `--primary` e `#c8ff00`

`--primary: 75 100% 50%` = `#c8ff00`. Componentes que usam `bg-primary` / `text-primary` já carregam neon green automaticamente. Hardcodar `#c8ff00` em componentes que podem usar `primary` é redundante e fragiliza o suporte a light/dark mode.

**Regra prática**: `text-[#c8ff00]` apenas quando o elemento não pode usar `text-primary` — por exemplo, um span de acento dentro de texto misto, ou quando `primary-foreground` (preto) seria aplicado no lugar errado.