import pytest


@pytest.fixture
def acme(make):
    org = make.org("Acme")
    return org, make.contact(org, "Ann")


def test_create_takes_stage_probability(make, acme):
    deal = make.deal(*acme, stage="proposal")
    assert deal["probability"] == 50
    assert deal["probability_is_manual"] is False
    assert deal["furthest_stage"] == "proposal"
    assert deal["organization_name"] == "Acme"
    assert deal["contact_name"] == "Ann"


def test_create_with_other_probability_is_manual(make, acme):
    deal = make.deal(*acme, stage="proposal", probability=60)
    assert deal["probability"] == 60
    assert deal["probability_is_manual"] is True


@pytest.mark.parametrize("field", ["name", "organization_id", "contact_id", "stage", "value_pence", "close_date"])
def test_required_fields(client, acme, field):
    org, contact = acme
    body = {
        "name": "Deal",
        "organization_id": org["id"],
        "contact_id": contact["id"],
        "stage": "new",
        "value_pence": 100,
        "close_date": "2026-12-01",
    }
    del body[field]
    response = client.post("/api/deals", json=body)
    assert response.status_code == 422
    assert field in response.json()["errors"]


def test_value_not_negative(client, acme):
    org, contact = acme
    response = client.post(
        "/api/deals",
        json={"name": "D", "organization_id": org["id"], "contact_id": contact["id"], "stage": "new", "value_pence": -1, "close_date": "2026-12-01"},
    )
    assert response.status_code == 422
    assert response.json()["errors"]["value_pence"] == "Must be 0 or more"


def test_contact_must_belong_to_organization(client, make, acme):
    org, _ = acme
    other = make.org("Other")
    stranger = make.contact(other, "Stranger")
    response = client.post(
        "/api/deals",
        json={"name": "D", "organization_id": org["id"], "contact_id": stranger["id"], "stage": "new", "value_pence": 1, "close_date": "2026-12-01"},
    )
    assert response.status_code == 422
    assert "contact_id" in response.json()["errors"]


def test_edit_contact_must_belong_to_organization(client, make, acme):
    deal = make.deal(*acme)
    other = make.org("Other")
    stranger = make.contact(other, "Stranger")
    response = client.patch(f"/api/deals/{deal['id']}", json={"contact_id": stranger["id"]})
    assert response.status_code == 422
    response = client.patch(f"/api/deals/{deal['id']}", json={"organization_id": other["id"]})
    assert response.status_code == 422
    response = client.patch(f"/api/deals/{deal['id']}", json={"organization_id": other["id"], "contact_id": stranger["id"]})
    assert response.status_code == 200
    assert response.json()["organization_name"] == "Other"


def test_editing_probability_marks_it_manual(client, make, acme):
    deal = make.deal(*acme, stage="qualified")
    response = client.patch(f"/api/deals/{deal['id']}", json={"probability": 40})
    assert response.json()["probability"] == 40
    assert response.json()["probability_is_manual"] is True


def test_same_probability_stays_automatic(client, make, acme):
    deal = make.deal(*acme, stage="qualified")
    response = client.patch(f"/api/deals/{deal['id']}", json={"probability": 25, "name": "Renamed"})
    assert response.json()["probability_is_manual"] is False


@pytest.mark.parametrize("stage", ["won", "lost"])
def test_won_and_lost_probability_cant_be_edited(client, make, acme, stage):
    deal = make.deal(*acme, stage=stage)
    response = client.patch(f"/api/deals/{deal['id']}", json={"probability": 50})
    assert response.status_code == 422
    assert "probability" in response.json()["errors"]


def test_probability_range(client, make, acme):
    deal = make.deal(*acme)
    assert client.patch(f"/api/deals/{deal['id']}", json={"probability": 101}).status_code == 422


def test_is_late_flag(client, make, acme):
    late = make.deal(*acme, close_date="2026-11-18")
    due_today = make.deal(*acme, close_date="2026-11-19")
    assert late["is_late"] is True
    assert due_today["is_late"] is False


def test_delete_keeps_activities(client, make, acme):
    deal = make.deal(*acme, name="Big deal")
    client.patch(f"/api/deals/{deal['id']}", json={"stage": "qualified"})
    note = make.activity(deal_id=deal["id"])
    assert client.delete(f"/api/deals/{deal['id']}").status_code == 204
    assert client.get(f"/api/deals/{deal['id']}").status_code == 404
    recent = client.get("/api/dashboard").json()["recent_activity"]
    assert {a["type"] for a in recent} == {"stage_change", "call"}
    for activity in recent:
        assert activity["deal_id"] is None
        assert activity["subject_label"] == "Big deal"
    assert note["id"] in {a["id"] for a in recent}


def test_new_deal_goes_to_bottom_of_column(client, make, acme):
    first = make.deal(*acme, name="First", stage="new")
    second = make.deal(*acme, name="Second", stage="new")
    assert second["position"] > first["position"]
