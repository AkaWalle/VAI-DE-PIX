"""
Testes unitários para sanitização de entrada
"""
import pytest
from core.input_sanitizer import sanitize_name, sanitize_text


class TestInputSanitizer:
    """Testes para sanitização de entrada"""
    
    def test_sanitize_name_removes_html(self):
        """Testa que HTML é removido de nomes"""
        assert sanitize_name("<script>alert('xss')</script>Teste") == "Teste"
        assert sanitize_name("<b>Nome</b>") == "Nome"
    
    def test_sanitize_name_removes_sql_injection(self):
        """Testa que SQL injection é removido"""
        assert sanitize_name("'; DROP TABLE users; --") == "DROP TABLE users"
        assert sanitize_name("' OR '1'='1") == "OR 11"
    
    def test_sanitize_name_preserves_valid_text(self):
        """Testa que texto válido é preservado"""
        assert sanitize_name("João Silva") == "João Silva"
        assert sanitize_name("Conta Corrente") == "Conta Corrente"
    
    def test_sanitize_text_removes_dangerous_content(self):
        """Testa que conteúdo perigoso é removido"""
        dangerous = "<script>alert('xss')</script>Texto válido"
        sanitized = sanitize_text(dangerous)
        assert "script" not in sanitized.lower()
        assert "Texto válido" in sanitized

