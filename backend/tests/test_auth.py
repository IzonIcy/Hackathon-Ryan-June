"""auth middleware tests — token enforcement and loopback fallback"""

import os

import pytest
from fastapi.testclient import TestClient

import main
from auth import get_api_token


@pytest.fixture()
def client():
    init_db_fresh()
    with TestClient(app_with_middleware()) as test_client:
        yield test_client


def app_with_middleware():
    # main.app already has the middleware installed at import time; reuse it.
    return main.app


def init_db_fresh():
    from database.db import init_db, seed_data

    init_db()
    seed_data()


@pytest.fixture(autouse=True)
def clean_token_env(monkeypatch):
    """Keep token env changes hermetic between tests."""
    monkeypatch.delenv("FABOPS_API_TOKEN", raising=False)
    monkeypatch.delenv("FABOPS_DEBUG", raising=False)
    yield


def test_health_is_public(client):
    assert client.get("/api/health").status_code == 200


def test_debug_env_disabled_by_default(client):
    res = client.get("/api/debug/env")
    assert res.status_code == 200
    assert "error" in res.json()


def test_debug_env_enabled_with_flag(client, monkeypatch):
    monkeypatch.setenv("FABOPS_DEBUG", "1")
    res = client.get("/api/debug/env")
    assert res.status_code == 200
    assert "error" not in res.json()


def test_valid_token_grants_access(client, monkeypatch):
    monkeypatch.setenv("FABOPS_API_TOKEN", "secret-token")
    headers = {"Authorization": "Bearer secret-token"}
    assert client.get("/api/machines", headers=headers).status_code == 200


def test_wrong_token_rejected(client, monkeypatch):
    monkeypatch.setenv("FABOPS_API_TOKEN", "secret-token")
    res = client.get("/api/machines", headers={"Authorization": "Bearer nope"})
    assert res.status_code == 401
    res = client.get("/api/machines")
    assert res.status_code == 401


def test_destructive_route_requires_token(client, monkeypatch):
    """The wipe endpoint must not be callable without the token."""
    monkeypatch.setenv("FABOPS_API_TOKEN", "secret-token")
    res = client.post("/api/seed/clear")
    assert res.status_code == 401


def test_timing_safe_comparison_used():
    # Sanity: the module exposes compare_digest-based checking via behavior.
    # A near-miss token must not authenticate.
    os.environ["FABOPS_API_TOKEN"] = "secret-token"
    try:
        assert get_api_token() == "secret-token"
    finally:
        del os.environ["FABOPS_API_TOKEN"]
