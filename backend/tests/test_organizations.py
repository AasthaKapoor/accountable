def test_create_and_read(client, make):
    org = make.org("  Acme Ltd  ", website="acme.co.uk", industry="Retail", notes="Big")
    assert org["name"] == "Acme Ltd"
    response = client.get(f"/api/organizations/{org['id']}")
    assert response.status_code == 200
    body = response.json()
    assert body["website"] == "acme.co.uk"
    assert body["contacts"] == [] and body["deals"] == []


def test_name_required(client):
    for name in ("", "   "):
        response = client.post("/api/organizations", json={"name": name})
        assert response.status_code == 422
        assert response.json() == {"errors": {"name": "Required"}}
    response = client.post("/api/organizations", json={})
    assert response.json()["errors"]["name"] == "Required"


def test_name_too_long(client):
    response = client.post("/api/organizations", json={"name": "x" * 201})
    assert response.status_code == 422
    assert "name" in response.json()["errors"]


def test_update(client, make):
    org = make.org()
    response = client.patch(f"/api/organizations/{org['id']}", json={"name": " New name ", "industry": ""})
    assert response.status_code == 200
    assert response.json()["name"] == "New name"
    assert response.json()["industry"] is None
    response = client.patch(f"/api/organizations/{org['id']}", json={"name": None})
    assert response.status_code == 422


def test_unknown_returns_404(client):
    assert client.get("/api/organizations/999").status_code == 404
    assert client.patch("/api/organizations/999", json={"name": "x"}).status_code == 404
    assert client.delete("/api/organizations/999").status_code == 404


def test_read_includes_contacts_deals_and_totals(client, make):
    org = make.org()
    ann = make.contact(org)
    make.deal(org, ann, value_pence=1_000_00, stage="proposal")
    make.deal(org, ann, name="Done", value_pence=5_000_00, stage="won")
    body = client.get(f"/api/organizations/{org['id']}").json()
    assert [c["name"] for c in body["contacts"]] == ["Ann Smith"]
    assert len(body["deals"]) == 2
    assert body["totals"] == {"value_pence": 1_000_00, "expected_pence": 500_00, "count": 1}


def test_delete_blocked_with_contacts_and_deals(client, make):
    org = make.org("Acme Ltd")
    ann = make.contact(org, "Ann")
    make.contact(org, "Bob")
    make.contact(org, "Cat")
    make.deal(org, ann, name="One")
    make.deal(org, ann, name="Two")
    response = client.delete(f"/api/organizations/{org['id']}")
    assert response.status_code == 409
    body = response.json()
    assert body["message"] == "Acme Ltd can't be deleted because it still has 3 contacts and 2 deals."
    assert body["counts"] == {"contacts": 3, "deals": 2}
    assert len(body["blocking"]) == 5
    assert client.get(f"/api/organizations/{org['id']}").status_code == 200


def test_delete_blocked_with_one_contact(client, make):
    org = make.org("Acme Ltd")
    make.contact(org)
    body = client.delete(f"/api/organizations/{org['id']}").json()
    assert body["message"] == "Acme Ltd can't be deleted because it still has 1 contact."


def test_delete_when_empty(client, make):
    org = make.org()
    assert client.delete(f"/api/organizations/{org['id']}").status_code == 204
    assert client.get(f"/api/organizations/{org['id']}").status_code == 404
