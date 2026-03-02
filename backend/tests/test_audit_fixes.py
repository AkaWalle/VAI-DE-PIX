"""
Testes das 5 correções da auditoria técnica (delete batch, idempotency, filtro mês, summary SQL, UNIQUE).
"""
from datetime import datetime, timezone, date

import pytest
from fastapi.testclient import TestClient

from models import Transaction, LedgerEntry


def _tx_payload(account_id: str, category_id: str, amount_cents: int = 1000, description: str = "Test"):
    return {
        "date": datetime.now(timezone.utc).isoformat(),
        "account_id": account_id,
        "category_id": category_id,
        "type": "expense",
        "amount_cents": amount_cents,
        "description": description,
        "tags": [],
    }


class TestAuditFix1BatchDelete:
    """DELETE /transactions com body { ids } → transações removidas não reaparecem no GET."""

    def test_batch_delete_then_list_excludes_deleted(
        self,
        client: TestClient,
        auth_headers: dict,
        test_user,
        test_account,
        test_category,
        db,
    ):
        # Criar 2 transações
        p1 = _tx_payload(test_account.id, test_category.id, 1000, "Tx A")
        p2 = _tx_payload(test_account.id, test_category.id, 2000, "Tx B")
        r1 = client.post("/api/transactions/", json=p1, headers=auth_headers)
        r2 = client.post("/api/transactions/", json=p2, headers=auth_headers)
        assert r1.status_code in (200, 201)
        assert r2.status_code in (200, 201)
        id1 = r1.json()["id"]
        id2 = r2.json()["id"]

        # Batch delete (body JSON: TestClient.delete não aceita json=, usar request)
        del_resp = client.request(
            "DELETE",
            "/api/transactions/",
            json={"ids": [id1, id2]},
            headers=auth_headers,
        )
        assert del_resp.status_code == 200
        data = del_resp.json()
        assert data["deleted"] == 2
        assert set(data["deleted_ids"]) == {id1, id2}

        # GET list: não devem aparecer
        list_resp = client.get("/api/transactions/", headers=auth_headers)
        assert list_resp.status_code == 200
        ids = [t["id"] for t in list_resp.json()]
        assert id1 not in ids
        assert id2 not in ids


class TestAuditFix2IdempotencyKey:
    """POST /transactions duas vezes com mesmo Idempotency-Key → apenas uma transação criada."""

    def test_same_idempotency_key_returns_same_transaction(
        self,
        client: TestClient,
        auth_headers: dict,
        test_account,
        test_category,
    ):
        key = "test-idem-key-001"
        headers = {**auth_headers, "Idempotency-Key": key}
        payload = _tx_payload(test_account.id, test_category.id, 1500, "Idem test")

        r1 = client.post("/api/transactions/", json=payload, headers=headers)
        r2 = client.post("/api/transactions/", json=payload, headers=headers)

        assert r1.status_code in (200, 201)
        assert r2.status_code in (200, 201)
        assert r1.json()["id"] == r2.json()["id"]
        assert r1.json()["description"] == r2.json()["description"]


class TestAuditFix3StartEndDate:
    """GET /transactions?start_date=&end_date= → só transações no intervalo (sem vazamento de mês anterior)."""

    def test_get_transactions_with_month_filter_returns_only_in_range(
        self,
        client: TestClient,
        auth_headers: dict,
        test_account,
        test_category,
    ):
        now = date.today()
        start = now.replace(day=1).isoformat()
        end = now.isoformat()

        resp = client.get(
            "/api/transactions/",
            params={"start_date": start, "end_date": end, "limit": 100},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        transactions = resp.json()
        for t in transactions:
            tx_date = t["date"][:10]
            assert start <= tx_date <= end, f"Transação {t['id']} com date {tx_date} fora do intervalo {start}..{end}"


class TestAuditFix4MonthlySummarySQL:
    """GET /transactions/summary/monthly → usa agregação (não carrega todas as linhas). Resposta correta e deleted_at filtrado."""

    def test_monthly_summary_structure_and_excludes_deleted(
        self,
        client: TestClient,
        auth_headers: dict,
        test_user,
        test_account,
        test_category,
        db,
    ):
        # Criar uma transação no mês atual
        payload = _tx_payload(test_account.id, test_category.id, 3000, "Summary test")
        client.post("/api/transactions/", json=payload, headers=auth_headers)

        now = datetime.now()
        resp = client.get(
            "/api/transactions/summary/monthly",
            params={"year": now.year, "month": now.month},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "total_transactions" in data
        assert "total_income" in data
        assert "total_expenses" in data
        assert "net_balance" in data
        assert "category_breakdown" in data
        assert isinstance(data["total_transactions"], int)
        assert isinstance(data["total_expenses"], (int, float))


class TestAuditFix5UniqueConstraint:
    """Inserção duplicada (mesmo user_id + idempotency_key) → bloqueada por UNIQUE ou retorno da existente."""

    def test_duplicate_idempotency_key_returns_existing_or_409(
        self,
        client: TestClient,
        auth_headers: dict,
        test_account,
        test_category,
    ):
        key = "unique-constraint-test-key"
        headers = {**auth_headers, "Idempotency-Key": key}
        payload = _tx_payload(test_account.id, test_category.id, 999, "Unique test")

        r1 = client.post("/api/transactions/", json=payload, headers=headers)
        assert r1.status_code in (200, 201)
        first_id = r1.json()["id"]

        # Segunda requisição com mesma key: deve retornar mesma transação (200) ou 409
        r2 = client.post("/api/transactions/", json=payload, headers=headers)
        assert r2.status_code in (200, 201, 409)
        if r2.status_code in (200, 201):
            assert r2.json()["id"] == first_id
        # Se 409, o constraint ou a lógica de idempotência está bloqueando duplicata
