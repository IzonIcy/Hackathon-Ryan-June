"""rate limit middleware tests — paid-endpoint protection"""

import pytest
from fastapi.testclient import TestClient

import main
from database.db import init_db, seed_data
from rate_limit import get_analyze_rate_limit


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("ANALYZE_RATE_LIMIT_PER_MINUTE", "3")
    init_db()
    seed_data()
    with TestClient(main.app) as test_client:
        yield test_client


def test_default_limit_is_sane(monkeypatch):
    monkeypatch.delenv("ANALYZE_RATE_LIMIT_PER_MINUTE", raising=False)
    assert get_analyze_rate_limit() == 10


def test_zero_disables_limiting(monkeypatch):
    monkeypatch.setenv("ANALYZE_RATE_LIMIT_PER_MINUTE", "0")
    assert get_analyze_rate_limit() == 0


def test_garbage_value_falls_back_to_default(monkeypatch):
    monkeypatch.setenv("ANALYZE_RATE_LIMIT_PER_MINUTE", "lots")
    assert get_analyze_rate_limit() == 10


def test_analyze_requests_get_limited(client):
    """The 4th request inside the window must hit 429 before any paid call."""
    payload = {"job_id": 1, "image": "aGVsbG8="}

    statuses = []
    for _ in range(4):
        res = client.post("/api/frames/analyze/async", json=payload)
        # 202 = accepted (rate limiter passed it on), 404 = job missing in a
        # fresh DB — both prove the limiter let it through. 429 = limited.
        statuses.append(res.status_code)

    assert statuses[-1] == 429, f"expected final request to be limited: {statuses}"


def test_429_includes_retry_after_header(client):
    payload = {"job_id": 1, "image": "aGVsbG8="}
    for _ in range(3):
        client.post("/api/frames/analyze/async", json=payload)
    res = client.post("/api/frames/analyze/async", json=payload)
    assert res.status_code == 429
    assert int(res.headers["Retry-After"]) >= 1


def test_other_endpoints_are_not_limited(client):
    """Health checks and reads must never trip the paid-endpoint limiter."""
    for _ in range(6):
        assert client.get("/api/health").status_code == 200


def test_limit_disabled_with_zero(client, monkeypatch):
    monkeypatch.setenv("ANALYZE_RATE_LIMIT_PER_MINUTE", "0")
    payload = {"job_id": 1, "image": "aGVsbG8="}
    for _ in range(5):
        res = client.post("/api/frames/analyze/async", json=payload)
        assert res.status_code != 429
