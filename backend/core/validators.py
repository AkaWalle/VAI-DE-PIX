"""
Validadores de limites e regras de negócio
"""
from decimal import Decimal
from typing import Optional
from pydantic import field_validator
from core.input_sanitizer import sanitize_text, sanitize_name, validate_max_length

# Limites máximos
MAX_AMOUNT = Decimal('999999.99')
MAX_DESCRIPTION_LENGTH = 500
MAX_NAME_LENGTH = 100
MAX_CATEGORY_NAME_LENGTH = 50
MAX_ACCOUNT_NAME_LENGTH = 100

def validate_amount(amount: float) -> Decimal:
    """
    Valida e converte valor monetário.
    
    Args:
        amount: Valor a validar
        
    Returns:
        Decimal validado
        
    Raises:
        ValueError: Se valor for inválido
    """
    if amount is None:
        raise ValueError("Valor é obrigatório")
    
    if amount < 0:
        raise ValueError("Valor não pode ser negativo")
    
    decimal_amount = Decimal(str(amount))
    
    if decimal_amount > MAX_AMOUNT:
        raise ValueError(f"Valor máximo permitido é R$ {MAX_AMOUNT:,.2f}")
    
    return decimal_amount

def validate_description(description: str) -> str:
    """
    Valida e sanitiza descrição.
    
    Args:
        description: Descrição a validar
        
    Returns:
        Descrição sanitizada e validada
    """
    if not description or not description.strip():
        raise ValueError("Descrição é obrigatória")
    
    return validate_max_length(description, MAX_DESCRIPTION_LENGTH, "Descrição")

def validate_name(name: str, max_length: int = MAX_NAME_LENGTH, field_name: str = "Nome") -> str:
    """
    Valida e sanitiza nome.
    
    Args:
        name: Nome a validar
        max_length: Comprimento máximo
        field_name: Nome do campo para erro
        
    Returns:
        Nome sanitizado e validado
    """
    if not name or not name.strip():
        raise ValueError(f"{field_name} é obrigatório")
    
    sanitized = sanitize_name(name)
    if not sanitized:
        raise ValueError(f"{field_name} inválido")
    
    if len(sanitized) > max_length:
        raise ValueError(f"{field_name} deve ter no máximo {max_length} caracteres")
    
    if len(sanitized) < 1:
        raise ValueError(f"{field_name} deve ter pelo menos 1 caractere")
    
    return sanitized

