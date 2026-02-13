# Ideias de automações para o Vai de Pix

Este documento reúne sugestões de automações para o usuário aproveitar melhor o sistema: o que já existe, o que falta ativar e novas ideias para implementar.

---

## O que já existe hoje

| Tipo | Descrição | Status no backend |
|------|-----------|-------------------|
| **Transação recorrente** | Criar receita/despesa em intervalo (diário, semanal, mensal, anual) | ✅ Implementado no `recurring_job.py` (executa a cada hora) |
| **Alerta de orçamento** | Avisar quando categoria ultrapassar limite | ⚠️ Tipo existe na UI/API, **não há job que avalie ou notifique** |
| **Lembrete de meta** | Lembrete relacionado a metas (goals) | ⚠️ Tipo existe na UI/API, **não há job que avalie ou notifique** |
| **Webhook** | Disparar URL externa | ⚠️ Tipo existe, **não há execução automática** |

Ou seja: hoje só **transação recorrente** é de fato executada. Os outros tipos podem ser criados na tela de Automações, mas nenhum processo em background os utiliza.

---

## 1. Completar o que já está desenhado

### 1.1 Alerta de orçamento (budget_alert)

- **Objetivo:** Avisar o usuário quando o gasto em uma categoria (ex.: Alimentação) no período (mês atual) ultrapassar um valor configurado.
- **Como:** Job periódico (ex.: 1x por dia) que:
  - Para cada regra ativa do tipo `budget_alert`, pega `category_id` e `amount` (limite) das conditions.
  - Soma transações da categoria no mês atual (tipo expense).
  - Se soma > limite → dispara notificação (in-app e/ou email, quando existir).
- **Dados já na regra:** `conditions.category`, `conditions.amount`; dá para usar `conditions.trigger` como "monthly" para definir o período.

### 1.2 Lembrete de meta (goal_reminder)

- **Objetivo:** Lembrar de contribuir para uma meta (goal), principalmente quando a data está próxima ou o progresso está atrasado.
- **Como:** Job periódico que:
  - Para cada regra ativa do tipo `goal_reminder`, obtém a meta vinculada (ex.: `conditions.goal_id`).
  - Verifica `target_date`, `current_amount`, `target_amount` e status (`at_risk`, `overdue`, etc.).
  - Se meta em risco, próxima do vencimento ou sem contribuição há X dias → dispara lembrete.
- **Extensão:** Opção de lembrete “Meta atingida” para celebrar quando `current_amount >= target_amount`.

### 1.3 Webhook

- **Objetivo:** Permitir integrações (Telegram, Discord, Zapier, IFTTT, etc.).
- **Como:** 
  - Em eventos escolhidos (ex.: transação recorrente executada, alerta de orçamento, lembrete de meta), chamar a URL configurada em `actions.url` com um payload JSON (ex.: tipo de evento, valor, categoria, data).
  - Ou job que, em horários configurados, envia resumo (totais do mês, alertas) para o webhook.

---

## 2. Automações novas (alto valor para o usuário)

### 2.1 Resumo periódico (semanal / mensal)

- **Objetivo:** Usuário receber um resumo sem esforço: totais de receita/despesa, saldo das contas, metas e envelopes, alertas.
- **Como:** 
  - Nova regra tipo `periodic_summary` com `conditions.frequency`: "weekly" ou "monthly" e `conditions.weekday` ou `conditions.day`.
  - Job gera o resumo (pode reusar lógica do dashboard/relatórios) e envia por notificação in-app e, quando houver, email.
- **Benefício:** Aumenta reengajamento e visibilidade da saúde financeira sem o usuário precisar abrir o app todo dia.

### 2.2 Alerta de saldo baixo (conta)

- **Objetivo:** Avisar quando o saldo de uma conta ficar abaixo de um valor definido (ex.: conta corrente < R$ 500).
- **Como:** 
  - Tipo `low_balance_alert`: `conditions.account_id`, `conditions.min_balance`.
  - Job diário (ou após cada transação, se quiser tempo real) compara `Account.balance` com o mínimo e dispara notificação.
- **Benefício:** Evita surpresas e cheque especial.

### 2.3 Transferência automática entre contas

- **Objetivo:** Ex.: “Todo dia 5, transferir R$ 500 da conta corrente para a poupança.”
- **Como:** 
  - Tipo `recurring_transfer`: conta origem, conta destino, valor, frequência e dia (ou dia do mês).
  - O mesmo job de transações recorrentes (ou um job dedicado) cria duas transações: uma saída na origem e uma entrada no destino, na mesma data.
- **Benefício:** Automatiza a “poupança programada” e organização entre contas.

### 2.4 Distribuição automática para envelopes

- **Objetivo:** Quando cair uma receita (ex.: salário), distribuir valores fixos em envelopes (Alimentação R$ 800, Transporte R$ 300, etc.).
- **Como:** 
  - Regra tipo `envelope_distribution`: disparada por “transação de receita” em categoria/conta específica (ex.: Salário) ou por data recorrente.
  - Ações: lista de `{ envelope_id, amount }`. O job cria a receita (se for por data) ou apenas as “movimentações” nos envelopes e, se o sistema tiver débito em conta, as transações correspondentes.
- **Benefício:** Método envelope fica prático mesmo com várias categorias.

### 2.5 Lembrete de despesas compartilhadas pendentes

- **Objetivo:** Quem deve repassar valor em uma despesa compartilhada recebe lembrete (ex.: “Você deve R$ 50 para João no churrasco.”).
- **Como:** 
  - Job periódico que lista despesas compartilhadas com status “pending” e participantes que ainda não quitaram.
  - Para cada um, dispara notificação in-app (e email, se existir), ou envia para webhook (Telegram/Discord) com link para a tela de despesas compartilhadas.
- **Benefício:** Menos esquecimento e cobranças manuais.

### 2.6 Lembrete de “fechamento de cartão” ou contas a pagar

- **Objetivo:** Lembrar de pagar fatura do cartão ou contas com vencimento (ex.: todo dia 10).
- **Como:** 
  - Tipo `bill_reminder`: conta (ex.: cartão), valor estimado ou fixo, dia de vencimento, opcionalmente categoria.
  - Job diário verifica “amanhã é dia X” ou “hoje é dia X” e envia lembrete.
- **Benefício:** Menos juros e multas por atraso.

### 2.7 Regra “se ultrapassar X em categoria, alertar”

- **Objetivo:** Similar ao budget_alert, mas com foco em um único gatilho: “Se gastar mais de R$ X na categoria Y neste mês, avisar na hora (ou no próximo job).”
- **Como:** Pode ser uma variante de `budget_alert` (só garantir que o job de budget_alert rode e notifique) ou um tipo específico com mensagem customizada.
- **Benefício:** Controle fino por categoria sem precisar definir “teto mensal” para tudo.

### 2.8 Notificações in-app e (futuro) email / push

- **Objetivo:** Todas as automações acima precisam de um canal para chegar ao usuário.
- **Sugestão:** 
  - **Fase 1:** Tabela `notifications` (user_id, type, title, body, read_at, created_at). O job só insere o registro; o front exibe um sino com contador e lista de notificações.
  - **Fase 2:** Configuração “Receber resumos/alertas por email” (SMTP já está no .env.example). Enviar email nos eventos de alerta e resumo.
  - **Fase 3:** Push (PWA ou app nativo) para alertas críticos (saldo baixo, orçamento estourado).
- **Benefício:** Automações passam a ser úteis no dia a dia, não só “regras salvas”.

---

## 3. Priorização sugerida

| Prioridade | Automação | Motivo |
|------------|-----------|--------|
| 1 | Notificações in-app (tabela + sino no front) | Base para qualquer alerta/lembrete |
| 2 | Fazer o **budget_alert** rodar e notificar | Tipo já existe; falta só o job e o canal |
| 3 | Fazer o **goal_reminder** rodar e notificar | Mesmo caso |
| 4 | **Resumo periódico** (semanal/mensal) | Alto impacto em engajamento |
| 5 | **Alerta de saldo baixo** | Simples e muito útil |
| 6 | **Transferência automática** entre contas | Muito pedido em apps financeiros |
| 7 | **Webhook** com payload bem definido | Abre integrações sem implementar cada canal |
| 8 | Lembrete **despesas compartilhadas** | Diferencial para quem divide contas |
| 9 | **Distribuição para envelopes** | Diferencial para quem usa envelope |
| 10 | Lembrete **contas a pagar / cartão** | Complemento ao fluxo de despesas |

---

## 4. Resumo

- **Hoje:** Só transação recorrente é executada; budget_alert, goal_reminder e webhook existem na UI/API mas não têm execução automática.
- **Próximos passos que mais agregam:**  
  1) Canal de notificação in-app;  
  2) Ligar os jobs de budget_alert e goal_reminder a esse canal;  
  3) Resumo periódico e alerta de saldo baixo;  
  4) Transferência automática e webhook;  
  5) Lemientes e distribuição para envelopes/despesas compartilhadas.

Se quiser, podemos detalhar a implementação (modelo de dados, endpoints e fluxo do job) de uma dessas automações primeiro — por exemplo, notificações in-app + budget_alert.
