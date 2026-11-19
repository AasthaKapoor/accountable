"""Stage-change effects (spec section 3.2), by PATCH and by move."""

import pytest


@pytest.fixture
def deal(make):
    org = make.org("Acme")
    contact = make.contact(org, "Ann", status="qualified")
    return make.deal(org, contact, name="Big deal", stage="proposal", probability=60, close_date="2027-01-31")


def change_by_patch(client, deal, stage):
    response = client.patch(f"/api/deals/{deal['id']}", json={"stage": stage})
    assert response.status_code == 200, response.json()
    return response.json()


def change_by_move(client, deal, stage):
    response = client.post(f"/api/deals/{deal['id']}/move", json={"stage": stage})
    assert response.status_code == 200, response.json()
    return response.json()["deal"]


@pytest.fixture(params=[change_by_patch, change_by_move], ids=["patch", "move"])
def change(request, client):
    return lambda deal, stage: request.param(client, deal, stage)


def test_probability_resets_and_manual_clears(change, deal):
    assert deal["probability_is_manual"] is True
    updated = change(deal, "negotiation")
    assert updated["probability"] == 75
    assert updated["probability_is_manual"] is False


def test_patch_with_probability_and_stage_takes_the_stage_default(client, deal):
    response = client.patch(f"/api/deals/{deal['id']}", json={"stage": "negotiation", "probability": 30})
    assert response.json()["probability"] == 75


def test_stage_change_activity(client, change, deal):
    change(deal, "negotiation")
    timeline = client.get(f"/api/deals/{deal['id']}").json()["timeline"]
    assert len(timeline) == 1
    entry = timeline[0]
    assert entry["type"] == "stage_change"
    assert entry["description"] == "Moved from Proposal to Negotiation"
    assert entry["deal_id"] == deal["id"]
    assert entry["contact_id"] == deal["contact_id"]
    assert entry["new_stage"] == "negotiation"
    contact_timeline = client.get(f"/api/contacts/{deal['contact_id']}").json()["timeline"]
    assert [a["id"] for a in contact_timeline] == [entry["id"]]


def test_same_stage_is_not_a_change(client, deal):
    client.patch(f"/api/deals/{deal['id']}", json={"stage": "proposal"})
    assert client.get(f"/api/deals/{deal['id']}").json()["timeline"] == []


@pytest.mark.parametrize("stage", ["won", "lost"])
def test_won_and_lost_set_close_date_to_today(change, deal, stage):
    updated = change(deal, stage)
    assert updated["close_date"] == "2026-11-19"
    assert updated["probability"] == (100 if stage == "won" else 0)


def test_close_date_stays_editable_after_won(client, change, deal):
    change(deal, "won")
    response = client.patch(f"/api/deals/{deal['id']}", json={"close_date": "2026-11-10"})
    assert response.json()["close_date"] == "2026-11-10"


def test_won_makes_contact_a_customer(client, change, deal):
    change(deal, "won")
    assert client.get(f"/api/contacts/{deal['contact_id']}").json()["status"] == "customer"


def test_lost_leaves_contact_status(client, change, deal):
    change(deal, "lost")
    assert client.get(f"/api/contacts/{deal['contact_id']}").json()["status"] == "qualified"


def test_furthest_stage_moves_forward_never_back(change, deal):
    assert deal["furthest_stage"] == "proposal"
    deal = change(deal, "negotiation")
    assert deal["furthest_stage"] == "negotiation"
    deal = change(deal, "qualified")
    assert deal["furthest_stage"] == "negotiation"
    deal = change(deal, "won")
    assert deal["furthest_stage"] == "negotiation"
