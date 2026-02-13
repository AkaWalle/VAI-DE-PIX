"""
Políticas financeiras versionadas (Trilha 11).
Cada módulo _v1 define regras com versão explícita; mudanças futuras exigem nova versão.
"""
from domain.financial_policies.ledger_v1 import VERSION as LEDGER_V1_VERSION
from domain.financial_policies.transfers_v1 import VERSION as TRANSFERS_V1_VERSION
from domain.financial_policies.goals_v1 import VERSION as GOALS_V1_VERSION

__all__ = [
    "LEDGER_V1_VERSION",
    "TRANSFERS_V1_VERSION",
    "GOALS_V1_VERSION",
]
