"""Validação de upload de extrato (tipo/tamanho) sem persistir conteúdo."""
import io

import pytest
from fastapi import status


def _oversized_csv_bytes() -> bytes:
    """Ligeiramente acima de 5 MiB."""
    target = 5 * 1024 * 1024 + 128
    return b"0" * target


def test_import_validate_accepts_small_csv(client, auth_headers):
    content = b"date,amount,desc\n2024-01-01,10.00,test\n"
    files = {"file": ("extrato.csv", io.BytesIO(content), "text/csv")}
    r = client.post(
        "/api/transactions/import/validate",
        files=files,
        headers=auth_headers,
    )
    assert r.status_code == status.HTTP_200_OK
    data = r.json()
    assert data.get("ok") is True
    assert data.get("size_bytes") == len(content)
    assert data.get("max_bytes") == 5 * 1024 * 1024


def test_import_validate_rejects_bad_extension(client, auth_headers):
    files = {"file": ("x.pdf", io.BytesIO(b"%PDF"), "application/pdf")}
    r = client.post(
        "/api/transactions/import/validate",
        files=files,
        headers=auth_headers,
    )
    assert r.status_code == status.HTTP_400_BAD_REQUEST


def test_import_validate_rejects_oversize(client, auth_headers):
    big = _oversized_csv_bytes()
    files = {"file": ("big.csv", io.BytesIO(big), "text/csv")}
    r = client.post(
        "/api/transactions/import/validate",
        files=files,
        headers=auth_headers,
    )
    assert r.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE


def test_import_validate_requires_auth(client):
    files = {"file": ("e.csv", io.BytesIO(b"a\n1\n"), "text/csv")}
    r = client.post("/api/transactions/import/validate", files=files)
    assert r.status_code in (
        status.HTTP_401_UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN,
    )
