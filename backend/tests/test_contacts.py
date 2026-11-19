def test_create_defaults_to_lead(client, make):
    org = make.org()
    contact = make.contact(org, email="ann@acme.co.uk")
    assert contact["status"] == "lead"
    assert contact["organization_name"] == "Acme Ltd"


def test_organization_required(client):
    response = client.post("/api/contacts", json={"name": "Ann"})
    assert response.status_code == 422
    assert response.json()["errors"] == {"organization_id": "Required"}


def test_unknown_organization(client):
    response = client.post("/api/contacts", json={"name": "Ann", "organization_id": 99})
    assert response.status_code == 422
    assert "organization_id" in response.json()["errors"]


def test_name_required(client, make):
    org = make.org()
    response = client.post("/api/contacts", json={"name": " ", "organization_id": org["id"]})
    assert response.json()["errors"] == {"name": "Required"}


def test_email_checked_when_given(client, make):
    org = make.org()
    response = client.post("/api/contacts", json={"name": "Ann", "organization_id": org["id"], "email": "not-an-email"})
    assert response.status_code == 422
    assert "email" in response.json()["errors"]
    assert make.contact(org, email="")["email"] is None


def test_status_must_be_known(client, make):
    org = make.org()
    response = client.post("/api/contacts", json={"name": "Ann", "organization_id": org["id"], "status": "vip"})
    assert response.status_code == 422


def test_update(client, make):
    org = make.org()
    contact = make.contact(org)
    response = client.patch(f"/api/contacts/{contact['id']}", json={"status": "qualified", "phone": "0123"})
    assert response.json()["status"] == "qualified"
    assert response.json()["phone"] == "0123"


def test_move_to_another_organization(client, make):
    org = make.org("Acme")
    other = make.org("Other")
    contact = make.contact(org)
    response = client.patch(f"/api/contacts/{contact['id']}", json={"organization_id": other["id"]})
    assert response.status_code == 200
    assert response.json()["organization_name"] == "Other"


def test_move_blocked_while_main_contact_on_a_deal(client, make):
    org = make.org("Acme")
    other = make.org("Other")
    contact = make.contact(org)
    make.deal(org, contact, name="Big deal")
    response = client.patch(f"/api/contacts/{contact['id']}", json={"organization_id": other["id"]})
    assert response.status_code == 422
    assert "Big deal" in response.json()["errors"]["organization_id"]


def test_read_includes_organization_deals_and_timeline(client, make):
    org = make.org()
    contact = make.contact(org)
    make.deal(org, contact)
    make.activity(contact_id=contact["id"])
    body = client.get(f"/api/contacts/{contact['id']}").json()
    assert body["organization_name"] == "Acme Ltd"
    assert [d["name"] for d in body["deals"]] == ["Big deal"]
    assert [a["description"] for a in body["timeline"]] == ["Called them"]


def test_delete_blocked_while_main_contact(client, make):
    org = make.org()
    contact = make.contact(org, "Ann Smith")
    make.deal(org, contact, name="One")
    make.deal(org, contact, name="Two")
    response = client.delete(f"/api/contacts/{contact['id']}")
    assert response.status_code == 409
    body = response.json()
    assert body["message"] == "Ann Smith can't be deleted because they're the main contact on 2 deals."
    assert [b["name"] for b in body["blocking"]] == ["One", "Two"]


def test_delete_keeps_activities(client, make):
    org = make.org()
    contact = make.contact(org, "Ann Smith")
    activity = make.activity(contact_id=contact["id"])
    assert client.delete(f"/api/contacts/{contact['id']}").status_code == 204
    assert client.get(f"/api/contacts/{contact['id']}").status_code == 404
    recent = client.get("/api/dashboard").json()["recent_activity"]
    kept = next(a for a in recent if a["id"] == activity["id"])
    assert kept["contact_id"] is None
    assert kept["subject_label"] == "Ann Smith"
