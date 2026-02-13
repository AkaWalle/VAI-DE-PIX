"""
Testes para a API de notificações in-app.
Garante que listagem, contagem e marcar como lida funcionam sem quebrar o resto do sistema.
"""
import pytest
from fastapi import status

from models import Notification, User
from auth_utils import get_password_hash


class TestNotificationsAPI:
    """Testes das rotas de notificações."""

    def test_list_notifications_empty(self, client, auth_headers):
        """Lista vazia quando não há notificações."""
        response = client.get("/api/notifications/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_list_notifications_with_data(self, client, db, test_user, auth_headers):
        """Lista notificações do usuário."""
        n1 = Notification(
            user_id=test_user.id,
            type="budget_alert",
            title="Orçamento estourado",
            body="Alimentação passou do limite.",
        )
        n2 = Notification(
            user_id=test_user.id,
            type="goal_reminder",
            title="Meta próxima do vencimento",
            body="Meta Viagem em 10 dias.",
        )
        db.add(n1)
        db.add(n2)
        db.commit()

        response = client.get("/api/notifications/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2
        titles = {x["title"] for x in data}
        assert "Orçamento estourado" in titles
        assert "Meta próxima do vencimento" in titles
        for item in data:
            assert "id" in item
            assert "type" in item
            assert "title" in item
            assert "created_at" in item
            assert item["read_at"] is None

    def test_unread_count(self, client, db, test_user, auth_headers):
        """Contagem de não lidas está correta."""
        response = client.get("/api/notifications/unread-count", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["count"] == 0

        n1 = Notification(
            user_id=test_user.id,
            type="info",
            title="Uma notificação",
            body="Corpo",
        )
        db.add(n1)
        db.commit()

        response = client.get("/api/notifications/unread-count", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["count"] == 1

    def test_get_notification_by_id(self, client, db, test_user, auth_headers):
        """Obtém uma notificação específica."""
        n = Notification(
            user_id=test_user.id,
            type="low_balance",
            title="Saldo baixo",
            body="Conta Corrente abaixo de R$ 500.",
        )
        db.add(n)
        db.commit()
        db.refresh(n)

        response = client.get(f"/api/notifications/{n.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == n.id
        assert data["title"] == "Saldo baixo"
        assert data["type"] == "low_balance"

    def test_mark_notification_read(self, client, db, test_user, auth_headers):
        """Marca uma notificação como lida."""
        n = Notification(
            user_id=test_user.id,
            type="info",
            title="Ler isto",
            body="Texto",
        )
        db.add(n)
        db.commit()
        db.refresh(n)
        assert n.read_at is None

        response = client.patch(
            f"/api/notifications/{n.id}/read",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["read_at"] is not None

    def test_mark_all_read(self, client, db, test_user, auth_headers):
        """Marca todas como lidas."""
        for i in range(3):
            db.add(
                Notification(
                    user_id=test_user.id,
                    type="info",
                    title=f"Notificação {i}",
                    body="",
                )
            )
        db.commit()

        response = client.post(
            "/api/notifications/mark-all-read",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["marked"] == 3

        response = client.get("/api/notifications/unread-count", headers=auth_headers)
        assert response.json()["count"] == 0

    def test_notifications_require_auth(self, client):
        """Rotas de notificações exigem autenticação."""
        response = client.get("/api/notifications/")
        assert response.status_code in (
            status.HTTP_403_FORBIDDEN,
            status.HTTP_401_UNAUTHORIZED,
        )

        response = client.get("/api/notifications/unread-count")
        assert response.status_code in (
            status.HTTP_403_FORBIDDEN,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_user_cannot_see_other_user_notification(self, client, db, test_user, auth_headers):
        """Usuário não vê notificação de outro usuário."""
        other = User(
            name="Outro",
            email="outro@example.com",
            hashed_password=get_password_hash("outro123"),
            is_active=True,
        )
        db.add(other)
        db.commit()
        db.refresh(other)

        n = Notification(
            user_id=other.id,
            type="info",
            title="Só do outro",
            body=".",
        )
        db.add(n)
        db.commit()
        db.refresh(n)

        response = client.get(f"/api/notifications/{n.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
