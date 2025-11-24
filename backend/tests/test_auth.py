"""
Testes críticos de autenticação e autorização
Garante segurança de acesso e validação de tokens
"""
import pytest
from fastapi import status

from models import User, Account, Category
from auth_utils import create_access_token, verify_token, get_password_hash
from core.password_validator import PasswordValidator
from core.security import validate_ownership, get_secret_key


class TestPasswordValidator:
    """Testes para validação de senha."""
    
    def test_validate_weak_password(self):
        """Testa que senha fraca é rejeitada."""
        is_valid, errors = PasswordValidator.validate_password("123456")
        assert not is_valid
        assert len(errors) > 0
    
    def test_validate_common_password(self):
        """Testa que senhas comuns são rejeitadas."""
        is_valid, errors = PasswordValidator.validate_password("password")
        assert not is_valid
        assert any("comum" in error.lower() for error in errors)
    
    def test_validate_short_password(self):
        """Testa que senha muito curta é rejeitada."""
        is_valid, errors = PasswordValidator.validate_password("12345")
        assert not is_valid
        assert any("6 caracteres" in error for error in errors)
    
    def test_validate_good_password(self):
        """Testa que senha boa é aceita."""
        is_valid, errors = PasswordValidator.validate_password("MinhaSenh@123")
        assert is_valid
        assert len(errors) == 0
    
    def test_validate_strict_password_requires_complexity(self):
        """Testa que validação estrita exige complexidade."""
        # Senha sem maiúscula
        is_valid, errors = PasswordValidator.validate_password_strict("minhasenha123!")
        assert not is_valid
        assert any("maiúscula" in error.lower() for error in errors)
        
        # Senha sem número
        is_valid, errors = PasswordValidator.validate_password_strict("MinhaSenha!")
        assert not is_valid
        assert any("número" in error.lower() for error in errors)
        
        # Senha completa
        is_valid, errors = PasswordValidator.validate_password_strict("MinhaSenh@123")
        assert is_valid


class TestAuthentication:
    """Testes de autenticação."""
    
    def test_register_with_valid_data(self, client):
        """Testa registro com dados válidos."""
        response = client.post(
            "/api/auth/register",
            json={
                "name": "New User",
                "email": "newuser@example.com",
                "password": "SecurePass123!"
            }
        )
        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.json()
        assert response.json()["user"]["email"] == "newuser@example.com"
    
    def test_register_with_weak_password(self, client):
        """Testa que registro com senha fraca é rejeitado."""
        response = client.post(
            "/api/auth/register",
            json={
                "name": "New User",
                "email": "newuser2@example.com",
                "password": "123456"  # Senha comum
            }
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_register_duplicate_email(self, client, test_user):
        """Testa que email duplicado é rejeitado."""
        response = client.post(
            "/api/auth/register",
            json={
                "name": "Another User",
                "email": test_user.email,  # Email já existe
                "password": "SecurePass123!"
            }
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "já está em uso" in response.json()["detail"]
    
    def test_login_with_valid_credentials(self, client, test_user):
        """Testa login com credenciais válidas."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": test_user.email,
                "password": "test123"
            }
        )
        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.json()
        assert response.json()["user"]["email"] == test_user.email
    
    def test_login_with_invalid_credentials(self, client, test_user):
        """Testa que login com credenciais inválidas é rejeitado."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": test_user.email,
                "password": "wrongpassword"
            }
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_login_with_nonexistent_user(self, client):
        """Testa que login com usuário inexistente é rejeitado."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "anypassword"
            }
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_profile_with_valid_token(self, client, auth_headers):
        """Testa obter perfil com token válido."""
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert "email" in response.json()
    
    def test_get_profile_without_token(self, client):
        """Testa que acesso sem token é rejeitado."""
        response = client.get("/api/auth/me")
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_get_profile_with_invalid_token(self, client):
        """Testa que token inválido é rejeitado."""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestAuthorization:
    """Testes de autorização e ownership."""
    
    def test_user_cannot_access_other_user_account(self, client, db, test_user, auth_headers):
        """Testa que usuário não pode acessar conta de outro usuário."""
        # Criar outro usuário com conta
        other_user = User(
            name="Other User",
            email="other@example.com",
            hashed_password=get_password_hash("password123"),
            is_active=True
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)
        
        other_account = Account(
            name="Other Account",
            type="checking",
            balance=500.0,
            user_id=other_user.id
        )
        db.add(other_account)
        db.commit()
        db.refresh(other_account)
        
        # Tentar acessar conta do outro usuário
        response = client.get(
            f"/api/accounts/{other_account.id}",
            headers=auth_headers
        )
        # Deve retornar 404 (não encontrada para este usuário) ou 403
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN]
    
    def test_user_cannot_update_other_user_transaction(self, client, db, test_user, auth_headers):
        """Testa que usuário não pode atualizar transação de outro usuário."""
        # Criar outro usuário com transação
        other_user = User(
            name="Other User",
            email="other2@example.com",
            hashed_password=get_password_hash("password123"),
            is_active=True
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)
        
        other_account = Account(
            name="Other Account",
            type="checking",
            balance=500.0,
            user_id=other_user.id
        )
        db.add(other_account)
        db.commit()
        
        other_category = Category(
            name="Other Category",
            type="expense",
            color="#ef4444",
            icon="💰",
            user_id=other_user.id
        )
        db.add(other_category)
        db.commit()
        
        from models import Transaction
        from datetime import datetime
        other_transaction = Transaction(
            date=datetime.now(),
            account_id=other_account.id,
            category_id=other_category.id,
            type="expense",
            amount=100.0,
            description="Other transaction",
            user_id=other_user.id
        )
        db.add(other_transaction)
        db.commit()
        db.refresh(other_transaction)
        
        # Tentar atualizar transação do outro usuário
        response = client.put(
            f"/api/transactions/{other_transaction.id}",
            headers=auth_headers,
            json={"amount": 200.0}
        )
        # Deve retornar 404 ou 403
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN]
    
    def test_validate_ownership_allows_own_resource(self, db, test_user, test_account):
        """Testa que validate_ownership permite recurso próprio."""
        # Não deve levantar exceção
        validate_ownership(test_account.user_id, test_user.id, "conta")
    
    def test_validate_ownership_blocks_other_user_resource(self, db, test_user):
        """Testa que validate_ownership bloqueia recurso de outro usuário."""
        from fastapi import HTTPException
        
        # Criar outro usuário
        other_user = User(
            name="Other User",
            email="other3@example.com",
            hashed_password=get_password_hash("password123"),
            is_active=True
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)
        
        # Tentar validar ownership de recurso de outro usuário
        with pytest.raises(HTTPException) as exc_info:
            validate_ownership(other_user.id, test_user.id, "recurso")
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN


class TestSecurity:
    """Testes de segurança do sistema."""
    
    def test_secret_key_validation_requires_key(self, monkeypatch):
        """Testa que SECRET_KEY é obrigatória."""
        import os
        monkeypatch.delenv("SECRET_KEY", raising=False)
        
        with pytest.raises(ValueError) as exc_info:
            get_secret_key()
        assert "SECRET_KEY não está definida" in str(exc_info.value)
    
    def test_secret_key_validation_rejects_short_key(self, monkeypatch):
        """Testa que SECRET_KEY muito curta é rejeitada."""
        import os
        monkeypatch.setenv("SECRET_KEY", "short")
        
        with pytest.raises(ValueError) as exc_info:
            get_secret_key()
        assert "muito curta" in str(exc_info.value)
    
    def test_secret_key_validation_rejects_insecure_default(self, monkeypatch):
        """Testa que SECRET_KEY padrão insegura é rejeitada."""
        import os
        monkeypatch.setenv("SECRET_KEY", "your-secret-key-change-in-production")
        
        with pytest.raises(ValueError) as exc_info:
            get_secret_key()
        assert "valor padrão inseguro" in str(exc_info.value)
    
    def test_token_expiration(self, db, test_user):
        """Testa que token expirado é rejeitado."""
        from datetime import timedelta
        from fastapi import HTTPException
        
        # Criar token com expiração negativa (já expirado)
        expired_token = create_access_token(
            data={"sub": test_user.email},
            expires_delta=timedelta(seconds=-1)  # Já expirado
        )
        
        # Tentar usar token expirado
        with pytest.raises(HTTPException) as exc_info:
            verify_token(expired_token, db)
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED

