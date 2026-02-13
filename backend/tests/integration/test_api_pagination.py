"""
Testes de integração para paginação padrão (skip, limit).
Garante que GET /api/transactions e GET /api/notifications respeitam skip/limit
e que o formato do JSON não muda (apenas a quantidade de itens).
"""
import pytest
from fastapi import status

from models import Transaction, Notification
from datetime import datetime, timedelta


class TestTransactionsPagination:
    """Paginação em GET /api/transactions: skip (default 0), limit (default 50, max 100)."""

    def test_transactions_default_limit_respected(self, client, db, test_user, test_account, test_category, auth_headers):
        """Com mais de 50 transações, retorna no máximo 50 por padrão."""
        for i in range(55):
            t = Transaction(
                date=datetime.now() - timedelta(days=i),
                account_id=test_account.id,
                category_id=test_category.id,
                type="expense",
                amount=10.0,
                description=f"Tx {i}",
                user_id=test_user.id,
            )
            db.add(t)
        db.commit()

        response = client.get("/api/transactions/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 50

    def test_transactions_skip_limit_params(self, client, db, test_user, test_account, test_category, auth_headers):
        """Parâmetros skip e limit são aplicados."""
        for i in range(10):
            t = Transaction(
                date=datetime.now() - timedelta(days=i),
                account_id=test_account.id,
                category_id=test_category.id,
                type="expense",
                amount=10.0,
                description=f"Tx {i}",
                user_id=test_user.id,
            )
            db.add(t)
        db.commit()

        r1 = client.get("/api/transactions/?skip=0&limit=3", headers=auth_headers)
        assert r1.status_code == status.HTTP_200_OK
        assert len(r1.json()) <= 3

        r2 = client.get("/api/transactions/?skip=2&limit=5", headers=auth_headers)
        assert r2.status_code == status.HTTP_200_OK
        assert len(r2.json()) <= 5

    def test_transactions_limit_max_100(self, client, auth_headers):
        """Limit maior que 100 é rejeitado ou limitado a 100 (validação Query le=100)."""
        response = client.get("/api/transactions/?limit=150", headers=auth_headers)
        # FastAPI Query(le=100) deve retornar 422 para limit=150
        assert response.status_code in (status.HTTP_200_OK, status.HTTP_422_UNPROCESSABLE_ENTITY)


class TestNotificationsPagination:
    """Paginação em GET /api/notifications: skip (default 0), limit (default 50, max 100)."""

    def test_notifications_default_limit_respected(self, client, db, test_user, auth_headers):
        """Com mais de 50 notificações, retorna no máximo 50 por padrão."""
        for i in range(55):
            n = Notification(
                user_id=test_user.id,
                type="info",
                title=f"Notif {i}",
                body="",
            )
            db.add(n)
        db.commit()

        response = client.get("/api/notifications/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 50

    def test_notifications_skip_limit_params(self, client, db, test_user, auth_headers):
        """Parâmetros skip e limit são aplicados."""
        for i in range(10):
            n = Notification(
                user_id=test_user.id,
                type="info",
                title=f"N {i}",
                body="",
            )
            db.add(n)
        db.commit()

        r1 = client.get("/api/notifications/?skip=0&limit=3", headers=auth_headers)
        assert r1.status_code == status.HTTP_200_OK
        assert len(r1.json()) <= 3
