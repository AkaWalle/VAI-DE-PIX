"""
Dados de teste padronizados para uso em todos os testes
"""
from datetime import datetime, timedelta
from typing import Dict, Any

# Usuário de teste padrão
TEST_USER = {
    "name": "Usuário Teste",
    "email": "teste@vai-de-pix.com",
    "password": "Teste123!@#"
}

# Conta de teste padrão
TEST_ACCOUNT = {
    "name": "Conta Teste",
    "account_type": "checking",
    "balance": 1000.0
}

# Categoria de teste padrão
TEST_CATEGORY_INCOME = {
    "name": "Salário",
    "type": "income",
    "color": "#22c55e",
    "icon": "💰"
}

TEST_CATEGORY_EXPENSE = {
    "name": "Alimentação",
    "type": "expense",
    "color": "#ef4444",
    "icon": "🍕"
}

# Transação de teste padrão
def get_test_transaction(transaction_type: str = "income") -> Dict[str, Any]:
    """Retorna uma transação de teste"""
    return {
        "description": "Transação Teste",
        "amount": 100.0,
        "type": transaction_type,
        "date": datetime.now().isoformat(),
        "category_id": None,  # Será preenchido no teste
        "account_id": None,  # Será preenchido no teste
    }

# Meta de teste padrão
def get_test_goal() -> Dict[str, Any]:
    """Retorna uma meta de teste"""
    return {
        "name": "Meta Teste",
        "target_amount": 5000.0,
        "current_amount": 0.0,
        "deadline": (datetime.now() + timedelta(days=90)).isoformat(),
        "category_id": None,  # Será preenchido no teste
    }

# Envelope de teste padrão
def get_test_envelope() -> Dict[str, Any]:
    """Retorna um envelope de teste"""
    return {
        "name": "Envelope Teste",
        "current_amount": 0.0,
        "category_id": None,  # Será preenchido no teste
    }

