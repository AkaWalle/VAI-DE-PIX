"""
Contrato monetário do sistema: toda entrada financeira é *_cents: int.
Nenhum float, Decimal, str, Union ambíguo ou coerção automática.

Estes testes impedem regressões: se alguém adicionar amount: float,
Union[int, float], ou remover validação strict, o CI falha.

"""
from __future__ import annotations

import inspect
from typing import Any, get_origin, get_args

import pytest

# Schemas usados na API (request body) — routers e schemas centralizados
from routers.transactions import TransactionCreate, TransactionUpdate
from routers.envelopes import EnvelopeCreate, EnvelopeUpdate
from routers.goals import GoalCreate, GoalUpdate
from schemas import SharedExpenseCreateSchema

# Para inspeção de rotas e OpenAPI
from main import app


# Palavras-chave que identificam campos monetários (entrada da API)
MONETARY_KEYWORDS = ("amount", "total", "balance", "value", "target")


def _is_optional_int(annotation: Any) -> bool:
    """True se o tipo for int ou Optional[int] (Union[int, None])."""
    if annotation is int:
        return True
    origin = get_origin(annotation)
    if origin is None:
        return False
    # Union[int, None] ou int | None
    args = get_args(annotation)
    if not args:
        return False
    return set(args) <= {int, type(None)}


def _is_forbidden_union(annotation: Any) -> bool:
    """True se for Union[int, float], Union[int, str], etc. (qualquer Union com não-int não-None)."""
    origin = get_origin(annotation)
    if origin is None:
        return False
    args = get_args(annotation)
    if not args:
        return False
    allowed = {int, type(None)}
    return not set(args) <= allowed


def assert_monetary_field_is_strict_int(model: type, *, allow_optional: bool = True) -> None:
    """
    Para cada campo cujo nome contenha amount/total/balance/value/target,
    exige int puro ou Optional[int]. Rejeita float, Decimal, str, Union ambíguo, Any.
    """
    assert hasattr(model, "model_fields"), f"{model.__name__} must be a Pydantic BaseModel"
    for name, field in model.model_fields.items():
        name_lower = name.lower()
        if "date" in name_lower:
            continue  # target_date etc. não são monetários
        if not any(kw in name_lower for kw in MONETARY_KEYWORDS):
            continue
        ann = field.annotation
        if ann is int:
            continue
        if allow_optional and _is_optional_int(ann):
            continue
        if ann is float:
            raise AssertionError(
                f"{model.__name__}.{name} must be int (centavos only), found float. "
                "No float in monetary input."
            )
        if str(ann).startswith(("Decimal", "decimal")):
            raise AssertionError(
                f"{model.__name__}.{name} must be int (centavos only), found Decimal. "
                "API must not accept Decimal in request body."
            )
        if ann is str or ann is type(None):
            raise AssertionError(
                f"{model.__name__}.{name} must be int (centavos only), found {ann}."
            )
        if _is_forbidden_union(ann):
            raise AssertionError(
                f"{model.__name__}.{name} must be int or Optional[int], no Union with float/str. "
                f"Found {ann}."
            )
        if ann is Any or (hasattr(Any, "__class__") and ann == Any):
            raise AssertionError(
                f"{model.__name__}.{name} must be int (centavos only), found Any."
            )
        if not _is_optional_int(ann):
            raise AssertionError(
                f"{model.__name__}.{name} must be int (centavos only), found {ann}."
            )


# ---------- ETAPA 1 — Testes por schema ----------

class TestTransactionSchemaContract:
    """TransactionCreate e TransactionUpdate: apenas amount_cents (int)."""

    def test_transaction_create_monetary_fields_strict_int(self):
        assert_monetary_field_is_strict_int(TransactionCreate)

    def test_transaction_update_monetary_fields_strict_int(self):
        assert_monetary_field_is_strict_int(TransactionUpdate, allow_optional=True)


class TestSharedExpenseSchemaContract:
    """SharedExpenseCreateSchema: total_cents (int)."""

    def test_shared_expense_create_monetary_fields_strict_int(self):
        assert_monetary_field_is_strict_int(SharedExpenseCreateSchema)


class TestEnvelopeSchemaContract:
    """EnvelopeCreate e EnvelopeUpdate: balance e target_amount em centavos (int)."""

    def test_envelope_create_monetary_fields_strict_int(self):
        assert_monetary_field_is_strict_int(EnvelopeCreate, allow_optional=True)

    def test_envelope_update_monetary_fields_strict_int(self):
        assert_monetary_field_is_strict_int(EnvelopeUpdate, allow_optional=True)


class TestGoalSchemaContract:
    """GoalCreate e GoalUpdate: devem usar int (centavos). Float aqui quebra o contrato."""

    def test_goal_create_monetary_fields_strict_int(self):
        assert_monetary_field_is_strict_int(GoalCreate, allow_optional=True)

    def test_goal_update_monetary_fields_strict_int(self):
        assert_monetary_field_is_strict_int(GoalUpdate, allow_optional=True)


# ---------- ETAPA 2 — Anti-coerção (string e bool falham) ----------

class TestTransactionRejectsStringAndBoolAmount:
    """POST /api/transactions: amount_cents como string ou bool deve retornar 422/400."""

    def test_transaction_rejects_string_amount(self, client, auth_headers, test_account, test_category):
        from datetime import datetime, timezone
        r = client.post(
            "/api/transactions",
            json={
                "date": datetime.now(timezone.utc).isoformat(),
                "account_id": test_account.id,
                "category_id": test_category.id,
                "type": "income",
                "amount_cents": "1000",
                "description": "Test",
                "tags": [],
            },
            headers=auth_headers,
        )
        assert r.status_code in (400, 422), f"Expected 400/422, got {r.status_code}: {r.json()}"

    def test_transaction_rejects_bool_amount(self, client, auth_headers, test_account, test_category):
        from datetime import datetime, timezone
        r = client.post(
            "/api/transactions",
            json={
                "date": datetime.now(timezone.utc).isoformat(),
                "account_id": test_account.id,
                "category_id": test_category.id,
                "type": "income",
                "amount_cents": True,
                "description": "Test",
                "tags": [],
            },
            headers=auth_headers,
        )
        assert r.status_code in (400, 422), f"Expected 400/422, got {r.status_code}: {r.json()}"


# ---------- ETAPA 3 — Proibir Union ambíguo ----------

def _monetary_fields_annotations(model: type) -> list[tuple[str, Any]]:
    """Lista (nome, annotation) de campos monetários (exclui target_date etc.)."""
    out = []
    for name, field in model.model_fields.items():
        if "date" in name.lower():
            continue
        if any(kw in name.lower() for kw in MONETARY_KEYWORDS):
            out.append((name, field.annotation))
    return out


class TestNoAmbiguousUnionInMonetaryFields:
    """Nenhum campo monetário pode ser Union[int, float], Union[int, str], etc."""

    @pytest.mark.parametrize("model", [
        TransactionCreate,
        TransactionUpdate,
        SharedExpenseCreateSchema,
        EnvelopeCreate,
        EnvelopeUpdate,
        GoalCreate,
        GoalUpdate,
    ])
    def test_no_union_int_float_or_str(self, model):
        for name, ann in _monetary_fields_annotations(model):
            assert not _is_forbidden_union(ann), (
                f"{model.__name__}.{name} has forbidden Union (e.g. Union[int, float]). "
                "Use int or Optional[int] only."
            )


# ---------- ETAPA 4 — Nenhum endpoint com parâmetro float ----------

def _iter_route_endpoints():
    """Gera (path, endpoint) para rotas que têm endpoint callable."""
    for route in app.routes:
        if hasattr(route, "path") and hasattr(route, "endpoint"):
            endpoint = route.endpoint
            if callable(endpoint):
                yield route.path, endpoint


class TestNoRouterAcceptsFloatParameter:
    """Nenhum endpoint da API pode ter parâmetro anotado como float (entrada monetária)."""

    def test_no_float_in_route_signatures(self):
        violations = []
        for path, endpoint in _iter_route_endpoints():
            try:
                sig = inspect.signature(endpoint)
            except (ValueError, TypeError):
                continue
            for param_name, param in sig.parameters.items():
                if param.annotation is float:
                    violations.append(f"{path} -> {param_name}: float")
        assert not violations, (
            "Endpoints with float parameter (monetary input must be int centavos): " + "; ".join(violations)
        )


# ---------- ETAPA 5 — OpenAPI: contratos de request sem float para dinheiro ----------

def _openapi_schemas_for_requests() -> dict[str, Any]:
    """Schemas de request body que podem conter campos monetários."""
    openapi = app.openapi()
    components = openapi.get("components") or {}
    schemas = components.get("schemas") or {}
    # Nomes que usamos nos routers/schemas
    request_names = {
        "TransactionCreate",
        "TransactionUpdate",
        "SharedExpenseCreateSchema",
        "EnvelopeCreate",
        "EnvelopeUpdate",
        "GoalCreate",
        "GoalUpdate",
    }
    return {k: v for k, v in schemas.items() if k in request_names}


class TestOpenApiMonetaryContract:
    """OpenAPI não deve expor tipo number (float) para campos monetários de request."""

    def test_openapi_monetary_request_fields_not_float(self):
        """
        Nos schemas de request financeiros, campos amount/total/balance/value/target
        devem ser integer, não number (float).
        """
        request_schemas = _openapi_schemas_for_requests()
        violations = []
        for schema_name, schema_def in request_schemas.items():
            props = schema_def.get("properties") or {}
            for prop_name, prop_def in props.items():
                if "date" in prop_name.lower():
                    continue
                if not any(kw in prop_name.lower() for kw in MONETARY_KEYWORDS):
                    continue
                prop_type = (prop_def or {}).get("type")
                if prop_type == "number":
                    violations.append(f"{schema_name}.{prop_name} has type 'number' (float); must be 'integer'")
        assert not violations, "OpenAPI monetary request fields must be integer: " + "; ".join(violations)
