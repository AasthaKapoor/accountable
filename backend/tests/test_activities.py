import pytest


@pytest.fixture
def acme(make):
    org = make.org("Acme")
    ann = make.contact(org, "Ann")
    return org, ann, make.deal(org, ann, name="Big deal")


def test_must_link_to_a_contact_or_deal(client):
    response = client.post("/api/activities", json={"type": "note", "description": "Hello"})
    assert response.status_code == 422
    assert "contact_id" in response.json()["errors"]


def test_on_a_contact(make, acme):
    _, ann, _ = acme
    activity = make.activity(contact_id=ann["id"])
    assert activity["contact_id"] == ann["id"]
    assert activity["deal_id"] is None
    assert activity["subject_label"] == "Ann"


def test_on_a_deal_also_links_the_main_contact(client, make, acme):
    _, ann, deal = acme
    activity = make.activity(deal_id=deal["id"])
    assert activity["deal_id"] == deal["id"]
    assert activity["contact_id"] == ann["id"]
    assert activity["subject_label"] == "Big deal"
    assert [a["id"] for a in client.get(f"/api/contacts/{ann['id']}").json()["timeline"]] == [activity["id"]]
    assert [a["id"] for a in client.get(f"/api/deals/{deal['id']}").json()["timeline"]] == [activity["id"]]


def test_occurred_at_defaults_to_now(make, acme):
    activity = make.activity(contact_id=acme[1]["id"])
    assert activity["occurred_at"] == "2026-11-19T12:00:00Z"


def test_occurred_at_given_with_offset_is_stored_in_utc(make, acme):
    activity = make.activity(contact_id=acme[1]["id"], occurred_at="2026-11-18T10:30:00+01:00")
    assert activity["occurred_at"] == "2026-11-18T09:30:00Z"


def test_description_required(client, acme):
    response = client.post("/api/activities", json={"type": "note", "description": "  ", "contact_id": acme[1]["id"]})
    assert response.json()["errors"] == {"description": "Required"}


def test_stage_change_cant_be_created(client, acme):
    response = client.post("/api/activities", json={"type": "stage_change", "description": "Moved", "contact_id": acme[1]["id"]})
    assert response.status_code == 422
    assert "type" in response.json()["errors"]


def test_update(client, make, acme):
    activity = make.activity(contact_id=acme[1]["id"], follow_up_date="2026-11-25")
    assert activity["follow_up_status"] == "upcoming"
    response = client.patch(f"/api/activities/{activity['id']}", json={"description": "Changed", "follow_up_done": True})
    assert response.json()["description"] == "Changed"
    assert response.json()["follow_up_status"] is None


def test_stage_change_cant_be_edited_only_deleted(client, acme):
    _, _, deal = acme
    client.patch(f"/api/deals/{deal['id']}", json={"stage": "qualified"})
    entry = client.get(f"/api/deals/{deal['id']}").json()["timeline"][0]
    response = client.patch(f"/api/activities/{entry['id']}", json={"description": "Edited"})
    assert response.status_code == 422
    assert client.delete(f"/api/activities/{entry['id']}").status_code == 204
    assert client.get(f"/api/deals/{deal['id']}").json()["timeline"] == []


def test_delete(client, make, acme):
    activity = make.activity(contact_id=acme[1]["id"])
    assert client.delete(f"/api/activities/{activity['id']}").status_code == 204
    assert client.delete(f"/api/activities/{activity['id']}").status_code == 404


def test_timeline_newest_first(client, make, acme):
    ann = acme[1]
    make.activity("Second", contact_id=ann["id"], occurred_at="2026-11-10T09:00:00Z")
    make.activity("Third", contact_id=ann["id"], occurred_at="2026-11-12T09:00:00Z")
    make.activity("First", contact_id=ann["id"], occurred_at="2026-11-01T09:00:00Z")
    timeline = client.get(f"/api/contacts/{ann['id']}").json()["timeline"]
    assert [a["description"] for a in timeline] == ["Third", "Second", "First"]
