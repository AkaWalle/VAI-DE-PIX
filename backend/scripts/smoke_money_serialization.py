#!/usr/bin/env python3
"""
Smoke test: serialização monetária e consistência ledger.

- Cria uma transação (receita)
- Busca a transação e valida amount vs amount_str
- Valida que o saldo da conta reflete a transação (ledger consistente)

Uso:
  export API_BASE_URL=http://localhost:8000
  export SMOKE_EMAIL=seu@email.com
  export SMOKE_PASSWORD=suasenha
  python scripts/smoke_money_serialization.py

Ou com variáveis no Windows:
  set API_BASE_URL=http://localhost:8000
  set SMOKE_EMAIL=...
  set SMOKE_PASSWORD=...
  python scripts/smoke_money_serialization.py
"""
import os
import re
import sys
from datetime import datetime

try:
    import requests
except ImportError:
    print("ERRO: instale requests (pip install requests)")
    sys.exit(1)

# Configuração via ambiente
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000").rstrip("/")
SMOKE_EMAIL = os.getenv("SMOKE_EMAIL")
SMOKE_PASSWORD = os.getenv("SMOKE_PASSWORD")
SMOKE_AMOUNT = float(os.getenv("SMOKE_AMOUNT", "77.77"))

MONEY_STR_REGEX = re.compile(r"^\d+\.\d{2}$")
TIMEOUT = 15


def fail(msg: str) -> None:
    print(f"\n[FALHA] {msg}")
    sys.exit(1)


def main() -> None:
    if not SMOKE_EMAIL or not SMOKE_PASSWORD:
        fail("Defina SMOKE_EMAIL e SMOKE_PASSWORD no ambiente.")

    session = requests.Session()
    session.headers["Content-Type"] = "application/json"

    def req(method, url, **kwargs):
        kwargs.setdefault("timeout", TIMEOUT)
        return session.request(method, url, **kwargs)

    # 1) Login
    login = req(
        "POST",
        f"{API_BASE_URL}/api/auth/login",
        json={"email": SMOKE_EMAIL, "password": SMOKE_PASSWORD},
    )
    if login.status_code != 200:
        fail(f"Login falhou: {login.status_code} - {login.text[:200]}")
    token = login.json().get("access_token")
    if not token:
        fail("Resposta de login sem access_token")
    session.headers["Authorization"] = f"Bearer {token}"

    # 2) Dados necessários
    accounts = req("GET", f"{API_BASE_URL}/api/accounts")
    if accounts.status_code != 200:
        fail(f"GET /api/accounts falhou: {accounts.status_code}")
    acc_list = accounts.json()
    if not acc_list:
        fail("Nenhuma conta encontrada. Crie uma conta antes de rodar o smoke.")
    account = acc_list[0]
    account_id = account["id"]
    balance_before = float(account.get("balance", 0))

    categories = req("GET", f"{API_BASE_URL}/api/categories")
    if categories.status_code != 200:
        fail(f"GET /api/categories falhou: {categories.status_code}")
    cat_list = [c for c in categories.json() if c.get("type") == "income"]
    if not cat_list:
        fail("Nenhuma categoria de receita. Crie uma categoria 'income'.")
    category_id = cat_list[0]["id"]

    # 3) Criar transação
    payload = {
        "date": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "account_id": account_id,
        "category_id": category_id,
        "type": "income",
        "amount": SMOKE_AMOUNT,
        "description": "Smoke test serialização monetária",
    }
    create = req("POST", f"{API_BASE_URL}/api/transactions", json=payload)
    if create.status_code != 200:
        fail(f"POST /api/transactions falhou: {create.status_code} - {create.text[:300]}")

    tx = create.json()
    tx_id = tx.get("id")
    if not tx_id:
        fail("Resposta da transação sem id.")

    # 4) Validar amount_str na resposta do create
    if "amount_str" not in tx:
        fail("Resposta da transação não contém 'amount_str'.")
    amount_str = tx["amount_str"]
    amount = tx.get("amount")
    if amount is None:
        fail("Resposta da transação não contém 'amount'.")

    if not MONEY_STR_REGEX.match(amount_str):
        fail(f"amount_str deve seguir ^\\d+\\.\\d{{2}}$ . Recebido: {amount_str!r}")

    parsed = float(amount_str)
    if abs(parsed - amount) > 1e-9:
        fail(f"Divergência: float(amount_str) != amount. amount={amount!r} amount_str={amount_str!r} parsed={parsed!r}")

    # 5) Buscar transação por ID e revalidar
    get_tx = req("GET", f"{API_BASE_URL}/api/transactions/{tx_id}")
    if get_tx.status_code != 200:
        fail(f"GET /api/transactions/{tx_id} falhou: {get_tx.status_code}")
    tx_get = get_tx.json()
    if "amount_str" not in tx_get:
        fail(f"GET /api/transactions/{{id}} não retornou 'amount_str'.")
    if abs(float(tx_get["amount_str"]) - tx_get["amount"]) > 1e-9:
        fail(
            f"Divergência no GET por id: amount_str={tx_get['amount_str']!r} amount={tx_get['amount']!r}"
        )

    # 6) Consistência ledger: saldo da conta deve ter aumentado com o valor da transação
    accounts_after = req("GET", f"{API_BASE_URL}/api/accounts")
    if accounts_after.status_code != 200:
        fail("GET /api/accounts após transação falhou.")
    acc_after_list = [a for a in accounts_after.json() if a["id"] == account_id]
    if not acc_after_list:
        fail("Conta não encontrada após transação.")
    balance_after = float(acc_after_list[0].get("balance", 0))
    expected_balance = balance_before + SMOKE_AMOUNT
    if abs(balance_after - expected_balance) > 1e-9:
        fail(
            f"Ledger inconsistente: saldo esperado {expected_balance} (antes={balance_before} + {SMOKE_AMOUNT}), "
            f"obtido {balance_after}."
        )

    # 7) Conta deve ter balance_str consistente
    acc_after = acc_after_list[0]
    if "balance_str" in acc_after:
        if abs(float(acc_after["balance_str"]) - balance_after) > 1e-9:
            fail(f"balance_str inconsistente com balance: balance={balance_after} balance_str={acc_after['balance_str']!r}")

    print("[OK] Smoke test serialização monetária e ledger concluído com sucesso.")
    print(f"     Transação {tx_id}: amount={amount} amount_str={amount_str}")
    print(f"     Conta {account_id}: saldo antes={balance_before} depois={balance_after} (delta +{SMOKE_AMOUNT})")


if __name__ == "__main__":
    main()
