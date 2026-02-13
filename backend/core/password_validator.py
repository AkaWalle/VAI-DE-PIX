"""
Validador de senha com verificação de complexidade
"""
import re
from typing import List, Tuple

from core.constants import MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH
from core.logging_config import get_logger

logger = get_logger(__name__)


class PasswordValidator:
    """Validador de senha com verificação de complexidade."""
    
    # Senhas comuns que devem ser rejeitadas
    COMMON_PASSWORDS = [
        '123456', 'password', '123456789', '12345678', '12345',
        '1234567', '1234567890', 'qwerty', 'abc123', '111111',
        '123123', 'admin', 'letmein', 'welcome', 'monkey',
        '12345678910', 'password1', 'qwerty123', '123456789a'
    ]
    
    @staticmethod
    def validate_password(password: str) -> Tuple[bool, List[str]]:
        """
        Valida senha e retorna se é válida e lista de erros.
        
        Args:
            password: Senha a ser validada
        
        Returns:
            Tupla (is_valid, errors) onde errors é lista de mensagens de erro
        """
        errors = []
        
        # Verificar comprimento
        if len(password) < MIN_PASSWORD_LENGTH:
            errors.append(f"Senha deve ter pelo menos {MIN_PASSWORD_LENGTH} caracteres")
        
        if len(password) > MAX_PASSWORD_LENGTH:
            errors.append(f"Senha deve ter no máximo {MAX_PASSWORD_LENGTH} caracteres")
        
        # Verificar se é senha comum
        if password.lower() in [p.lower() for p in PasswordValidator.COMMON_PASSWORDS]:
            errors.append("Senha muito comum. Escolha uma senha mais segura")
        
        # Verificar complexidade (recomendado, mas não obrigatório inicialmente)
        has_upper = bool(re.search(r'[A-Z]', password))
        has_lower = bool(re.search(r'[a-z]', password))
        has_digit = bool(re.search(r'\d', password))
        has_special = bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password))
        
        complexity_score = sum([has_upper, has_lower, has_digit, has_special])
        
        if complexity_score < 2:
            errors.append(
                "Senha fraca. Recomendado usar maiúsculas, minúsculas, números e símbolos"
            )
        
        is_valid = len(errors) == 0
        return is_valid, errors
    
    @staticmethod
    def validate_password_strict(password: str) -> Tuple[bool, List[str]]:
        """
        Validação estrita de senha (exige complexidade).
        
        Args:
            password: Senha a ser validada
        
        Returns:
            Tupla (is_valid, errors)
        """
        errors = []
        
        # Verificar comprimento mínimo maior
        if len(password) < 8:
            errors.append("Senha deve ter pelo menos 8 caracteres")
        
        if len(password) > MAX_PASSWORD_LENGTH:
            errors.append(f"Senha deve ter no máximo {MAX_PASSWORD_LENGTH} caracteres")
        
        # Verificar se é senha comum
        if password.lower() in [p.lower() for p in PasswordValidator.COMMON_PASSWORDS]:
            errors.append("Senha muito comum. Escolha uma senha mais segura")
        
        # Exigir complexidade
        has_upper = bool(re.search(r'[A-Z]', password))
        has_lower = bool(re.search(r'[a-z]', password))
        has_digit = bool(re.search(r'\d', password))
        has_special = bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password))
        
        if not has_upper:
            errors.append("Senha deve conter pelo menos uma letra maiúscula")
        if not has_lower:
            errors.append("Senha deve conter pelo menos uma letra minúscula")
        if not has_digit:
            errors.append("Senha deve conter pelo menos um número")
        if not has_special:
            errors.append("Senha deve conter pelo menos um caractere especial")
        
        is_valid = len(errors) == 0
        return is_valid, errors

