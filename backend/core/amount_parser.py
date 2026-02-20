"""
Parsing seguro de valores monetários pt-BR.
Regra: vírgula = decimal, ponto = milhar. Nunca usar float para decisões;
usar Decimal ou centavos (int).
"""
import re
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

# 2 casas decimais (centavos)
QUANTIZE = Decimal("0.01")


def _round_decimal(value: Decimal) -> Decimal:
    return value.quantize(QUANTIZE, rounding=ROUND_HALF_UP)


def parse_brazilian_amount(text: str) -> Optional[Decimal]:
    """
    Parseia string pt-BR para Decimal (2 casas).
    - Vírgula = decimal, ponto = milhar.
    - Ex.: "9.000,00" → Decimal("9000.00"), "10,00" → Decimal("10.00").
    """
    if not text or not isinstance(text, str):
        return None
    cleaned = text.strip().lower()
    cleaned = re.sub(r"r\$\s*", "", cleaned).strip()
    if not cleaned:
        return None
    cleaned = re.sub(r"[^\d,.]", "", cleaned)
    if not cleaned:
        return None

    if "," in cleaned:
        # pt-BR: vírgula decimal, ponto milhar
        normalized = cleaned.replace(".", "").replace(",", ".")
    elif "." in cleaned:
        parts = cleaned.split(".")
        if len(parts) == 2 and len(parts[1]) <= 2:
            normalized = cleaned  # um ponto com 1–2 dígitos = decimal
        else:
            normalized = "".join(parts)  # vários pontos = milhar
    else:
        normalized = cleaned

    try:
        value = Decimal(normalized)
    except Exception:
        return None
    if value < 0:
        return None
    return _round_decimal(value)


def parse_brazilian_to_float(text: str) -> Optional[float]:
    """
    Retorna float para compatibilidade (ex.: extrato/relatórios).
    Preferir parse_brazilian_amount (Decimal) em código novo.
    """
    d = parse_brazilian_amount(text)
    return float(d) if d is not None else None


def to_cents(value: Decimal) -> int:
    """Converte reais (Decimal) para centavos (int)."""
    if value is None:
        return 0
    return int((value * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def from_cents(cents: int) -> Decimal:
    """Converte centavos (int) para reais (Decimal)."""
    return (Decimal(cents) / 100).quantize(QUANTIZE, rounding=ROUND_HALF_UP)


def amount_from_api(raw: object) -> Optional[Decimal]:
    """
    Aceita valor vindo da API (float ou int) e converte para Decimal (2 casas).
    Evita drift de float; usar sempre antes de persistir.
    """
    if raw is None:
        return None
    if isinstance(raw, Decimal):
        return _round_decimal(raw)
    try:
        if isinstance(raw, (int, float)):
            return _round_decimal(Decimal(str(raw)))
    except Exception:
        pass
    return None


def serialize_money(value: Optional[Decimal]) -> str:
    """
    Serializa valor monetário para string no formato JSON enterprise ("1234.56").
    Usa quantize(0.01); nunca usa float(). Uso: respostas da API (campo _str).
    """
    if value is None:
        return "0.00"
    if not isinstance(value, Decimal):
        try:
            value = _round_decimal(Decimal(str(value)))
        except Exception:
            return "0.00"
    return str(_round_decimal(value))
