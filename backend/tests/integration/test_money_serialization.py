"""
Testes de integração: serialização monetária enterprise (amount_str).

Valida que a API retorna:
- amount (number) — backward compatibility
- amount_str (string "1234.56") — formato ^\\d+\\.\\d{2}$
- float(amount_str) == amount
- Nenhum valor com mais de 2 casas decimais
- None/caso zero retorna "0.00" sem erro

Endpoints cobertos: /transactions, /accounts, /goals, /envelopes.
"""
import re
import pytest
from datetime import datetime, timedelta
from decimal import Decimal

# Regex exigido: exatamente 2 casas decimais (inteiro ou decimal)
MONEY_STR_REGEX = re.compile(r"^\d+\.\d{2}$")


def _assert_money_str_format(value_str: str, label: str = "value") -> None:
    """Garante que amount_str tem exatamente 2 casas decimais."""
    assert value_str is not None, f"{label} não pode ser None"
    assert isinstance(value_str, str), f"{label} deve ser string"
    assert MONEY_STR_REGEX.match(value_str), (
        f"{label} deve seguir formato ^\\d+\\.\\d{{2}}$ (ex: 1234.56). Recebido: {value_str!r}"
    )


def _assert_amount_consistent(amount: float, amount_str: str, label: str = "amount") -> None:
    """Garante que float(amount_str) == amount (consistência)."""
    _assert_money_str_format(amount_str, label)
    parsed = float(amount_str)
    assert abs(parsed - amount) < 1e-9, (
        f"{label}: float(amount_str) deve ser igual a amount. amount={amount!r} amount_str={amount_str!r} parsed={parsed!r}"
    )


def _assert_no_more_than_two_decimals(value: float) -> None:
    """Garante que valor retornado equivale a no máximo 2 casas decimais (evita drift de float)."""
    rounded = round(value, 2)
    assert abs(value - rounded) < 1e-9, (
        f"Valor monetário deve ser representável com 2 decimais. value={value!r} rounded={rounded!r}"
    )


# --- Transactions ---


@pytest.mark.parametrize(
    "amount",
    [0.01, 10, 10.1, 10.105, 9999999999.99],
    ids=["0.01", "10", "10.1", "10.105_rounding", "9999999999.99"],
)
def test_transaction_amount_str_exists_and_format(client, auth_headers, test_user, test_account, test_category, amount):
    """Transação: amount_str existe, formato ^\\d+\\.\\d{2}$ e float(amount_str)==amount."""
    # Valores altos como receita para não falhar por saldo insuficiente
    tx_type = "income" if amount >= 10_000 else "expense"
    cat_response = client.get("/api/categories", headers=auth_headers)
    assert cat_response.status_code == 200
    categories = cat_response.json()
    cat = next((c for c in categories if c["type"] == tx_type), None)
    if not cat and tx_type == "income":
        create_cat = client.post(
            "/api/categories",
            headers=auth_headers,
            json={"name": "Receita QA", "type": "income", "color": "#22c55e", "icon": "💰"},
        )
        assert create_cat.status_code == 200
        category_id = create_cat.json()["id"]
    else:
        category_id = cat["id"] if cat else test_category.id
    response = client.post(
        "/api/transactions",
        headers=auth_headers,
        json={
            "date": datetime.utcnow().isoformat() + "Z",
            "account_id": test_account.id,
            "category_id": category_id,
            "type": tx_type,
            "amount": amount,
            "description": "QA monetary serialization",
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert "amount" in data
    assert "amount_str" in data, "Campo amount_str obrigatório em resposta de transação"

    _assert_amount_consistent(data["amount"], data["amount_str"], "transaction.amount")
    _assert_no_more_than_two_decimals(data["amount"])


def test_transaction_get_list_includes_amount_str(client, auth_headers, test_user, test_account, test_category):
    """GET /transactions: todos os itens têm amount_str e consistência."""
    # Criar uma transação
    client.post(
        "/api/transactions",
        headers=auth_headers,
        json={
            "date": datetime.utcnow().isoformat() + "Z",
            "account_id": test_account.id,
            "category_id": test_category.id,
            "type": "expense",
            "amount": 123.45,
            "description": "QA list",
        },
    )
    response = client.get("/api/transactions", headers=auth_headers)
    assert response.status_code == 200
    items = response.json()
    assert isinstance(items, list)
    for item in items:
        if "amount" in item:
            assert "amount_str" in item, f"Transação {item.get('id')} sem amount_str"
            _assert_amount_consistent(item["amount"], item["amount_str"], "transaction.amount")


def test_transaction_get_by_id_includes_amount_str(client, auth_headers, test_account, test_category):
    """GET /transactions/{id}: amount_str presente e consistente."""
    create = client.post(
        "/api/transactions",
        headers=auth_headers,
        json={
            "date": datetime.utcnow().isoformat() + "Z",
            "account_id": test_account.id,
            "category_id": test_category.id,
            "type": "income",
            "amount": 99.99,
            "description": "QA get by id",
        },
    )
    assert create.status_code == 200
    tid = create.json()["id"]
    get_resp = client.get(f"/api/transactions/{tid}", headers=auth_headers)
    assert get_resp.status_code == 200
    data = get_resp.json()
    _assert_amount_consistent(data["amount"], data["amount_str"], "transaction.amount")


# --- Accounts ---


def test_account_balance_str_exists_and_format(client, auth_headers, test_user):
    """GET /accounts: balance_str existe e formato correto."""
    response = client.get("/api/accounts", headers=auth_headers)
    assert response.status_code == 200
    accounts = response.json()
    assert isinstance(accounts, list)
    for acc in accounts:
        assert "balance" in acc
        assert "balance_str" in acc, f"Conta {acc.get('id')} sem balance_str"
        _assert_money_str_format(acc["balance_str"], "account.balance_str")
        _assert_amount_consistent(acc["balance"], acc["balance_str"], "account.balance")


def test_account_balance_zero_returns_000(client, auth_headers, test_user):
    """Conta com saldo 0: balance_str deve ser '0.00' (nunca None/erro)."""
    create = client.post(
        "/api/accounts",
        headers=auth_headers,
        json={"name": "Conta Zero", "type": "cash", "balance": 0},
    )
    assert create.status_code == 200
    data = create.json()
    assert data.get("balance") == 0
    assert "balance_str" in data
    assert data["balance_str"] == "0.00", f"Saldo 0 deve serializar como '0.00'. Obtido: {data['balance_str']!r}"


# --- Goals ---


def test_goal_amount_str_exists_and_format(client, auth_headers, test_user):
    """GET /goals: target_amount_str e current_amount_str presentes e no formato."""
    target_date = (datetime.utcnow() + timedelta(days=365)).strftime("%Y-%m-%dT%H:%M:%SZ")
    create = client.post(
        "/api/goals",
        headers=auth_headers,
        json={
            "name": "Meta QA",
            "target_amount_cents": 1000050,
            "target_date": target_date,
            "category": "savings",
            "priority": "medium",
        },
    )
    assert create.status_code == 200
    data = create.json()
    assert "target_amount_str" in data
    assert "current_amount_str" in data
    _assert_amount_consistent(data["target_amount"], data["target_amount_str"], "goal.target_amount")
    # Criação via API sempre inicia com current_amount=0
    _assert_amount_consistent(data["current_amount"], data["current_amount_str"], "goal.current_amount")


def test_goal_current_zero_returns_000(client, auth_headers, test_user):
    """Meta com current_amount 0: current_amount_str deve ser '0.00'."""
    target_date = (datetime.utcnow() + timedelta(days=365)).strftime("%Y-%m-%dT%H:%M:%SZ")
    create = client.post(
        "/api/goals",
        headers=auth_headers,
        json={
            "name": "Meta Zero",
            "target_amount_cents": 100000,
            "target_date": target_date,
            "category": "savings",
            "priority": "low",
        },
    )
    assert create.status_code == 200
    data = create.json()
    assert data.get("current_amount") == 0
    assert data.get("current_amount_str") == "0.00", (
        f"current_amount 0 deve serializar como '0.00'. Obtido: {data.get('current_amount_str')!r}"
    )


# --- Envelopes ---


def test_envelope_amounts_in_cents(client, auth_headers, test_user):
    """Envelopes: balance e target_amount em centavos (integer). Progresso correto."""
    # R$ 50,75 = 5075 centavos, R$ 500,00 = 50000 centavos
    create = client.post(
        "/api/envelopes",
        headers=auth_headers,
        json={
            "name": "Caixinha QA",
            "balance": 5075,
            "target_amount": 50000,
            "color": "#3b82f6",
        },
    )
    assert create.status_code == 200
    data = create.json()
    assert data["balance"] == 5075
    assert data["target_amount"] == 50000
    assert isinstance(data["balance"], int)
    assert isinstance(data["target_amount"], int)
    # progresso = 5075/50000 * 100 = 10.15%
    assert data.get("progress_percentage") is not None
    assert 10.0 <= data["progress_percentage"] <= 10.2


def test_envelope_balance_zero_cents(client, auth_headers, test_user):
    """Envelope com balance 0 centavos."""
    create = client.post(
        "/api/envelopes",
        headers=auth_headers,
        json={"name": "Caixinha Zero", "balance": 0, "color": "#000000"},
    )
    assert create.status_code == 200
    data = create.json()
    assert data.get("balance") == 0
    assert isinstance(data["balance"], int)


# --- Borda: valor máximo ---


def test_transaction_large_amount_serialization(client, auth_headers, test_account, test_category):
    """Transação com valor alto (9999999999.99): amount_str consistente."""
    amount = 9999999999.99
    response = client.post(
        "/api/transactions",
        headers=auth_headers,
        json={
            "date": datetime.utcnow().isoformat() + "Z",
            "account_id": test_account.id,
            "category_id": test_category.id,
            "type": "income",
            "amount": amount,
            "description": "QA large amount",
        },
    )
    assert response.status_code == 200
    data = response.json()
    _assert_amount_consistent(data["amount"], data["amount_str"], "transaction.amount")
    assert data["amount_str"] == "9999999999.99"


# --- Resumo de validações (doc) ---
# 1. amount_str existe quando há valor monetário
# 2. amount_str formato ^\d+\.\d{2}$
# 3. float(amount_str) == amount
# 4. Nenhum valor monetário com mais de 2 casas
# 5. Zero/None serializa como "0.00" (testes account/goal/envelope com 0)
