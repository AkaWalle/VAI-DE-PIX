# Mapeamento: Produção vs FigJam (VAI-DE-PIX)

**Referência de produto:** https://vai-de-pix.vercel.app/  
**Data do mapeamento:** 17/03/2026  
**Captura:** Desktop 1280×900 (12 telas) e Mobile 390×844 (12 telas). Todas as 12 telas desktop foram capturadas com login real nesta sessão.

---

## 1. Screenshots das telas em produção

Todos os screenshots foram salvos em **`docs/screenshots-prod/`**.

### Desktop (1280×900)

| # | Rota | Arquivo | Descrição |
|---|------|---------|-----------|
| 1 | `/` | `01-dashboard-desktop.png` | Dashboard: saldo total, receitas/despesas do mês, fluxo de caixa, gastos por categoria, progresso metas, transações recentes |
| 2 | `/transactions` | `02-transactions-desktop.png` | Transações: filtros, totais, lista de transações (tabela) |
| 3 | `/goals` | `03-goals-desktop.png` | Metas financeiras: cards de totais, estado vazio "Nenhuma meta criada" |
| 4 | `/envelopes` | `04-envelopes-desktop.png` | Caixinhas: totais alocado/meta/progresso, estado vazio "Nenhuma caixinha criada" |
| 5 | `/shared-expenses` | `05-shared-expenses-desktop.png` | Despesas compartilhadas: cards de totais, estado vazio |
| 6 | `/shared-expenses/pending` | `06-pending-desktop.png` | Pendências de despesas compartilhadas |
| 7 | `/activity-feed` | `07-activity-feed-desktop.png` | Feed de atividade: timeline de convites e atualizações |
| 8 | `/reports` | `08-reports-desktop.png` | Relatórios: período, exportar, fluxo de caixa, despesas por categoria, top categorias |
| 9 | `/trends` | `09-trends-desktop.png` | Tendências: evolução 6 meses, visão anual, tendências por categoria |
| 10 | `/automations` | `10-automations-desktop.png` | Automações: regras (ex.: Salário mensal), toggle ativa/inativa |
| 11 | `/settings` | `11-settings-desktop.png` | Configurações: perfil (nome, email), insights no dashboard, aparência (tema) |
| 12 | `/auth` | `12-auth-desktop.png` | Login/Criar conta: abas Entrar/Criar Conta, email, senha, usuários de teste |

### Mobile (375×812)

| # | Rota | Arquivo | Observação |
|---|------|---------|------------|
| 1 | `/auth` | `12-auth-mobile.png` | Tela de login em viewport mobile |

**Nota:** As demais telas em mobile (Dashboard, Transações, etc.) não foram capturadas nesta sessão; o app em produção usa **BottomNav** e **Sheet “Mais”** no mobile (conforme código em `BottomNav.tsx`).

---

## 2. O que já está implementado em produção

Com base nas rotas e nas capturas:

| Área | Telas / Funcionalidades | Status |
|------|-------------------------|--------|
| **Autenticação** | Login (email + senha), Criar conta, redirecionamento pós-login | ✅ Implementado |
| **Layout** | Sidebar (desktop), BottomNav + Sheet “Mais” (mobile), header com notificações e tema | ✅ Implementado |
| **Dashboard** | Saldo total, receitas/despesas/economia do mês, fluxo de caixa (gráfico), gastos por categoria, progresso metas, transações recentes | ✅ Implementado |
| **Transações** | Lista, filtros (tipo, data), totais (receitas, despesas, saldo), importar/exportar, nova transação | ✅ Implementado |
| **Metas** | Listagem, totais (ativas, atingidas, no ritmo, atenção), estado vazio, nova meta | ✅ Implementado |
| **Caixinhas (Envelopes)** | Listagem, totais (alocado, meta, progresso), estado vazio, nova caixinha, transferir | ✅ Implementado |
| **Despesas compartilhadas** | Listagem, totais, estado vazio, nova despesa | ✅ Implementado |
| **Pendências** | Tela de convites pendentes (aceitar/recusar) | ✅ Implementado |
| **Feed de atividade** | Timeline de convites e atualizações, marcar como lido | ✅ Implementado |
| **Relatórios** | Período, exportar, fluxo de caixa, despesas por categoria, top categorias | ✅ Implementado |
| **Tendências** | Cards de tendência, evolução 6 meses, visão anual, tendências por categoria | ✅ Implementado |
| **Automações** | Lista de regras, ativa/inativa, editar/excluir | ✅ Implementado |
| **Configurações** | Perfil (nome, email), insights no dashboard, tema (claro/escuro) | ✅ Implementado |

**Componentes visuais em uso (para Component Library no Figma):**  
Cards de resumo, tabelas, gráficos (Recharts), botões primário/secundário, inputs, labels, abas, sidebar, bottom nav, sheet, toggles, badges, empty states, avatares.

---

## 3. O que ainda falta (FigJam vs produção)

O **FigJam** descreve um fluxo focado em **Pagamento PIX** (enviar PIX, chaves PIX, histórico de PIX). O **site em produção** é um **controle financeiro pessoal** (transações, metas, caixinhas, despesas compartilhadas, relatórios, etc.), **sem** fluxo de pagamento PIX ponta a ponta.

Portanto, em relação ao mapa do FigJam, o que **não existe** em produção é:

### Fluxo principal — Pagamento PIX

| # | Tela do FigJam | Em produção? | Observação |
|---|----------------|--------------|------------|
| 1 | Splash / Loading | Parcial | Existe loading inicial (PageLoader); não há tela “Splash” dedicada com logo |
| 2 | Login (CPF + senha) | Parcial | Login existe com **email + senha** (não CPF) |
| 3 | Home (saldo + ações rápidas PIX) | Parcial | Dashboard tem saldo e visão geral; **não** tem ações “Pagar PIX”, “Minhas chaves” como no FigJam |
| 4 | Selecionar tipo chave PIX | ❌ | Não existe |
| 5 | Inserir chave PIX do destinatário | ❌ | Não existe |
| 6 | Inserir valor + descrição | ❌ | Não existe (transações genéricas sim; fluxo PIX não) |
| 7 | Confirmação (resumo PIX) | ❌ | Não existe |
| 8 | Autenticação (PIN/biometria) | ❌ | Não existe |
| 9 | Processando pagamento | ❌ | Não existe |
| 10 | Sucesso (comprovante PIX) | ❌ | Não existe |
| 11 | Erro (motivo + ação) | ❌ | Não existe como tela dedicada do fluxo PIX |

### Fluxo secundário — Gerenciar chaves PIX

| # | Tela do FigJam | Em produção? |
|---|----------------|--------------|
| 1 | Lista de chaves cadastradas | ❌ |
| 2 | Adicionar nova chave | ❌ |
| 3 | Confirmação de cadastro | ❌ |
| 4 | Remover chave (com confirmação) | ❌ |

### Fluxo secundário — Histórico (PIX)

| # | Tela do FigJam | Em produção? | Observação |
|---|----------------|--------------|------------|
| 1 | Lista de transações (com filtros) | ✅ | Existe em `/transactions` (transações gerais, não só PIX) |
| 2 | Detalhe da transação (comprovante) | Parcial | Pode existir em transações; **comprovante PIX** dedicado não |

---

## 4. Resumo para aprovação

- **Screenshots:** 12 telas em desktop (01–12) e 1 em mobile (Auth) em **`docs/screenshots-prod/`**. Telas desktop 07–12 (Activity Feed, Relatórios, Tendências, Automações, Configurações, Auth) foram finalizadas nesta sessão.
- **Implementado:** Autenticação, Dashboard, Transações, Metas, Caixinhas, Despesas compartilhadas, Pendências, Feed de atividade, Relatórios, Tendências, Automações, Configurações (layout desktop + mobile com BottomNav).
- **Faltando em relação ao FigJam:** Todo o **fluxo de Pagamento PIX** (seleção de tipo de chave, inserir chave/valor, confirmação, PIN/biometria, processando, sucesso/erro) e o **fluxo de Gerenciar chaves PIX** (lista, adicionar, confirmar, remover). A tela de **histórico** existe como “Transações” genéricas; o que falta é o **detalhe/comprovante no formato PIX**.

---

## 5. Component Library no Figma (referência produção)

Para criar a **Component Library no Figma baseada no que existe em produção**, use como referência:

- **Screenshots** em `docs/screenshots-prod/` para layout e hierarquia visual.
- **Componentes reais** no código: `Button`, `Input`, `Label`, `Card`, `Tabs`, sidebar (`AppSidebar`), `BottomNav`, `Sheet`, toggles, badges, empty states, `FinancialCard`, gráficos (Recharts). Cores e temas em Tailwind (primary, muted, etc.).

A inclusão desses componentes no arquivo Figma “VAI-DE-PIX — Wireframes” pode ser feita por: (1) captura do prod via Playwright MCP (enviar página para o Figma) ou (2) criação manual no Figma a partir dos screenshots e da lista acima.

---

**Próximo passo:** Após sua aprovação, podemos começar a implementar as telas e fluxos que faltam (prioridade conforme você definir).
