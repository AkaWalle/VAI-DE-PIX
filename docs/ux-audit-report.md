# UX Audit — VAI-DE-PIX
**Data**: 2026-03-18  
**Telas analisadas**: 23 (11 mobile + 12 desktop)  
**Fonte**: screenshots em `docs/screenshots-prod/` (importados no Figma em `4247lkBNGkw3QSeNoNfNrS`)

## Resumo executivo
- A base visual está **consistente** (dark UI, cards, bordas suaves, ícones coerentes) e a navegação por **BottomNav + Sidebar** é fácil de entender.
- O maior risco de UX hoje é **densidade/competição de CTAs** (principalmente em Transações) e **contraste/legibilidade** de textos secundários no dark mode (WCAG AA pode falhar em partes).
- Em mobile, vale priorizar **touch targets** e reduzir ações destrutivas de alto impacto expostas (ex.: “Apagar todas” ao lado de ações frequentes).
- Várias telas têm “estado vazio” visual, mas faltam **mensagens acionáveis** (o que fazer agora?) e **feedback** mais explícito em ações (sucesso/erro perto do contexto).

## Observações sobre ferramentas / Figma
- O CLI `squirrel` (skill `audit-website`) **não está instalado** no ambiente local, então este audit foi feito por inspeção visual dos screenshots (UI/UX Pro Max guidelines: acessibilidade, touch, hierarquia, feedback, consistência).
- O MCP do Figma disponível no projeto **não expõe ferramenta de “criar comentário”** em frames. Para não travar o fluxo, este relatório inclui um **pacote de anotações por tela** pronto para colar nas caixas “Anotações” que já estão em cada frame no Figma.

## Problemas por tela

### Dashboard
#### 🔴 Críticos
- Textos secundários (cinza) em fundo escuro podem ficar abaixo de **WCAG AA** em trechos (“Visão geral…”, subtítulos) → aumentar contraste (token de texto secundário) ou elevar tamanho/peso.

#### 🟡 Médios
- Cards de métricas têm bordas/cores diferentes (verde/vermelho) mas o significado (bom/ruim) nem sempre é explícito → adicionar **ícone + rótulo** (“Abaixo do esperado”, “Acima do esperado”) para não depender só da cor.
- Gráfico “Fluxo de Caixa” aparece vazio/flat → estado vazio com CTA (“Importe/adicione transações para ver o gráfico”).

#### 🟢 Sugestões
- Considerar “Resumo do mês” com 1 CTA principal (ex.: “Adicionar transação”) para reduzir fricção inicial.

---

### Transações
#### 🔴 Críticos
- Muitas ações no topo (Importar, Exportar, Selecionar Todas, Apagar Todas, Nova Transação) competem por atenção; “Apagar Todas” próximo de ações comuns aumenta risco → mover ações destrutivas para menu “Mais” ou exigir confirmação dupla e separar visualmente.

#### 🟡 Médios
- Filtros ocupam bastante altura no mobile (scroll + densidade) → colapsar filtros em acordeão/“sheet” e manter apenas “Buscar” visível.
- CTA “Nova Transação” é forte (bom), mas poderia ficar fixo (FAB) para listas longas → melhora velocidade de uso.

#### 🟢 Sugestões
- Tornar CTAs mais descritivos (“Importar extrato”, “Exportar dados”) e adicionar helper text curto do que será exportado.

---

### Metas
#### 🔴 Críticos
- (Aferir) Se houver metas com barras/indicadores em cor apenas → garantir que progresso tenha também **texto/percentual**.

#### 🟡 Médios
- Metas em mobile precisam de hierarquia clara entre “Criar meta” e “Ver detalhes” → 1 CTA principal por seção.

#### 🟢 Sugestões
- Mostrar “próxima ação” por meta (ex.: “Aporte recomendado esta semana”).

---

### Caixinhas (Envelopes)
#### 🔴 Críticos
- Ação “transferir” pode ser confundida com “transferência bancária” → rotular como “Transferir entre caixinhas” e explicar no feedback (toast) para reduzir risco de interpretação.

#### 🟡 Médios
- Em telas com muitos valores, usar números tabulares/monoespaçados melhora leitura e evita “pulos” visuais.

#### 🟢 Sugestões
- Oferecer “criar caixinha” em CTA persistente (mobile).

---

### Despesas Compartilhadas
#### 🔴 Críticos
- Fluxos de aceite/recusa e “marcar como pago” são ações sensíveis → exigir confirmação contextual clara e exibir consequências (“isso notifica X”, “isso encerra a despesa”).

#### 🟡 Médios
- Diferença entre “criado por mim” vs “participo” precisa ficar óbvia com chips/segmentos.

#### 🟢 Sugestões
- Mostrar “quem está devendo” em resumo no topo para reduzir navegação.

---

### Pendências
#### 🔴 Críticos
- Se ações primárias forem ícones pequenos (aceitar/recusar) → garantir **touch target ≥ 44×44** e espaçamento ≥ 8px.

#### 🟡 Médios
- Priorizar clareza do que está pendente (convite? pagamento?) com microcopy direta.

#### 🟢 Sugestões
- “Aceitar” em cor primária; “Recusar” como secondary/destructive com separação.

---

### Feed de Atividade
#### 🔴 Críticos
- Itens de feed precisam deixar explícito “o que mudou” e “qual ação posso tomar” → evitar feed “só informativo”.

#### 🟡 Médios
- Se muitos itens, usar agrupamento por data e estado “novos” com badge.

#### 🟢 Sugestões
- Filtros rápidos (“Convites”, “Pagamentos”, “Sistema”).

---

### Relatórios
#### 🔴 Críticos
- Gráficos/legendas: não depender apenas de cor para diferenciar séries → adicionar rótulos/ícones/linhas e contraste suficiente.

#### 🟡 Médios
- Em mobile, relatórios tendem a ficar densos → usar “cards resumidos” + drill-down.

#### 🟢 Sugestões
- Exportar relatório com explicação do formato (“CSV/PDF”) e escopo (“período atual”).

---

### Tendências
#### 🔴 Críticos
- Tendências costumam envolver comparações; se texto secundário estiver baixo contraste, o entendimento cai → reforçar tipografia e contraste.

#### 🟡 Médios
- Mostrar sempre “o que isso significa” (insight) + ação (“reduzir X”, “aumentar Y”).

#### 🟢 Sugestões
- “Por que”/metodologia em tooltip para confiança.

---

### Automações
#### 🔴 Críticos
- Automações são área de risco (ações programadas) → exigir confirmação forte e status claro (ativo/inativo, última execução, próxima execução).

#### 🟡 Médios
- Formular regras com linguagem do usuário (“quando saldo < X”) e preview do efeito.

#### 🟢 Sugestões
- Templates prontos (“alerta de saldo”, “lembrete de conta”).

---

### Configurações
#### 🔴 Críticos
- Se houver opções destrutivas (“Limpar dados”) no mesmo nível de opções comuns → manter em “Zona de Perigo” com separação e confirmação (parece já existir; manter).

#### 🟡 Médios
- “Contas bancárias e cartões” pode sugerir integração bancária → reforçar microcopy (“controle no app, sem movimentação real”).

#### 🟢 Sugestões
- Centralizar “Sobre o app” e disclaimers legais (já adicionado) com link para Termos/Privacidade.

---

### Auth (Desktop)
#### 🔴 Críticos
- Se a tela ainda exibir credenciais de teste em produção → remover (já removido no código, garantir que o deploy está refletindo isso).

#### 🟡 Médios
- Link “Esqueci minha senha” precisa estar visualmente próximo do campo de senha (já está) e com contraste suficiente no dark mode.

#### 🟢 Sugestões
- Texto de privacidade (“não compartilhamos…”) perto do CTA pode aumentar confiança.

---

## Pacote de anotações para colar no Figma (por tela)
> Cole no bloco “Anotações” abaixo de cada frame (Mobile e Desktop).  
> Formato: **Severidade — Problema → Sugestão**

- **Dashboard**: 🟡 Contraste de textos secundários no dark → aumentar contraste/tamanho; 🟢 Estado vazio do gráfico → mensagem + CTA.
- **Transações**: 🔴 “Apagar todas” exposto e próximo de CTAs comuns → mover para menu e reforçar confirmação; 🟡 Filtros densos no mobile → colapsar/abrir em sheet.
- **Metas**: 🟡 Progresso não pode depender só de cor → incluir percentuais/texto; 🟢 CTA principal por seção.
- **Caixinhas**: 🟡 “Transferir” pode parecer bancário → renomear para “Transferir entre caixinhas”; 🟢 números tabulares.
- **Despesas Compartilhadas**: 🟡 Resumo “quem deve” no topo; 🟡 segmentar “criei” vs “participo”.
- **Pendências**: 🔴 Touch targets de aceitar/recusar ≥44×44; 🟡 microcopy do que está pendente.
- **Feed**: 🟡 Agrupar por data; 🟢 filtros rápidos por tipo.
- **Relatórios**: 🟡 Não depender só de cor em gráficos; 🟢 drill-down no mobile.
- **Tendências**: 🟡 “o que significa” + ação recomendada; 🟢 tooltip “por que”.
- **Automações**: 🔴 Status e confirmação fortes; 🟡 preview do efeito.
- **Configurações**: 🟡 reforçar “sem movimentação real” em contas; 🟢 links Termos/Privacidade.
- **Auth**: 🟡 contraste do link “Esqueci minha senha”; 🟢 microcopy de privacidade.

## Status das melhorias (Top 10)

| # | Status |
|---|--------|
| 1 | ✅ feito |
| 2 | ✅ feito |
| 3 | ✅ feito |
| 4 | ✅ feito |
| 5 | ✅ feito |
| 6 | ✅ feito |
| 7 | ✅ feito (já atendida) |
| 8 | ✅ feito |
| 9 | ✅ feito |
| 10 | ✅ feito |

## Top 10 melhorias prioritárias

| # | Tela | Problema | Impacto | Esforço |
|---|------|----------|---------|---------|
| 1 | Transações | 🔴 Ação destrutiva “Apagar todas” muito exposta | Alto (evita perda de dados) | Médio |
| 2 | Mobile (geral) | Touch targets possivelmente < 44×44 em ícones/ações | Alto | Médio |
| 3 | Dashboard | Contraste de texto secundário no dark | Alto (leitura/compreensão) | Baixo |
| 4 | Relatórios/Tendências | Gráficos dependem de cor / baixa legibilidade | Médio–Alto | Médio |
| 5 | Transações | Filtros densos no mobile (scroll e carga cognitiva) | Médio | Médio |
| 6 | Automações | Confirmação + status de execução insuficientes | Alto | Médio |
| 7 | Pendências | Clareza do “o que está pendente” + ações | Médio | Baixo |
| 8 | Caixinhas | “Transferência” pode sugerir banco/OpenFinance | Médio | Baixo |
| 9 | Feed | Falta de ação/next step por item | Médio | Médio |
|10| Configurações | Reforçar “organizador financeiro” em pontos-chave | Médio | Baixo |

## Próximos passos recomendados
1. Ajustar **Transações**: mover ações destrutivas para menu + confirmação; reduzir densidade de filtros (sheet/accordion).
2. Rodar um passe de **acessibilidade**: contraste AA e touch targets (principalmente ícones e BottomNav).
3. Padronizar tokens de cor para identidade (se a marca é **#32BCAD**, alinhar primário e estados).
4. Melhorar **estados vazios** com CTA (“adicione/importe para ver…”).
5. Automações: exibir “próxima execução”, “última execução”, e consequências antes de ativar.

