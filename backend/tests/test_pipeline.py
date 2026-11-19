def test_empty_board_has_all_six_stages(client):
    body = client.get("/api/pipeline").json()
    assert [c["stage"] for c in body["columns"]] == ["new", "qualified", "proposal", "negotiation", "won", "lost"]
    assert body["totals"] == {"value_pence": 0, "expected_pence": 0, "count": 0}


def test_columns_ordered_by_position_with_totals(client, make):
    org = make.org("Acme")
    ann = make.contact(org, "Ann")
    a = make.deal(org, ann, name="A", stage="proposal", value_pence=1_000_00)
    make.deal(org, ann, name="B", stage="proposal", value_pence=3_000_00, probability=33)
    client.post(f"/api/deals/{a['id']}/move", json={"stage": "proposal", "before_id": None, "after_id": None})
    make.deal(org, ann, name="W", stage="won", value_pence=9_000_00)
    make.deal(org, ann, name="L", stage="lost", value_pence=7_000_00)

    body = client.get("/api/pipeline").json()
    columns = {c["stage"]: c for c in body["columns"]}
    assert [d["name"] for d in columns["proposal"]["deals"]] == ["B", "A"]
    # 1,000 × 50% + 3,000 × 33% = 500 + 990
    assert columns["proposal"]["totals"] == {"value_pence": 4_000_00, "expected_pence": 1_490_00, "count": 2}
    assert columns["new"]["totals"] == {"value_pence": 0, "expected_pence": 0, "count": 0}
    assert columns["won"]["totals"] == {"value_pence": None, "expected_pence": None, "count": 1}
    assert columns["lost"]["totals"]["count"] == 1
    assert body["totals"] == {"value_pence": 4_000_00, "expected_pence": 1_490_00, "count": 2}


def test_cards_carry_what_the_board_shows(client, make):
    org = make.org("Acme")
    ann = make.contact(org, "Ann")
    make.deal(org, ann, name="Late one", stage="new", close_date="2026-11-01")
    card = client.get("/api/pipeline").json()["columns"][0]["deals"][0]
    assert card["organization_name"] == "Acme"
    assert card["is_late"] is True
    assert card["probability"] == 10
    assert card["close_date"] == "2026-11-01"
