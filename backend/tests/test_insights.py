"""
Testes unitários do serviço de insights financeiros.
Cobre variação mensal por categoria (incl. borda previous=0), metas em risco e feedback (visto/ignorado).
Valida dados e textos explicativos; não depende do job diário.
"""
from datetime import date, datetime, timedelta
import pytest

from models import Transaction, Category, Goal, User, InsightFeedback, UserInsightPreferences
from services.insights_service import (
    compute_category_monthly_variation,
    compute_goals_at_risk,
    compute_insights,
    get_transactions_max_updated_at,
    get_goals_max_updated_at,
    _goal_current_monthly_rate,
    _month_bounds,
)
from routers.insights import (
    _get_ignored_hashes,
    _filter_ignored,
    _get_user_preferences,
    _apply_preferences,
)


@pytest.fixture
def expense_category(db, test_user):
    """Categoria de despesa para testes de variação."""
    cat = Category(
        name="Alimentação",
        type="expense",
        color="#ef4444",
        icon="🍽",
        user_id=test_user.id,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def _add_expense(db, user_id, account_id, category_id, amount, on_date: date):
    t = Transaction(
        date=datetime.combine(on_date, datetime.min.time()),
        account_id=account_id,
        category_id=category_id,
        type="expense",
        amount=amount,
        description="Test",
        user_id=user_id,
    )
    db.add(t)
    db.commit()


class TestMonthBounds:
    def test_month_bounds_current(self):
        first, last = _month_bounds(0)
        today = date.today()
        assert first.month == today.month and first.year == today.year
        assert first.day == 1
        assert last.month == today.month
        assert (last - first).days >= 27

    def test_month_bounds_previous(self):
        first, last = _month_bounds(1)
        today = date.today()
        if today.month == 1:
            assert first.month == 12 and first.year == today.year - 1
        else:
            assert first.month == today.month - 1 and first.year == today.year


class TestCategoryMonthlyVariation:
    """Variação mensal por categoria."""

    def test_variation_basic(
        self, db, test_user, test_account, expense_category
    ):
        """Variação mensal básica: este mês vs anterior com valores em ambos."""
        curr_first, curr_last = _month_bounds(0)
        prev_first, prev_last = _month_bounds(1)
        _add_expense(
            db, test_user.id, test_account.id, expense_category.id,
            200.0, curr_first,
        )
        _add_expense(
            db, test_user.id, test_account.id, expense_category.id,
            100.0, prev_first,
        )
        result = compute_category_monthly_variation(test_user.id, db)
        assert len(result) >= 1
        row = next(r for r in result if r["category_id"] == expense_category.id)
        assert row["current_amount"] == 200.0
        assert row["previous_amount"] == 100.0
        assert row["variation_pct"] is not None
        assert row["variation_pct"] == 100.0  # (200-100)/100
        assert "100.0%" in row["explanation"] or "100%" in row["explanation"]
        assert "R$ 200.00" in row["explanation"]
        assert "R$ 100.00" in row["explanation"]

    def test_category_no_previous_month(
        self, db, test_user, test_account, expense_category
    ):
        """Categoria sem valor no mês anterior: variation_percent null, explicação 'Novo gasto'."""
        curr_first, _ = _month_bounds(0)
        _add_expense(
            db, test_user.id, test_account.id, expense_category.id,
            150.0, curr_first,
        )
        result = compute_category_monthly_variation(test_user.id, db)
        assert len(result) >= 1
        row = next(r for r in result if r["category_id"] == expense_category.id)
        assert row["previous_amount"] == 0
        assert row["current_amount"] == 150.0
        assert row["variation_pct"] is None
        assert row["variation_percent"] is None
        assert "Novo gasto neste mês" in row["explanation"]
        assert "R$ 150.00" in row["explanation"]

    def test_ordering_by_impact(self, db, test_user, test_account, expense_category):
        """Ordenação por maior impacto financeiro (impact_score)."""
        curr_first, _ = _month_bounds(0)
        _add_expense(db, test_user.id, test_account.id, expense_category.id, 500.0, curr_first)
        result = compute_category_monthly_variation(test_user.id, db)
        assert len(result) >= 1
        first = result[0]
        assert first["category_id"] == expense_category.id
        assert first["current_amount"] == 500.0
        assert first.get("impact_score") is not None
        assert first["impact_score"] == 500.0  # novo gasto: impact = current_amount

    def test_impact_score_and_ordering_desc(self, db, test_user, test_account):
        """impact_score = |current - previous|; lista ordenada por impact_score DESC."""
        curr_first, curr_last = _month_bounds(0)
        prev_first, _ = _month_bounds(1)
        cat_a = Category(name="Cat A", type="expense", color="#ff0000", icon="a", user_id=test_user.id)
        cat_b = Category(name="Cat B", type="expense", color="#00ff00", icon="b", user_id=test_user.id)
        db.add_all([cat_a, cat_b])
        db.commit()
        db.refresh(cat_a)
        db.refresh(cat_b)
        # Cat A: 300 este mês, 100 anterior → impacto 200
        _add_expense(db, test_user.id, test_account.id, cat_a.id, 300.0, curr_first)
        _add_expense(db, test_user.id, test_account.id, cat_a.id, 100.0, prev_first)
        # Cat B: 500 este mês, 0 anterior → impacto 500 (maior)
        _add_expense(db, test_user.id, test_account.id, cat_b.id, 500.0, curr_first)
        result = compute_category_monthly_variation(test_user.id, db)
        assert len(result) >= 2
        by_cat = {r["category_id"]: r for r in result}
        assert by_cat[cat_a.id]["impact_score"] == 200.0
        assert by_cat[cat_b.id]["impact_score"] == 500.0
        # Ordenação: maior impacto primeiro
        scores = [r["impact_score"] for r in result]
        assert scores == sorted(scores, reverse=True)


class TestGoalsAtRisk:
    """Metas em risco."""

    def test_goal_at_risk_short_time(self, db, test_user):
        """Meta em risco por pouco tempo restante (days_left < 60, current_rate=0)."""
        today = date.today()
        target = today + timedelta(days=30)
        goal = Goal(
            name="Meta curto prazo",
            target_amount=1000.0,
            current_amount=100.0,
            target_date=datetime.combine(target, datetime.min.time()),
            description="",
            category="x",
            priority="high",
            status="active",
            user_id=test_user.id,
        )
        db.add(goal)
        db.commit()
        db.refresh(goal)
        result = compute_goals_at_risk(test_user.id, db)
        assert len(result) >= 1
        row = next(r for r in result if r["goal_id"] == goal.id)
        assert row["days_left"] == 30
        assert row["gap"] == 900.0
        assert row["at_risk"] is True
        assert "Faltam R$ 900.00" in row["risk_reason"]
        assert "30 dias" in row["risk_reason"]

    def test_goal_at_risk_insufficient_rate(self, db, test_user):
        """Meta em risco por ritmo insuficiente (required > current_rate * 1.2)."""
        today = date.today()
        target = today + timedelta(days=365)
        created = today - timedelta(days=180)  # 6 meses atrás
        goal = Goal(
            name="Meta ritmo baixo",
            target_amount=12000.0,
            current_amount=600.0,  # 100/mês
            target_date=datetime.combine(target, datetime.min.time()),
            description="",
            category="y",
            priority="medium",
            status="active",
            user_id=test_user.id,
        )
        db.add(goal)
        db.commit()
        db.refresh(goal)
        # created_at é setado pelo server_default; forçar ritmo baixo: necessário ~1000/mês, ritmo 100
        result = compute_goals_at_risk(test_user.id, db)
        assert len(result) >= 1
        row = next(r for r in result if r["goal_id"] == goal.id)
        assert row["required_per_month"] > 0
        assert "Necessário" in row["risk_reason"]
        assert row["risk_reason"].strip().endswith("no prazo.")
        assert row.get("impact_score") is not None
        assert row["impact_score"] == row["gap"]

    def test_goals_at_risk_ordered_by_impact_score(self, db, test_user):
        """Metas retornadas ordenadas por impact_score (gap) DESC."""
        today = date.today()
        g1 = Goal(
            name="Meta menor gap",
            target_amount=1000.0,
            current_amount=800.0,
            target_date=datetime.combine(today + timedelta(days=90), datetime.min.time()),
            description="", category="a", priority="low", status="active", user_id=test_user.id,
        )
        g2 = Goal(
            name="Meta maior gap",
            target_amount=5000.0,
            current_amount=500.0,
            target_date=datetime.combine(today + timedelta(days=90), datetime.min.time()),
            description="", category="b", priority="low", status="active", user_id=test_user.id,
        )
        db.add_all([g1, g2])
        db.commit()
        db.refresh(g1)
        db.refresh(g2)
        result = compute_goals_at_risk(test_user.id, db)
        row1 = next(r for r in result if r["goal_id"] == g1.id)
        row2 = next(r for r in result if r["goal_id"] == g2.id)
        assert row1["impact_score"] == 200.0
        assert row2["impact_score"] == 4500.0
        # Lista ordenada por impact_score DESC: maior gap primeiro
        scores = [r["impact_score"] for r in result]
        assert scores == sorted(scores, reverse=True)

    def test_goal_current_monthly_rate(self, db, test_user):
        """_goal_current_monthly_rate: ritmo = current_amount / meses desde criação."""
        today = date.today()
        goal = Goal(
            name="Meta",
            target_amount=1000.0,
            current_amount=200.0,
            target_date=datetime.combine(today + timedelta(days=30), datetime.min.time()),
            description="",
            category="z",
            priority="low",
            status="active",
            user_id=test_user.id,
        )
        db.add(goal)
        db.commit()
        db.refresh(goal)
        # Simular meta criada há 60 dias: ritmo = 200 / 2 meses = 100 R$/mês
        goal.created_at = datetime.combine(today - timedelta(days=60), datetime.min.time())
        db.commit()
        db.refresh(goal)
        rate = _goal_current_monthly_rate(goal, today)
        assert rate > 0
        assert abs(rate - 100.0) < 20.0  # ~100/mês em 2 meses


class TestComputeInsights:
    """compute_insights: payload versionado e estrutura."""

    def test_insights_include_version(self, db, test_user):
        data = compute_insights(test_user.id, db)
        assert data["version"] == 1
        assert "category_monthly_variation" in data
        assert "goals_at_risk" in data
        assert "computed_at" in data
        # Regressão: itens com impact_score (ranking por impacto)
        for item in data["category_monthly_variation"]:
            assert "impact_score" in item
        for item in data["goals_at_risk"]:
            assert "impact_score" in item

    def test_explanations_match_values(
        self, db, test_user, test_account, expense_category
    ):
        """Textos explicativos batem com os valores retornados."""
        curr_first, _ = _month_bounds(0)
        _add_expense(db, test_user.id, test_account.id, expense_category.id, 75.50, curr_first)
        result = compute_category_monthly_variation(test_user.id, db)
        row = next(r for r in result if r["category_id"] == expense_category.id)
        assert "75.50" in row["explanation"]
        assert row["current_amount"] == 75.50

    def test_insights_include_insight_hash(self, db, test_user, test_account, expense_category):
        """Cada item tem insight_hash para feedback visto/ignorado."""
        curr_first, _ = _month_bounds(0)
        _add_expense(db, test_user.id, test_account.id, expense_category.id, 50.0, curr_first)
        data = compute_insights(test_user.id, db)
        cat_row = next(r for r in data["category_monthly_variation"] if r["category_id"] == expense_category.id)
        assert "insight_hash" in cat_row
        assert cat_row["insight_hash"].startswith("category_variation:")


class TestInsightFeedback:
    """Feedback visto/ignorado: insight não reaparece quando ignorado; TTL 30 dias."""

    def test_ignored_insight_not_returned(self, db, test_user, test_account, expense_category):
        """Insight marcado como ignorado não reaparece na resposta filtrada."""
        curr_first, _ = _month_bounds(0)
        _add_expense(db, test_user.id, test_account.id, expense_category.id, 100.0, curr_first)
        data = compute_insights(test_user.id, db)
        cat_row = next(r for r in data["category_monthly_variation"] if r["category_id"] == expense_category.id)
        insight_hash = cat_row["insight_hash"]
        db.add(InsightFeedback(
            user_id=test_user.id,
            insight_type="category_variation",
            insight_hash=insight_hash,
            status="ignored",
        ))
        db.commit()
        ignored = _get_ignored_hashes(test_user.id, db)
        assert insight_hash in ignored
        filtered = _filter_ignored(data, ignored)
        hashes_in_filtered = [r.get("insight_hash") for r in filtered["category_monthly_variation"]]
        assert insight_hash not in hashes_in_filtered

    def test_ttl_ignored_expired(self, db, test_user):
        """Feedback ignorado com mais de 30 dias não está em _get_ignored_hashes (TTL respeitado)."""
        old_hash = "goal_at_risk:old-goal-id"
        fb = InsightFeedback(
            user_id=test_user.id,
            insight_type="goal_at_risk",
            insight_hash=old_hash,
            status="ignored",
        )
        db.add(fb)
        db.commit()
        db.refresh(fb)
        # Simular created_at há 31 dias (TTL = 30)
        fb.created_at = datetime.utcnow() - timedelta(days=31)
        db.commit()
        ignored = _get_ignored_hashes(test_user.id, db)
        assert old_hash not in ignored


class TestUserInsightPreferences:
    """Preferências de insights: filtro por enable_category_variation e enable_goals_at_risk."""

    def test_preferences_default_true(self, db, test_user):
        """Sem linha em user_insight_preferences: ambos True (padrão)."""
        prefs = _get_user_preferences(test_user.id, db)
        assert prefs["enable_category_variation"] is True
        assert prefs["enable_goals_at_risk"] is True

    def test_preferences_apply_filter(self, db, test_user):
        """_apply_preferences esvazia lista quando flag é False."""
        data = {
            "version": 1,
            "category_monthly_variation": [{"category_id": "x", "category_name": "X"}],
            "goals_at_risk": [{"goal_id": "y", "goal_name": "Y"}],
            "computed_at": "2025-02-03T00:00:00",
        }
        out = _apply_preferences(data, {"enable_category_variation": False, "enable_goals_at_risk": True})
        assert out["category_monthly_variation"] == []
        assert len(out["goals_at_risk"]) == 1

        out2 = _apply_preferences(data, {"enable_category_variation": True, "enable_goals_at_risk": False})
        assert len(out2["category_monthly_variation"]) == 1
        assert out2["goals_at_risk"] == []

    def test_preferences_persisted(self, db, test_user):
        """Preferências salvas são retornadas por _get_user_preferences."""
        db.add(
            UserInsightPreferences(
                user_id=test_user.id,
                enable_category_variation=True,
                enable_goals_at_risk=False,
            )
        )
        db.commit()
        prefs = _get_user_preferences(test_user.id, db)
        assert prefs["enable_category_variation"] is True
        assert prefs["enable_goals_at_risk"] is False


class TestIncrementalCache:
    """Cache incremental: apenas entidades alteradas disparam recálculo."""

    def test_transactions_max_updated_at_none_without_expenses(self, db, test_user):
        """Sem transações de despesa no período: get_transactions_max_updated_at retorna None."""
        result = get_transactions_max_updated_at(test_user.id, db)
        assert result is None

    def test_transactions_max_updated_at_after_expense(
        self, db, test_user, test_account, expense_category
    ):
        """Transação de despesa no período: max updated_at/created_at retornado."""
        curr_first, _ = _month_bounds(0)
        _add_expense(
            db, test_user.id, test_account.id, expense_category.id, 50.0, curr_first
        )
        result = get_transactions_max_updated_at(test_user.id, db)
        assert result is not None

    def test_goals_max_updated_at_none_without_goals(self, db, test_user):
        """Sem metas ativas: get_goals_max_updated_at retorna None."""
        result = get_goals_max_updated_at(test_user.id, db)
        assert result is None

    def test_goals_max_updated_at_after_goal(self, db, test_user):
        """Meta ativa: get_goals_max_updated_at retornado."""
        today = date.today()
        g = Goal(
            name="Meta",
            target_amount=1000.0,
            current_amount=100.0,
            target_date=datetime.combine(today + timedelta(days=90), datetime.min.time()),
            description="",
            category="x",
            priority="low",
            status="active",
            user_id=test_user.id,
        )
        db.add(g)
        db.commit()
        result = get_goals_max_updated_at(test_user.id, db)
        assert result is not None
