"""
Testes de integração para autenticação
Garante que register/login funcionam corretamente
"""
import pytest
from fastapi.testclient import TestClient
from conftest import client, db, test_user


class TestRegister:
    """Testes para registro de usuário"""
    
    def test_register_success(self, client):
        """Testa registro bem-sucedido"""
        response = client.post(
            "/api/auth/register",
            json={
                "name": "Novo Usuário",
                "email": "novo@teste.com",
                "password": "Senha123!@#"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == "novo@teste.com"
    
    def test_register_duplicate_email(self, client):
        """Testa que email duplicado é rejeitado"""
        # Primeiro registro
        client.post(
            "/api/auth/register",
            json={
                "name": "Usuário 1",
                "email": "duplicado@teste.com",
                "password": "Senha123!@#"
            }
        )
        
        # Segundo registro com mesmo email
        response = client.post(
            "/api/auth/register",
            json={
                "name": "Usuário 2",
                "email": "duplicado@teste.com",
                "password": "Senha123!@#"
            }
        )
        assert response.status_code == 400
        assert "já está em uso" in response.json()["detail"]
    
    def test_register_weak_password(self, client):
        """Testa que senha fraca é rejeitada"""
        response = client.post(
            "/api/auth/register",
            json={
                "name": "Usuário",
                "email": "teste@teste.com",
                "password": "12345"  # Muito curta
            }
        )
        assert response.status_code == 422  # Validation error
    
    def test_register_creates_default_data(self, client, db):
        """Testa que registro cria categorias e contas padrão"""
        response = client.post(
            "/api/auth/register",
            json={
                "name": "Usuário Completo",
                "email": "completo@teste.com",
                "password": "Senha123!@#"
            }
        )
        assert response.status_code == 200
        
        # Verificar que usuário foi criado
        from models import User, Category, Account
        user = db.query(User).filter(User.email == "completo@teste.com").first()
        assert user is not None
        
        # Verificar categorias padrão
        categories = db.query(Category).filter(Category.user_id == user.id).all()
        assert len(categories) > 0
        
        # Verificar contas padrão
        accounts = db.query(Account).filter(Account.user_id == user.id).all()
        assert len(accounts) > 0


class TestLogin:
    """Testes para login de usuário"""
    
    def test_login_success(self, client, test_user):
        """Testa login bem-sucedido"""
        response = client.post(
            "/api/auth/login",
            json={
                "email": test_user.email,
                "password": "test123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
    
    def test_login_wrong_password(self, client, test_user):
        """Testa que senha incorreta é rejeitada"""
        response = client.post(
            "/api/auth/login",
            json={
                "email": test_user.email,
                "password": "senha_errada"
            }
        )
        assert response.status_code == 401
        assert "incorretos" in response.json()["detail"]
    
    def test_login_nonexistent_user(self, client):
        """Testa que usuário inexistente é rejeitado"""
        response = client.post(
            "/api/auth/login",
            json={
                "email": "naoexiste@teste.com",
                "password": "Senha123!@#"
            }
        )
        assert response.status_code == 401
    
    def test_login_inactive_user(self, client, db):
        """Testa que usuário inativo não pode fazer login"""
        from models import User
        from auth_utils import get_password_hash
        
        # Criar usuário inativo
        inactive_user = User(
            name="Inativo",
            email="inativo@teste.com",
            hashed_password=get_password_hash("Senha123!@#"),
            is_active=False
        )
        db.add(inactive_user)
        db.commit()
        
        response = client.post(
            "/api/auth/login",
            json={
                "email": "inativo@teste.com",
                "password": "Senha123!@#"
            }
        )
        assert response.status_code == 400
        assert "inativa" in response.json()["detail"]


class TestProtectedRoutes:
    """Testes para rotas protegidas"""
    
    def test_protected_route_without_token(self, client):
        """Testa que rota protegida sem token retorna 403"""
        response = client.get("/api/protected")
        assert response.status_code == 403
    
    def test_protected_route_with_invalid_token(self, client):
        """Testa que rota protegida com token inválido retorna 401"""
        response = client.get(
            "/api/protected",
            headers={"Authorization": "Bearer token_invalido"}
        )
        assert response.status_code == 401
    
    def test_protected_route_with_valid_token(self, client, auth_headers):
        """Testa que rota protegida com token válido funciona"""
        response = client.get("/api/protected", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "user_id" in data
    
    def test_me_endpoint(self, client, auth_headers):
        """Testa endpoint /api/auth/me"""
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "name" in data

