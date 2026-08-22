"""shared fixtures for the api tests (fresh db + TestClient)"""

import pytest
from fastapi.testclient import TestClient

from database.db import DB_PATH, init_db, seed_data

# fresh db before importing main so the app sees clean tables
if DB_PATH.exists():
    DB_PATH.unlink()

from main import app  # noqa: E402


@pytest.fixture()
def client():
    init_db()
    seed_data()
    with TestClient(app) as test_client:
        yield test_client
