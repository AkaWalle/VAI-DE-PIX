"""
Sanitização de inputs para prevenir XSS e injection attacks
"""
import bleach
from typing import Optional

# Configuração de tags e atributos permitidos
ALLOWED_TAGS = []  # Não permitir HTML tags
ALLOWED_ATTRIBUTES = {}  # Não permitir atributos

def sanitize_text(text: Optional[str]) -> Optional[str]:
    """
    Sanitiza texto removendo HTML/JavaScript e caracteres perigosos.
    
    Args:
        text: Texto a ser sanitizado
        
    Returns:
        Texto sanitizado ou None se input for None
    """
    if text is None:
        return None
    
    # Remover HTML tags e scripts
    cleaned = bleach.clean(text, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES, strip=True)
    
    # Remover caracteres de controle perigosos
    cleaned = ''.join(char for char in cleaned if ord(char) >= 32 or char in '\n\r\t')
    
    return cleaned.strip()

def sanitize_name(name: Optional[str]) -> Optional[str]:
    """
    Sanitiza nomes (mais restritivo que texto livre).
    
    Args:
        name: Nome a ser sanitizado
        
    Returns:
        Nome sanitizado ou None se input for None
    """
    if name is None:
        return None
    
    # Apenas letras, números, espaços e alguns caracteres especiais básicos
    cleaned = sanitize_text(name)
    if cleaned:
        # Remover caracteres especiais perigosos, manter apenas básicos
        cleaned = ''.join(char for char in cleaned if char.isalnum() or char in ' -_.,()')
    
    return cleaned.strip() if cleaned else None

def validate_max_length(text: Optional[str], max_length: int, field_name: str = "campo") -> str:
    """
    Valida e sanitiza texto com limite máximo.
    
    Args:
        text: Texto a validar
        max_length: Comprimento máximo permitido
        field_name: Nome do campo para mensagem de erro
        
    Returns:
        Texto sanitizado
        
    Raises:
        ValueError: Se texto exceder limite
    """
    if text is None:
        return ""
    
    sanitized = sanitize_text(text)
    if sanitized and len(sanitized) > max_length:
        raise ValueError(f"{field_name} deve ter no máximo {max_length} caracteres")
    
    return sanitized or ""

