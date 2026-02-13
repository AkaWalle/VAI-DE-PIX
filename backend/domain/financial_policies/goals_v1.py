"""
Política de metas (goals) — versão 1 (Trilha 11).
Regras: status e prioridade permitidos; target_amount > 0; current_amount <= target_amount.
Mudanças futuras exigem nova versão (goals_v2.py).
"""
VERSION = "1"

STATUS_VALUES = ("active", "achieved", "on_track", "at_risk", "overdue")
PRIORITY_VALUES = ("low", "medium", "high")

# target_amount > 0; current_amount >= 0; current_amount <= target_amount (constraint no banco).
TARGET_AMOUNT_POSITIVE = True
CURRENT_AMOUNT_NON_NEGATIVE = True
CURRENT_NOT_EXCEED_TARGET = True
