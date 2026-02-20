# QA: Serialização monetária (amount_str) e smoke test

## Objetivo

Validar, antes do deploy, que a API retorna valores monetários no formato enterprise (`amount_str` string `"1234.56"`) e que `amount` (number) permanece consistente, sem quebrar o contrato atual.

---

## 1. Testes automatizados (pytest)

### Onde

- `backend/tests/integration/test_money_serialization.py`

### Execução

```bash
cd backend
pytest tests/integration/test_money_serialization.py -v
```

Ou com o restante da suíte:

```bash
pytest -v
```

### Validações cobertas

| # | Validação | Onde |
|---|-----------|------|
| 1 | `amount_str` existe quando há valor monetário | Transações, contas, metas, envelopes (GET/POST/PUT) |
| 2 | `amount_str` tem exatamente 2 casas decimais (regex `^\d+\.\d{2}$`) | Todos os recursos com valor |
| 3 | `float(amount_str) == amount` (consistência) | Transações, contas, metas, envelopes |
| 4 | Nenhum valor monetário retornado com mais de 2 casas (equivalente a 2 decimais) | Transações (assert em valor arredondado) |
| 5 | Zero/None serializa como `"0.00"` (nunca erro) | Conta balance 0, meta current_amount 0, envelope balance 0 |
| 6 | Borda: 0.01, 10, 10.1, 10.105 (arredondamento), 9999999999.99 | Transações (parametrizado) |

### Endpoints exercitados

- **Transações**: `POST /api/transactions`, `GET /api/transactions`, `GET /api/transactions/{id}`
- **Contas**: `GET /api/accounts`, `POST /api/accounts`
- **Metas**: `POST /api/goals`, `GET /api/goals` (target_amount_str, current_amount_str)
- **Envelopes**: `POST /api/envelopes`, `GET /api/envelopes` (balance_str, target_amount_str)

---

## 2. Smoke test (script)

### Onde

- `backend/scripts/smoke_money_serialization.py`

### Pré-requisitos

- API rodando (ex.: `uvicorn main:app --reload` em outro terminal).
- Usuário existente (email/senha) com pelo menos uma conta e uma categoria de receita.

### Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `API_BASE_URL` | Não (default: `http://localhost:8000`) | Base da API |
| `SMOKE_EMAIL` | Sim | E-mail do usuário de teste |
| `SMOKE_PASSWORD` | Sim | Senha do usuário |
| `SMOKE_AMOUNT` | Não (default: `77.77`) | Valor da transação criada no smoke |

### Execução

**Linux/macOS:**

```bash
cd backend
export API_BASE_URL=http://localhost:8000
export SMOKE_EMAIL=seu@email.com
export SMOKE_PASSWORD=suasenha
python scripts/smoke_money_serialization.py
```

**Windows (cmd):**

```cmd
cd backend
set API_BASE_URL=http://localhost:8000
set SMOKE_EMAIL=seu@email.com
set SMOKE_PASSWORD=suasenha
python scripts/smoke_money_serialization.py
```

**Windows (PowerShell):**

```powershell
cd backend
$env:API_BASE_URL="http://localhost:8000"
$env:SMOKE_EMAIL="seu@email.com"
$env:SMOKE_PASSWORD="suasenha"
python scripts/smoke_money_serialization.py
```

### O que o smoke test faz

1. Login com `SMOKE_EMAIL` / `SMOKE_PASSWORD`.
2. Obtém primeira conta e uma categoria de receita.
3. Cria uma transação de **receita** com valor `SMOKE_AMOUNT`.
4. Na resposta do create:
   - Verifica presença de `amount_str`.
   - Verifica formato `^\d+\.\d{2}$`.
   - Verifica `float(amount_str) == amount`.
5. Busca a transação por ID e repete a consistência `amount` vs `amount_str`.
6. **Ledger**: obtém conta novamente e verifica que o saldo aumentou exatamente em `SMOKE_AMOUNT`.
7. Verifica `balance_str` da conta quando presente.

Se qualquer assert falhar, o script termina com código 1 e mensagem clara.

---

## 3. Checklist pré-deploy

- [ ] `pytest tests/integration/test_money_serialization.py -v` passa (14 testes).
- [ ] Smoke script executado contra ambiente alvo (staging/local) com usuário real.
- [ ] Nenhuma alteração no contrato da API (campos antigos mantidos; `*_str` opcionais).

---

## 4. Possíveis inconsistências (monitorar)

- **Float drift**: em alguns clientes/linguagens, `amount` (number) pode sofrer arredondamento de ponto flutuante. O campo `amount_str` é a referência para exibição e conciliação; preferir uso de `amount_str` em novos clientes.
- **Idioma/locale**: `amount_str` usa sempre ponto como separador decimal (formato JSON); formatação pt-BR (vírgula) deve ser feita no cliente quando exibir.
- **Valores muito grandes**: Numeric(15,2) suporta até 13 dígitos inteiros + 2 decimais; testes cobrem 9999999999.99.
