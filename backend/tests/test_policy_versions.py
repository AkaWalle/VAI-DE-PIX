"""
Trilha 11 — Testes de compatibilidade de políticas financeiras versionadas.
V1 continua válida; mudança futura não quebra histórico (nova versão).
"""
import pytest

from domain.financial_policies.ledger_v1 import (
    VERSION as LEDGER_VERSION,
    ENTRY_TYPES,
    APPEND_ONLY,
)
from domain.financial_policies.transfers_v1 import (
    VERSION as TRANSFERS_VERSION,
    SAME_USER_REQUIRED,
    NO_SELF_TRANSFER,
    TRANSACTION_TYPE_TRANSFER,
)
from domain.financial_policies.goals_v1 import (
    VERSION as GOALS_VERSION,
    STATUS_VALUES,
    PRIORITY_VALUES,
    TARGET_AMOUNT_POSITIVE,
    CURRENT_NOT_EXCEED_TARGET,
)


def test_ledger_v1_version_and_rules():
    """V1 do ledger: versão explícita e regras consistentes."""
    assert LEDGER_VERSION == "1"
    assert set(ENTRY_TYPES) == {"credit", "debit"}
    assert APPEND_ONLY is True


def test_transfers_v1_version_and_rules():
    """V1 de transferências: versão explícita e regras consistentes."""
    assert TRANSFERS_VERSION == "1"
    assert SAME_USER_REQUIRED is True
    assert NO_SELF_TRANSFER is True
    assert TRANSACTION_TYPE_TRANSFER == "transfer"


def test_goals_v1_version_and_rules():
    """V1 de metas: versão explícita e regras consistentes."""
    assert GOALS_VERSION == "1"
    assert "active" in STATUS_VALUES
    assert "achieved" in STATUS_VALUES
    assert set(PRIORITY_VALUES) == {"low", "medium", "high"}
    assert TARGET_AMOUNT_POSITIVE is True
    assert CURRENT_NOT_EXCEED_TARGET is True


def test_future_change_requires_new_version():
    """
    Mudança futura não quebra histórico: adicionar ledger_v2 não altera ledger_v1.
    Este teste importa apenas v1; quando existir v2, testes de v1 continuam passando.
    """
    from domain.financial_policies import LEDGER_V1_VERSION
    assert LEDGER_V1_VERSION == "1"
