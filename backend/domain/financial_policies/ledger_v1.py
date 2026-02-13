"""
Política de ledger contábil — versão 1 (Trilha 11).
Regras: append-only; tipos de entrada; sem UPDATE/DELETE em ledger_entries.
Mudanças futuras exigem nova versão (ledger_v2.py).
"""
VERSION = "1"

ENTRY_TYPES = ("credit", "debit")

# Ledger é append-only: nenhuma operação UPDATE ou DELETE em ledger_entries.
# Reversões são representadas por novas linhas com amount de sinal oposto e mesmo transaction_id.
APPEND_ONLY = True
