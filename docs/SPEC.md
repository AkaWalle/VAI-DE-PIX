> Última atualização: 2026-03-27 (Fases 1 e 2 concluídas)

# SPEC — Melhorias de UX/UI (login → dashboard → fluxos secundários)

**Documento mestre de critérios de aceite.** Produto e contexto: [PRD.md](./PRD.md).

**Stack (referência):** React 18, Vite, TypeScript, Tailwind, Radix/shadcn-style (`src/components/ui/`), Recharts, Sonner, React Router 6. Detalhes: [FRONTEND.md](./FRONTEND.md).

---

## 1. Escopo global e definição de pronto

### 1.1 Objetivo da implementação

Implementar melhorias visuais e de UX descritas no PRD, **sem** alterar regras de negócio nem contratos de API, **exceto** onde esta SPEC exigir explicitamente novos endpoints, agregações (ex.: série para sparkline) ou endpoints de export/import — nesses casos o backend deve validar entrada, limites e erros.

### 1.2 Fora de escopo

- Trocar fluxo de auth, storage de token ou modelo de usuário.
- Redesign completo do design system fora dos componentes/telas citados.

### 1.3 Definição de “concluído” (transversal)

- [x] `npm run build` (ou pipeline CI equivalente) e lint/typecheck do frontend sem novos erros introduzidos pela entrega — *verificado após Fase 1 (`vite build`).*
- [x] Estados de **foco** visíveis ao navegar com **teclado** nos formulários e modais alterados — *login: `Input` + tabs com `focus-visible`.*
- [x] **`prefers-reduced-motion`:** animações decorativas (donut placeholder, entradas de gráfico) respeitam redução de movimento — fallback estático. — *preview do auth: `motion-safe` / `motion-reduce`.*
- [x] **Responsivo:** split login e modais “duas colunas” em desktop viram **uma coluna** em mobile, sem overflow horizontal evitável. — *Fase 1 login.*
- [ ] **Moeda:** nenhum fluxo novo ou alterado usa `input type="number"` ou string para valor monetário; usar `CurrencyInput` + centavos conforme contrato; backend valida nos fluxos tocados. *(Fases seguintes / formulários monetários.)*

---

## 2. Fase 1 — Login e onboarding

### 2.1 Layout split (proporção e respiro)

- [x] Em viewport **`lg` e acima**, proporção coluna **conteúdo (esquerda)** / **formulário (direita)** entre **~55–65% / ~35–45%** (alvo ~**60/40**). — *Grid `lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]`.*
- [x] Coluna do formulário com **padding interno mínimo** documentado (ex.: equivalente a `p-8` na escala Tailwind) e **gutter** claro entre as colunas. — *`lg:px-10 xl:px-14`, `lg:border-l`.*
- [x] Verificado em **1280px** e **1920px**: sem texto ou campos colados na borda da viewport. — *padding responsivo na coluna direita e hero.*

### 2.2 Hierarquia tipográfica do hero (lado esquerdo)

- [x] Trecho principal do título e ênfase (ex.: “inteligência”) com **tamanho e peso** claramente distintos.
- [x] Tagline abaixo do título com tamanho **legível** em relação ao título (proporção definida no tema — não menor que o mínimo aceitável para leitura em dark).
- [x] No máximo **dois** níveis de destaque competindo no mesmo bloco (evitar três “títulos” com peso similar).

### 2.3 Campos de input (dark, foco, label)

- [x] Borda **default** em dark com contraste **perceptível** vs. fundo (não “invisível”). — *`--border` / `--input` no `index.css` + `border-2` no `Input`.*
- [x] Estado **focus** com **anel/ring verde-neon** (token em `index.css` ou variável Tailwind); espessura e offset alinhados ao padrão dos outros `focus-visible` do app. — *`--ring` mais vivo + sombra `primary` no foco.*
- [x] Label flutuante: não cortar texto, não conflitar com ícones; **`<label>`** ou `aria-label` associado ao controle. — *`FloatingField` em `/auth`.*
- [x] Estados **erro** e **desabilitado** sem regressão vs. comportamento atual. — *Alert por formulário; `disabled` no input.*

### 2.4 Botões “Entrar” e “Criar conta”

- [x] CTA primário (verde) permanece o elemento mais destacado. — *submit full-width + tabs ativas em `primary`.*
- [x] Ação secundária (“Criar conta”) com **contraste** adequado; hover/focus discrimináveis. — *aba inativa com underline no hover; links texto com underline.*
- [x] **Uma** abordagem escolhida e documentada no PR/commit: **(A)** dois botões full-width com hierarquia clara, ou **(B)** primário full-width + secundário como **link/underline** (sem dois botões competindo em peso igual). — ***Híbrido:** tabs (Entrar / Criar conta) com aba ativa destacada; **(B)** links “Ainda não tem conta? / Já tem uma conta?” abaixo do submit.*

### 2.5 Elemento visual à esquerda

- [x] Incluir **um** elemento de valor: mockup em perspectiva, gráfico animado sutil, ou grid de stats. — *`AuthDashboardPreview` (stats + área de gráfico SVG).*
- [x] **Performance:** assets pesados com lazy load se necessário; não bloquear render crítico de forma gritante. — *SVG/CSS apenas; animação leve.*
- [x] Decoração sem significado: `aria-hidden="true"` quando apropriado. — *`aria-hidden` no preview.*

**Entrega sugerida:** PR — “Fase 1 — login layout + tokens input/CTA”.

---

## 3. Fase 2 — Dashboard: cards e resumo

### 3.1 Quatro cards de KPI

- [x] Layout por card: **ícone maior à esquerda**, **valor em destaque**, label/subtítulo hierárquico. — *`FinancialCard` redesenhado.*
- [x] **Variação** (quando houver dado): delta ou percentual com **cor semântica** (positivo/negativo) e **indicador direcional** (seta ou equivalente). — *tendência 7d vs 7d anterior + `trendPolarity` em despesas.*
- [x] Fundo com **gradiente sutil** por tipo de KPI (até 4 variantes), legível em dark.
- [x] Grid responsivo: ícone e valor não esmagados em breakpoints médios. — *1 col mobile / 2 sm / 4 lg.*

### 3.2 Sparkline nos cards (últimos 30 dias)

- [x] Mini gráfico de **linha** com até **30 pontos**, posicionado no **canto inferior direito** do card (ou área reservada equivalente). — *`Sparkline` + `financial-card`.*
- [x] Fonte de dados: **hook/serviço/endpoint** documentado; se dias úteis &lt; 30, comportamento definido (truncar eixo, preencher com zero, etc.) e descrito nesta SPEC no histórico ou subseção técnica. — *Ver §8 — série diária a partir de `transactions` na store; dias sem movimento = 0; saldo = encadeamento retroativo a `getTotalBalance()`.*
- [x] **Loading:** skeleton alinhado à Fase 4. — *`DashboardPageSkeleton` até `persist.onFinishHydration` em `dashboard.tsx`.*
- [x] Evitar re-render excessivo no scroll (memoização ou dados estáveis por query key). — *`useMemo` + `React.memo` no `Sparkline`.*

### 3.3 Gráfico “Fluxo de Caixa”

- [x] **Área plot** maior (altura mínima definida no design; responsivo). — *~260px mobile / ~340px desktop.*
- [x] Cores **receita** vs. **despesa** distintas; legenda ou padrão não depende só de cor. — *`<Legend />` + texto acessório no mobile.*
- [x] **Tooltip** no hover: valor formatado em R$ + **data** (pt-BR). Onde possível, melhorar acessibilidade (dados repetidos na legenda ou painel — decisão registrada). — *Tooltip custom com período (`month`) e linhas por série.*
- [x] Eixo Y com valores em **R$** (`formatCurrencyFromCents` ou formatter dedicado consistente com o app). — *`formatCurrency` (reais na store do dashboard), igual ao restante da página.*

### 3.4 “Gastos por Categoria” — estado vazio

- [x] Ícone e **CTA** mais atrativos mantendo mensagem clara. — *`CategorySpendingEmpty`.*
- [x] **Donut placeholder** animado (sutil); se `prefers-reduced-motion`, versão estática. — *conic-gradient + `motion-safe:animate`.*
- [x] Botão primário do empty state com **hierarquia** clara vs. outros CTAs da página. — *“Registrar despesa” primário; “Ver caixinhas” outline.*

**Entrega sugerida:** PR — “Fase 2 — KPI + sparkline + fluxo”; PR opcional — “empty categorias”.

---

## 4. Fase 3 — Dashboard: seções inferiores, sidebar, header

### 4.1 Seção Metas (preview / “em construção”)

- [x] Exibir **progresso visual** (barra ou anel), **percentual** e **prazo** (data relativa ou absoluta). — *`GoalProgressRing` + `%` no centro + `formatDistanceToNow` / data absoluta em `dashboard.tsx`.*
- [x] O usuário entende o estado **sem** depender apenas de um contador numérico genérico (ex.: “02”).

### 4.2 Transações recentes

- [x] **Ícone** por categoria por linha. — *emoji em círculo `bg-muted/80`.*
- [x] **Chip** colorido por tipo (entrada/saída). — *`Badge` Entrada/Saída.*
- [x] **Valor** com cor alinhada ao tipo.
- [x] Separador entre linhas **mais sutil** (token de opacidade/espessura). — *`divide-y divide-border/50`.*

### 4.3 Sidebar colapsável (avaliação)

- [x] Em **telas grandes** (breakpoint `lg+` ou o definido no PR), sidebar **colapsável** com **ícones** para seções principais. — *`AppSidebar` + `collapsible="icon"` (shadcn).*
- [x] Estado colapsado/expandido **persistido** (localStorage ou Zustand + persist — documentar escolha). — *Cookie `sidebar:state` (7 dias) escrito pelo `SidebarProvider`; **`MainLayout` lê o cookie** em `defaultOpen` para restaurar ao carregar.*
- [x] **Coexistência com mobile:** `BottomNav` ou padrão atual preservado; sidebar não quebra layout em `sm`/`md` (comportamento explícito: oculta vs. drawer). — *Sidebar `null` no mobile (componente `Sidebar`); navegação via `BottomNav`.*

### 4.4 Header do dashboard

- [x] Saudação dinâmica: **“Bom dia / Boa tarde / Boa noite, [nome]”** — regra de faixa horária e timezone documentadas (cliente ou dado do usuário). — *`AppHeaderCenter`: faixas 5–12 / 12–18 / restante; **timezone = relógio local do navegador** (`Date`).*
- [x] **Seletor de período** (ex.: mês atual) integrado ao estado que filtra ou refaz fetch dos dados dependentes. — *`dateRange` + `setDateRange` na `useFinancialStore`; seletor ←/→ mês; KPIs “do mês” e donut de categorias no dashboard usam o mesmo período; **não** forçar “mês atual” ao montar o dashboard (evita sobrescrever a escolha do usuário).*
- [x] **Avatar** com **menu dropdown** (mínimo: perfil/ajustes se existirem, saída). — *`AppHeaderUserMenu`: Configurações (`/settings`) + Sair.*

**Entrega sugerida:** PRs separados — header/período; sidebar; metas + lista transações (conforme acoplamento no código).

---

## 5. Fase 4 — Modais, fluxos secundários, polimento

### 5.1 Modal — adicionar transação

- [x] **Duas colunas** em desktop; **uma coluna** em mobile. — *`TransactionFields` + `TransactionForm` (`lg:grid-cols-2`, `lg:max-w-4xl`).*
- [x] Seletor de **categoria visual** (ícones). — *`CategoryVisualPicker`.*
- [x] Valor em destaque com **`CurrencyInput`** (centavos).
- [x] **Date picker** integrado ao fluxo do formulário. — *Popover + `Calendar` + `date-fns`.*
- [x] Ao salvar: estado de **loading** no botão + **toast** (sucesso/erro) via Sonner ou padrão atual. — *sucesso: `sonner`; erros: `useToast`.*

### 5.2 Modal — importar extrato

- [x] Área **drag-and-drop** + input de arquivo como fallback. — *`BankImportDialog`.*
- [x] **Preview** das linhas interpretadas **antes** da confirmação final.
- [x] **Barra ou etapas de progresso** durante processamento; erros com mensagem acionável.
- [x] **Backend:** validação de tipo/tamanho do arquivo, limites e logging sem dados sensíveis em excesso. — *`POST /transactions/import/validate` (multipart): extensão `.csv`/`.txt`, máx. 5 MB, log estruturado com `user_id`, tamanho, `content_type`, sufixo do nome — **sem corpo do arquivo**; frontend chama `validateBankImportFile` antes do parse quando `navigator.onLine`.*

### 5.3 Tela de Metas — redesign

- [x] Cada meta em **card** com anel/barra de progresso, **valor acumulado vs. meta** (R$), **prazo**. — *`GoalProgressRing` + cards em `Goals.tsx`.*
- [x] **Contribuição rápida** com validação backend e centavos no frontend. — *`AddGoalValueForm` (CTA “Contribuir rápido”).*

### 5.4 Tela de Relatórios

- [x] **Filtros** superiores: período e categoria (mínimo).
- [x] Gráficos **expansíveis** (padrão único: acordeão ou modal fullscreen — registrar na implementação). — *`Collapsible` / chevron em `Reports.tsx`.*
- [x] **Exportação** PDF/Excel (ou MVP documentado: apenas CSV/Excel servidor) com controle visível **somente** se a funcionalidade existir de ponta a ponta. — *CSV via `downloadReportsCsv` + `API_ENDPOINTS.reports.export`; filtro de categoria só na UI (texto de ajuda na página).*

### 5.5 Micro-interações (transversal)

- [x] Transições leves entre rotas ou seções principais (sem bloquear interação). — *`key={location.pathname}` + `motion-safe:animate-in` no `Outlet` em `main-layouts.tsx`.*
- [x] **Skeletons** nos blocos principais durante loading inicial. — *Dashboard (reidratação); demais telas conforme dados já síncronos da store.*
- [x] Toasts para ações de usuário; evitar toast em todo refetch automático. — *mantido em fluxos de escrita/export; sem novo em refetch genérico.*
- [x] Animações em gráficos na carga respeitam `prefers-reduced-motion`. — *`usePrefersReducedMotion` + `isAnimationActive={!reduceMotion}` em `dashboard.tsx` (Area, Pie), `Reports.tsx` (Bar, Pie), `Trends.tsx` (Line, Area).*

---

## 6. Riscos, dependências e decisões técnicas

| Item | Nota |
|------|------|
| Sparkline | Preferir uma query agregada ou reutilizar dados já carregados para evitar N+1 |
| Tooltip só com hover | Complementar com dados em legenda ou texto quando viável |
| Export | Se backend não pronto, remover botão da UI até SPEC/PRD do MVP de export |
| Sidebar | Feature flag opcional para rollout gradual |

Registrar decisões que alterem esta lista na seção **Histórico** abaixo.

---

## 7. Checklist final antes de encerrar a iniciativa

- [ ] Todas as fases pretendidas marcadas como atendidas ou explicitamente adiadas com atualização no PRD.
- [ ] Nenhum escopo extra sem revisão do PRD.
- [ ] Validação backend nos fluxos de escrita/import/export alterados.
- [ ] Evidências de QA (prints ou lista de cenários) anexadas ao PR final ou wiki do time.

---

## 8. Histórico de mudanças

| Versão | Data | Notas |
|--------|------|--------|
| 1.0 | 2026-03-27 | Versão inicial da SPEC alinhada à proposta em 4 fases |
| 1.1 | 2026-03-27 | Fase 1 implementada: `Auth.tsx`, `FloatingField`, `AuthDashboardPreview`, tokens de input em `index.css` / `input.tsx`, animação `auth-preview-drift` no Tailwind |
| 1.2 | 2026-03-27 | Fase 2: `FinancialCard` + `Sparkline`, `kpiSeries` (30 dias) em `dashboard.tsx`, fluxo de caixa (área maior, cores, legenda, tooltip), `CategorySpendingEmpty` |
| 1.3 | 2026-03-27 | Fase 4: transação (`CategoryVisualPicker`, layout 2 col., date picker, Sonner no sucesso), import (`BankImportDialog` drag-drop + etapas), metas (anel + contribuição rápida), relatórios (filtros, collapsible, CSV servidor), layout (`main-layouts` transição), skeleton do dashboard na reidratação; `Reports.tsx` correção `SelectContent` |
| 1.4 | 2026-03-27 | Fase 3: dashboard metas/transações; `AppHeaderBar` (saudação, período, menu conta); leitura inicial `sidebar:state`; `POST /transactions/import/validate`; Recharts + `prefers-reduced-motion`; `GoalProgressRing` compartilhado |

### Sparkline / saldo — nota técnica (§3.2)

- **Receitas / despesas / economia:** somatório por dia civil nos últimos 30 dias, na ordem antiga → recente.
- **Saldo total (série):** assume-se que `getTotalBalance()` reflete o saldo após o último dia da janela; dias anteriores são obtidos subtraindo o fluxo líquido dia a dia retroativamente (aproximação quando há saldo inicial fora do período não modelado nas transações).
