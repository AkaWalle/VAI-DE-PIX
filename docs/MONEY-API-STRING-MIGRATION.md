# Migração: Valores monetários como string na API (enterprise)

## Objetivo

Padrão enterprise: valores monetários no JSON da API em formato string (`"1234.56"`) em vez de number, evitando perda de precisão e ambiguidade de locale. A mudança foi feita de forma **backward-compatible**: o sistema atual **não quebra**.

---

## O que foi implementado

### 1. Função central (backend)

- **`core/amount_parser.serialize_money(value: Decimal) -> str`**
  - Usa `quantize(Decimal("0.01"))`; **nunca** `float()`.
  - Retorno no formato `"1234.56"` para uso em JSON.
  - Aceita `None` → retorna `"0.00"`.

### 2. Novos campos opcionais nas respostas

Valores numéricos **continuam** nos campos atuais (compatibilidade). Foram adicionados campos **opcionais** com sufixo `_str`:

| Recurso        | Campo(s) antigo(s)     | Novo(s) campo(s) opcional(is)     |
|----------------|------------------------|-----------------------------------|
| Transações    | `amount` (number)      | `amount_str` (string)             |
| Contas        | `balance` (number)     | `balance_str` (string)            |
| Metas         | `target_amount`, `current_amount` | `target_amount_str`, `current_amount_str` |
| Caixinhas     | `balance`, `target_amount` | `balance_str`, `target_amount_str` |

- **Frontend atual**: continua usando apenas `amount`, `balance`, etc. (number). Nenhuma alteração obrigatória.
- **Novos clientes**: podem passar a usar os campos `*_str` e, quando estável, migrar para só string (fase futura).

### 3. O que **não** foi alterado

- **Contrato de request**: body continua aceitando `amount` (e demais valores) como **number**.
- **Campos numéricos nas respostas**: seguem existindo e com o mesmo tipo (number).
- **Tipagens TypeScript**: não é necessário mudar tipos; `amount_str` pode ser opcional (`string | undefined`).
- **Testes existentes**: continuam válidos ao assertar nos campos numéricos.

---

## Impacto

| Aspecto              | Efeito |
|----------------------|--------|
| Frontend atual       | Nenhum. Continua lendo `amount`, `balance`, etc. |
| Testes atuais        | Nenhum. Respostas ganham campos extras, não removem os atuais. |
| Tipagem TS           | Opcional: adicionar `amount_str?: string` onde quiser usar. |
| Tamanho do payload   | Aumento pequeno (um campo string a mais por valor monetário). |
| Breaking change      | **Nenhum.** Não remoção, não mudança de tipo dos campos existentes. |

---

## Riscos e mitigação

| Risco | Mitigação |
|-------|------------|
| Cliente antigo ignora `_str` e continua usando number | Comportamento esperado; compatibilidade mantida. |
| Cliente novo usa só `_str` e algum endpoint não envia | Campos `_str` são opcionais; fallback para o número quando necessário. |
| Confusão sobre qual campo usar | Documentar: “Prefira `*_str` para novo código; `amount`/`balance` mantidos para compatibilidade.” |

---

## Estratégia de transição segura (fases futuras)

1. **Fase atual (concluída)**  
   - Backend passa a enviar `amount_str`, `balance_str`, etc.  
   - Frontend não precisa mudar.

2. **Fase opcional (frontend)**  
   - Onde fizer sentido, passar a ler `amount_str` (ou `balance_str`, etc.) e usar como fonte da verdade.  
   - Manter fallback para o número: `const value = res.amount_str ?? String(res.amount)` (ou parsing local).

3. **Fase futura (após todos os clientes migrarem)**  
   - Avaliar remover os campos numéricos das respostas e enviar **apenas** os `*_str`.  
   - Isso seria **breaking**; exigiria versionamento de API (ex.: `/v2/`) ou anúncio com prazo.

4. **Request (body)**  
   - Continuar aceitando number; quando estável, considerar aceitar **também** string (ex.: `"1234.56"`) e documentar que string é o formato preferido.

---

## Onde os campos _str foram adicionados

- **Transações**: `GET /api/transactions/`, `GET /api/transactions/{id}`, `POST`, `PUT` → `amount_str`
- **Contas**: `GET /api/accounts/`, `POST`, `PUT` → `balance_str`
- **Metas**: `GET /api/goals/`, `GET /api/goals/{id}`, `POST`, `PUT` → `target_amount_str`, `current_amount_str`
- **Caixinhas**: `GET /api/envelopes/`, `POST`, `PUT` → `balance_str`, `target_amount_str`

Endpoints que retornam listas (reports, privacy export, shared_expenses, etc.) podem ser enriquecidos com `*_str` em uma próxima etapa, seguindo o mesmo padrão.

---

## Exemplo de resposta (transação)

```json
{
  "id": "...",
  "amount": 1234.56,
  "amount_str": "1234.56",
  "description": "...",
  ...
}
```

- Cliente antigo: usa `amount` (1234.56).  
- Cliente novo: pode usar `amount_str` ("1234.56") e evitar float no JS.

---

## Referência de código

- Serialização: `backend/core/amount_parser.py` → `serialize_money()`.
- Uso nas respostas: routers em `backend/routers/` (transactions, accounts, goals, envelopes) via helpers `_transaction_to_response`, `_account_to_response`, etc.
