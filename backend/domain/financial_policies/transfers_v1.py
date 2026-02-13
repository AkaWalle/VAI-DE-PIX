"""
Política de transferências — versão 1 (Trilha 11).
Regras: mesma propriedade (user_id); sem auto-transferência; amount > 0.
Mudanças futuras exigem nova versão (transfers_v2.py).
"""
VERSION = "1"

# Transferência só é permitida entre contas do mesmo usuário.
SAME_USER_REQUIRED = True

# Transferência para a mesma conta (from_account_id == to_account_id) não é permitida.
NO_SELF_TRANSFER = True

# Valor da transferência deve ser positivo.
MIN_AMOUNT_STRICT = True  # amount > 0

TRANSACTION_TYPE_TRANSFER = "transfer"
