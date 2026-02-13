"""
Função robusta para parsing de valores monetários brasileiros
Suporta todos os formatos comuns: R$ 1.234,56, 1234,56, 1.234, 1000, etc.
"""
import re
from typing import Optional


def parse_brazilian_amount(text: str) -> Optional[float]:
    """
    Parseia valores monetários brasileiros para float.
    
    Suporta os seguintes formatos:
    - R$ 1.234,56 → 1234.56
    - 1234,56 → 1234.56
    - 1.234 → 1234.0
    - 1000 → 1000.0
    - R$1000,00 → 1000.0
    - 1.234,56 → 1234.56
    - 1234.56 → 1234.56 (formato internacional também aceito)
    
    Args:
        text: String contendo o valor monetário
        
    Returns:
        Valor float ou None se não conseguir parsear
    """
    if not text or not isinstance(text, str):
        return None
    
    # Remove espaços e converte para minúsculas
    text = text.strip().lower()
    
    # Remove R$ e espaços
    text = re.sub(r'r\$\s*', '', text)
    text = text.strip()
    
    if not text:
        return None
    
    # Padrão 1: Formato brasileiro com vírgula decimal e ponto milhar (1.234,56)
    # Detecta se tem vírgula seguida de 1-2 dígitos no final
    brazilian_pattern = r'^(\d{1,3}(?:\.\d{3})*),(\d{1,2})$'
    match = re.match(brazilian_pattern, text)
    if match:
        integer_part = match.group(1).replace('.', '')  # Remove pontos de milhar
        decimal_part = match.group(2)
        # Garante 2 casas decimais
        if len(decimal_part) == 1:
            decimal_part += '0'
        try:
            return float(f"{integer_part}.{decimal_part}")
        except ValueError:
            pass
    
    # Padrão 2: Formato brasileiro sem decimais mas com ponto milhar (1.234)
    # Verifica se tem ponto mas não vírgula, e se o último ponto tem 3 dígitos após
    if '.' in text and ',' not in text:
        # Verifica se é formato brasileiro (ponto como separador de milhar)
        # Ex: 1.234 ou 12.345
        parts = text.split('.')
        # Se todas as partes (exceto a primeira) têm exatamente 3 dígitos, é milhar
        if len(parts) > 1 and all(len(p) == 3 for p in parts[1:]):
            # É formato brasileiro de milhar
            integer_part = ''.join(parts)
            try:
                return float(integer_part)
            except ValueError:
                pass
        # Caso contrário, pode ser formato internacional (ponto decimal)
        try:
            return float(text)
        except ValueError:
            pass
    
    # Padrão 3: Formato internacional com ponto decimal (1234.56)
    if '.' in text and ',' not in text:
        try:
            return float(text)
        except ValueError:
            pass
    
    # Padrão 4: Apenas números inteiros (1000, 5000, etc)
    if re.match(r'^\d+$', text):
        try:
            return float(text)
        except ValueError:
            pass
    
    # Padrão 5: Formato com vírgula mas sem ponto milhar (1234,56)
    if ',' in text and '.' not in text:
        text_with_dot = text.replace(',', '.')
        try:
            return float(text_with_dot)
        except ValueError:
            pass
    
    # Padrão 6: Formato misto (tentar remover tudo exceto números e vírgula/ponto)
    # Remove tudo exceto dígitos, vírgula e ponto
    cleaned = re.sub(r'[^\d,.]', '', text)
    if cleaned:
        # Se tem vírgula, assume formato brasileiro
        if ',' in cleaned:
            # Remove pontos (milhar) e substitui vírgula por ponto
            cleaned = cleaned.replace('.', '').replace(',', '.')
        try:
            return float(cleaned)
        except ValueError:
            pass
    
    return None

