"""
Utilitários compartilhados pelas policies de insights.
"""
from datetime import date, timedelta


def month_bounds(months_ago: int) -> tuple[date, date]:
    """Retorna (primeiro_dia, ultimo_dia) do mês há N meses atrás. Mês atual = 0."""
    today = date.today()
    year = today.year
    month = today.month
    for _ in range(months_ago):
        month -= 1
        if month < 1:
            month += 12
            year -= 1
    first = date(year, month, 1)
    if month == 12:
        last = date(year, month, 31)
    else:
        last = date(year, month + 1, 1) - timedelta(days=1)
    return first, last
