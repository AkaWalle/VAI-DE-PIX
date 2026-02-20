"""
Testes unitários para parser de valores monetários (Decimal, pt-BR)
"""
import pytest
from decimal import Decimal
from core.amount_parser import (
    parse_brazilian_amount,
    parse_brazilian_to_float,
    to_cents,
    from_cents,
    amount_from_api,
    serialize_money,
)


class TestAmountParser:
    """Testes para parsing de valores monetários"""

    def test_parse_simple_number(self):
        """Número simples"""
        assert parse_brazilian_amount("100") == Decimal("100")
        assert parse_brazilian_amount("100.50") == Decimal("100.50")

    def test_parse_currency_format(self):
        """Formato com R$"""
        assert parse_brazilian_amount("R$ 100,50") == Decimal("100.50")
        assert parse_brazilian_amount("R$1.000,50") == Decimal("1000.50")

    def test_parse_with_spaces(self):
        """Espaços e R$"""
        assert parse_brazilian_amount("R$ 100,50") == Decimal("100.50")
        assert parse_brazilian_amount(" 100.50 ") == Decimal("100.50")

    def test_parse_invalid_input(self):
        """Entrada inválida"""
        assert parse_brazilian_amount("abc") is None
        assert parse_brazilian_amount("") is None
        assert parse_brazilian_amount("R$") is None

    def test_parse_brazilian_format(self):
        """pt-BR: vírgula decimal, ponto milhar"""
        assert parse_brazilian_amount("1.234,56") == Decimal("1234.56")
        assert parse_brazilian_amount("12.345,67") == Decimal("12345.67")
        assert parse_brazilian_amount("1.234") == Decimal("1234")
        assert parse_brazilian_amount("9.000,00") == Decimal("9000.00")
        assert parse_brazilian_amount("10,00") == Decimal("10.00")

    def test_parse_brazilian_to_float(self):
        """Compatibilidade float"""
        assert parse_brazilian_to_float("100,50") == 100.50
        assert parse_brazilian_to_float("abc") is None

    def test_to_cents_from_cents(self):
        """Conversão reais ↔ centavos"""
        assert to_cents(Decimal("10.00")) == 1000
        assert from_cents(1000) == Decimal("10.00")

    def test_amount_from_api(self):
        """Valor vindo da API (float/int) → Decimal"""
        assert amount_from_api(100.5) == Decimal("100.50")
        assert amount_from_api(100) == Decimal("100.00")
        assert amount_from_api(None) is None

    def test_serialize_money(self):
        """Enterprise: Decimal → string "1234.56" para JSON (sem float)."""
        assert serialize_money(Decimal("1234.56")) == "1234.56"
        assert serialize_money(Decimal("10")) == "10.00"
        assert serialize_money(None) == "0.00"
        assert serialize_money(Decimal("0")) == "0.00"
