"""
Policy v1: variação mensal por categoria (despesas).
Regra: mês atual vs mês anterior; sem divisão por zero; ordenação por impacto.
"""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import Transaction, Category
from domain.insight_policies.common import month_bounds


def compute_category_monthly_variation_v1(user_id: str, db: Session) -> List[Dict[str, Any]]:
    """
    Variação mensal por categoria (despesas): mês atual vs mês anterior.
    Explicável: "Categoria X: R$ Y este mês, R$ Z mês passado, variação +W%."
    Caso borda: mês anterior 0 → variation_pct null, explicação "Novo gasto neste mês".
    Ordenação: por impact_score (|current - previous|) DESC.
    """
    curr_first, curr_last = month_bounds(0)
    prev_first, prev_last = month_bounds(1)

    current_month = (
        db.query(
            Transaction.category_id,
            Category.name.label("category_name"),
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .join(Category, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.deleted_at.is_(None),
            Transaction.date >= curr_first,
            Transaction.date <= curr_last,
        )
        .group_by(Transaction.category_id, Category.name)
        .all()
    )
    previous_month = (
        db.query(
            Transaction.category_id,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.deleted_at.is_(None),
            Transaction.date >= prev_first,
            Transaction.date <= prev_last,
        )
        .group_by(Transaction.category_id)
        .all()
    )
    prev_by_cat = {row.category_id: float(row.total) for row in previous_month}

    result = []
    for row in current_month:
        curr_total = float(row.total)
        prev_total = prev_by_cat.get(row.category_id) or 0.0
        insight_hash = f"category_variation:{row.category_id}:{curr_first.year}-{curr_first.month:02d}"

        if prev_total == 0 or prev_total is None:
            impact = round(abs(curr_total), 2)
            result.append({
                "category_id": row.category_id,
                "category_name": row.category_name,
                "previous_amount": round(prev_total, 2),
                "current_amount": round(curr_total, 2),
                "current_month_total": round(curr_total, 2),
                "previous_month_total": round(prev_total, 2),
                "variation_pct": None,
                "variation_percent": None,
                "explanation": f"Novo gasto neste mês: R$ {curr_total:.2f}" if curr_total > 0 else "Sem gastos neste mês.",
                "impact_score": impact,
                "insight_hash": insight_hash,
            })
            continue

        variation_pct = ((curr_total - prev_total) / prev_total) * 100
        direction = "subiu" if variation_pct > 0 else "caiu"
        explanation = (
            f"R$ {curr_total:.2f} este mês vs R$ {prev_total:.2f} no mês anterior; "
            f"{direction} {abs(variation_pct):.1f}%."
        )
        impact = round(abs(curr_total - prev_total), 2)
        result.append({
            "category_id": row.category_id,
            "category_name": row.category_name,
            "previous_amount": round(prev_total, 2),
            "current_amount": round(curr_total, 2),
            "current_month_total": round(curr_total, 2),
            "previous_month_total": round(prev_total, 2),
            "variation_pct": round(variation_pct, 1),
            "variation_percent": round(variation_pct, 1),
            "explanation": explanation,
            "impact_score": impact,
            "insight_hash": insight_hash,
        })

    result.sort(key=lambda x: -(x.get("impact_score") or 0))
    return result
