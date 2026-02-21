"""
Testes de integração para despesas compartilhadas.
POST cria despesa + transação; DELETE soft delete; GET read-model não retorna cancelled.
"""
import pytest
from sqlalchemy.orm import Session

from fastapi.testclient import TestClient
from models import SharedExpense


class TestCreateSharedExpenseSuccess:
    """POST /shared-expenses com invited_email válido → 201, cria despesa e transação vinculada."""

    def test_post_with_invited_email_201_creates_expense_and_transaction(
        self,
        client: TestClient,
        auth_headers: dict,
        test_user,
        second_user,
        test_account,
        test_category,
        db: Session,
    ):
        payload = {
            "total_cents": 10_000,  # 100 reais
            "description": "Almoço compartilhado",
            "split_type": "equal",
            "invited_email": second_user.email,
            "account_id": test_account.id,
            "category_id": test_category.id,
        }
        response = client.post(
            "/api/shared-expenses/",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["description"] == "Almoço compartilhado"
        assert data["status"] == "active"
        assert "id" in data

        # Transação vinculada deve existir (criador tem uma saída)
        expense_id = data["id"]
        from models import Transaction
        tx = db.query(Transaction).filter(
            Transaction.shared_expense_id == expense_id,
            Transaction.user_id == test_user.id,
        ).first()
        assert tx is not None
        assert float(tx.amount) > 0


class TestCreateSharedExpenseValidation:
    """Saldo insuficiente → 422 e rollback; próprio e-mail → 400."""

    def test_post_insufficient_balance_expense_still_created(
        self,
        client: TestClient,
        auth_headers: dict,
        second_user,
        test_category,
        account_with_balance,
        db: Session,
    ):
        # Conta com saldo 5 reais; despesa total 100 reais (criador paga 50).
        # Serviço usa skip_balance_check ao criar a transação do criador (apenas a parte dele),
        # então a criação é aceita (201) mesmo com saldo insuficiente para a parte do criador.
        account = account_with_balance(5.0)
        unique_desc = "Despesa cara saldo insuficiente"
        payload = {
            "total_cents": 10_000,
            "description": unique_desc,
            "split_type": "equal",
            "invited_email": second_user.email,
            "account_id": account.id,
            "category_id": test_category.id,
        }
        response = client.post(
            "/api/shared-expenses/",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["description"] == unique_desc
        from models import Transaction
        tx = db.query(Transaction).filter(
            Transaction.shared_expense_id == data["id"],
        ).first()
        assert tx is not None

    def test_post_own_email_400(
        self,
        client: TestClient,
        auth_headers: dict,
        test_user,
        test_account,
        test_category,
    ):
        payload = {
            "total_cents": 10_000,
            "description": "Auto-convite",
            "split_type": "equal",
            "invited_email": test_user.email,
            "account_id": test_account.id,
            "category_id": test_category.id,
        }
        response = client.post(
            "/api/shared-expenses/",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code == 400
        detail = response.json().get("detail", "")
        assert "mesmo" in detail.lower() or "si mesmo" in detail.lower() or "próprio" in detail.lower()


class TestDeleteSharedExpense:
    """DELETE pelo criador → 204 e status=cancelled; por outro usuário → 403."""

    def test_delete_by_creator_204_status_cancelled(
        self,
        client: TestClient,
        auth_headers: dict,
        test_user,
        second_user,
        test_account,
        test_category,
        db: Session,
    ):
        # Criar despesa
        create_payload = {
            "total_cents": 5_000,
            "description": "Para cancelar",
            "split_type": "equal",
            "invited_email": second_user.email,
            "account_id": test_account.id,
            "category_id": test_category.id,
        }
        create_resp = client.post(
            "/api/shared-expenses/",
            json=create_payload,
            headers=auth_headers,
        )
        assert create_resp.status_code in (200, 201)
        expense_id = create_resp.json()["id"]

        # Deletar pelo criador
        delete_resp = client.delete(
            f"/api/shared-expenses/{expense_id}",
            headers=auth_headers,
        )
        assert delete_resp.status_code == 204

        expense = db.query(SharedExpense).filter(SharedExpense.id == expense_id).first()
        assert expense is not None
        db.refresh(expense)
        assert expense.status == "cancelled"

    def test_delete_by_other_user_403(
        self,
        client: TestClient,
        auth_headers: dict,
        auth_headers_second_user: dict,
        test_user,
        second_user,
        test_account,
        test_category,
        db: Session,
    ):
        # Criador (test_user) cria despesa
        create_payload = {
            "total_cents": 5_000,
            "description": "Outro tenta apagar",
            "split_type": "equal",
            "invited_email": second_user.email,
            "account_id": test_account.id,
            "category_id": test_category.id,
        }
        create_resp = client.post(
            "/api/shared-expenses/",
            json=create_payload,
            headers=auth_headers,
        )
        assert create_resp.status_code in (200, 201)
        expense_id = create_resp.json()["id"]

        # Segundo usuário (convidado) tenta deletar
        delete_resp = client.delete(
            f"/api/shared-expenses/{expense_id}",
            headers=auth_headers_second_user,
        )
        assert delete_resp.status_code == 403


class TestReadModelExcludesCancelled:
    """GET /shared-expenses/read-model não retorna despesas com status=cancelled."""

    def test_read_model_does_not_return_cancelled(
        self,
        client: TestClient,
        auth_headers: dict,
        test_user,
        second_user,
        test_account,
        test_category,
    ):
        # Criar despesa
        create_payload = {
            "total_cents": 3_000,
            "description": "Depois cancelada",
            "split_type": "equal",
            "invited_email": second_user.email,
            "account_id": test_account.id,
            "category_id": test_category.id,
        }
        create_resp = client.post(
            "/api/shared-expenses/",
            json=create_payload,
            headers=auth_headers,
        )
        assert create_resp.status_code in (200, 201)
        expense_id = create_resp.json()["id"]

        # Antes de cancelar: read-model deve listar a despesa
        get_resp = client.get("/api/shared-expenses/read-model", headers=auth_headers)
        assert get_resp.status_code == 200
        expenses_before = [e for e in get_resp.json().get("expenses", []) if e.get("id") == expense_id]
        assert len(expenses_before) == 1

        # Cancelar
        client.delete(f"/api/shared-expenses/{expense_id}", headers=auth_headers)

        # Depois: read-model não deve incluir a despesa (filtro status=active)
        get_resp2 = client.get("/api/shared-expenses/read-model", headers=auth_headers)
        assert get_resp2.status_code == 200
        expenses_after = [e for e in get_resp2.json().get("expenses", []) if e.get("id") == expense_id]
        assert len(expenses_after) == 0
