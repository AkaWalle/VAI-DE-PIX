# Etapa 1 — Diagnóstico do router reports (sem alterações)

## 1. Quantas rotas existem no router?

**4 rotas:**

| Método | Path | Função |
|--------|------|--------|
| GET | `/summary` | get_financial_summary |
| GET | `/cashflow` | get_cashflow |
| GET | `/categories/summary` | get_category_summary |
| GET | `/export` | export_data |

---

## 2. Quais dependências são usadas?

- **get_db** → `db: Session = Depends(get_db)` em todas as rotas.
- **get_current_user** → `current_user: User = Depends(get_current_user)` em todas as rotas.
- **Query** para parâmetros: `months`, `type_filter` (apenas em categories/summary).

Ordem dos parâmetros nas assinaturas varia (query params primeiro, depois Depends); FastAPI não exige ordem. Padrão já uniforme.

---

## 3. Existe lógica duplicada entre rotas?

- **Sim.** Cálculo do período (`end_date = now.date()` ou `now`, `start_date = end_date - timedelta(days=months*30)`) repetido nas 4 rotas.
- Formato de mês (lista `month_names`, string `"Mmm/yy"`) existe só em cashflow.
- O **ReportRepository** já implementa queries equivalentes a cashflow, category summary e export, mas o **router não usa o repository** — há duplicação entre router e repository.

---

## 4. Existe query repetida?

- **Sim.** Filtro `user_id` + `date >= start_date` em todas.
- Query de cashflow (extract year/month, sum abs amount, group by type) está no router e no repository.
- Query de category summary (join Category, sum, count, group by, order by) idem.
- Export: 5 queries (transactions com joinedload de tags, goals, envelopes, categories, accounts); o repository tem `get_all_user_data` e `get_transactions_for_export` (este sem eager load de tags).

---

## 5. Há cálculos financeiros feitos direto no router?

- **Sim.**
  - **summary:** `total_income = sum(t.amount for t in transactions if t.type == 'income')`, `total_expenses = sum(abs(t.amount) for t in transactions if t.type == 'expense')`, `net_balance = total_income - total_expenses`.
  - **cashflow:** `balance = data['income'] - data['expense']` por mês.
  - **categories/summary:** `percentage = (float(item.total_amount) / total_amount * 100) if total_amount > 0 else 0`.
- Valores vêm do ORM/SQL (float/Decimal); o router usa float na resposta. Não alterar forma de cálculo.

---

## 6. Alguma rota abre transação manual?

- **Não.** Nenhum `db.commit()`, `db.begin()`, etc. Todas as rotas são somente leitura.

---

## 7. Alguma rota usa sessão diferente do padrão?

- **Não.** Todas usam `db: Session = Depends(get_db)`.

---

*Documento gerado antes do refactor. Contrato da API e comportamento devem permanecer idênticos.*
