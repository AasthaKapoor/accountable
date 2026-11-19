from datetime import UTC, date, datetime

import pytest
from fastapi.testclient import TestClient

from accountable import clock, db

# Every test runs on this day, at noon UTC.
TODAY = date(2026, 11, 19)
NOW = datetime(2026, 11, 19, 12, 0, tzinfo=UTC)


@pytest.fixture(autouse=True)
def fixed_clock(monkeypatch):
    monkeypatch.setattr(clock, "now", lambda: NOW)
    monkeypatch.setattr(clock, "today", lambda: TODAY)


@pytest.fixture
def db_file(tmp_path, monkeypatch):
    """A new, empty database file per test."""
    path = tmp_path / "test.db"
    monkeypatch.setenv("ACCOUNTABLE_DB", str(path))
    return path


@pytest.fixture
def engine(db_file):
    engine = db.init_engine(db_file)
    db.create_tables(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def client(engine):
    """An API client on an empty database (the app sees the file exists, so it doesn't seed)."""
    from accountable.main import app

    with TestClient(app) as c:
        yield c


class Factory:
    """Creates records through the API, filling in anything not given."""

    def __init__(self, client):
        self.client = client

    def _post(self, path, body):
        response = self.client.post(path, json=body)
        assert response.status_code == 201, response.json()
        return response.json()

    def org(self, name="Acme Ltd", **fields):
        return self._post("/api/organizations", {"name": name, **fields})

    def contact(self, org, name="Ann Smith", **fields):
        return self._post("/api/contacts", {"name": name, "organization_id": org["id"], **fields})

    def deal(self, org, contact, name="Big deal", stage="new", value_pence=1_000_00, close_date="2026-12-31", **fields):
        body = {
            "name": name,
            "organization_id": org["id"],
            "contact_id": contact["id"],
            "stage": stage,
            "value_pence": value_pence,
            "close_date": close_date,
            **fields,
        }
        return self._post("/api/deals", body)

    def activity(self, description="Called them", type="call", **fields):
        return self._post("/api/activities", {"type": type, "description": description, **fields})


@pytest.fixture
def make(client):
    return Factory(client)
