"""
Testes unitários para parser de valores monetários
"""
import pytest
from core.amount_parser import parse_brazilian_amount


class TestAmountParser:
    """Testes para parsing de valores monetários"""
    
    def test_parse_simple_number(self):
        """Testa parsing de número simples"""
        assert parse_brazilian_amount("100") == 100.0
        assert parse_brazilian_amount("100.50") == 100.50
    
    def test_parse_currency_format(self):
        """Testa parsing de formato de moeda"""
        assert parse_brazilian_amount("R$ 100,50") == 100.50
        assert parse_brazilian_amount("R$1.000,50") == 1000.50
    
    def test_parse_with_spaces(self):
        """Testa parsing com espaços"""
        assert parse_brazilian_amount("R$ 100,50") == 100.50
        assert parse_brazilian_amount(" 100.50 ") == 100.50
    
    def test_parse_invalid_input(self):
        """Testa parsing de entrada inválida"""
        assert parse_brazilian_amount("abc") is None
        assert parse_brazilian_amount("") is None
        assert parse_brazilian_amount("R$") is None
    
    def test_parse_brazilian_format(self):
        """Testa parsing de formato brasileiro"""
        assert parse_brazilian_amount("1.234,56") == 1234.56
        assert parse_brazilian_amount("12.345,67") == 12345.67
        assert parse_brazilian_amount("1.234") == 1234.0

