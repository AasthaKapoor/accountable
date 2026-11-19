"""Dashboard figures checked against a small hand-built data set. Today is Thursday 19 Nov 2026."""

import pytest


@pytest.fixture
def data(client, make):
    org = make.org("Acme")
    ann = make.contact(org, "Ann")

    def deal(name, stage, pounds, close_date, path=()):
        """Create at `stage`, then move through `path` and set the close date."""
        d = make.deal(org, ann, name=name, stage=stage, value_pence=pounds * 100, close_date=close_date)
        for step in path:
            client.patch(f"/api/deals/{d['id']}", json={"stage": step})
        client.patch(f"/api/deals/{d['id']}", json={"close_date": close_date})
        return d

    deals = {
        "N1": deal("N1", "new", 1000, "2026-12-10"),
        "P1": deal("P1", "proposal", 3000, "2026-11-01"),  # late
        "NG": deal("NG", "negotiation", 2000, "2027-01-05"),
        "W1": deal("W1", "negotiation", 5000, "2026-11-05", ["won"]),
        "W2": deal("W2", "proposal", 4000, "2026-10-20", ["won"]),
        "W3": deal("W3", "new", 6000, "2026-06-15", ["won"]),  # outside the 90 days
        "L1": deal("L1", "qualified", 700, "2026-10-01", ["lost"]),
        "W4": deal("W4", "negotiation", 9000, "2025-10-01", ["won"]),  # outside the 12 months
    }
    return {"org": org, "ann": ann, "deals": deals}


def dashboard(client):
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    return response.json()


def test_headline_figures(client, data):
    body = dashboard(client)
    assert body["totals"] == {"value_pence": 6_000_00, "expected_pence": 3_100_00, "count": 3}
    assert body["late_count"] == 1
    assert body["won_this_month_pence"] == 5_000_00
    assert body["won_last_month_pence"] == 4_000_00


def test_win_rate_over_90_days(client, data):
    assert dashboard(client)["win_rate"] == {"days": 90, "won": 2, "lost": 1, "percent": 67}


def test_win_rate_with_nothing_closed(client):
    assert dashboard(client)["win_rate"]["percent"] is None


def test_monthly_won_and_lost(client, data):
    months = dashboard(client)["months"]
    assert [m["month"] for m in months] == [
        "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05",
        "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11",
    ]
    by_month = {m["month"]: m for m in months}
    assert by_month["2026-11"] == {"month": "2026-11", "won_pence": 5_000_00, "won_count": 1, "lost_count": 0}
    assert by_month["2026-10"] == {"month": "2026-10", "won_pence": 4_000_00, "won_count": 1, "lost_count": 1}
    assert by_month["2026-06"]["won_pence"] == 6_000_00
    assert sum(m["won_count"] for m in months) == 3


def test_stage_values(client, data):
    stages = {s["stage"]: s for s in dashboard(client)["stages"]}
    assert list(stages) == ["new", "qualified", "proposal", "negotiation"]
    assert stages["new"] == {"stage": "new", "value_pence": 1_000_00, "expected_pence": 100_00, "count": 1}
    assert stages["qualified"]["count"] == 0
    assert stages["proposal"]["value_pence"] == 3_000_00
    assert stages["negotiation"]["value_pence"] == 2_000_00


def test_funnel(client, data):
    funnel = {f["stage"]: f["value_pence"] for f in dashboard(client)["funnel"]}
    # Furthest stages: N1 new, P1 proposal, NG negotiation, W1 negotiation, W2 proposal,
    # W3 new, L1 qualified, W4 negotiation
    assert funnel == {
        "new": 30_700_00,
        "qualified": 23_700_00,
        "proposal": 23_000_00,
        "negotiation": 16_000_00,
        "won": 24_000_00,
    }


def test_follow_ups(client, make, data):
    ann = data["ann"]
    deal = data["deals"]["N1"]
    make.activity("Overdue yesterday", contact_id=ann["id"], follow_up_date="2026-11-18")
    make.activity("Overdue last week", deal_id=deal["id"], follow_up_date="2026-11-10")
    make.activity("Done", contact_id=ann["id"], follow_up_date="2026-11-11", follow_up_done=True)
    make.activity("Due today", contact_id=ann["id"], follow_up_date="2026-11-19")
    make.activity("In 13 days", contact_id=ann["id"], follow_up_date="2026-12-02")
    make.activity("In 14 days", contact_id=ann["id"], follow_up_date="2026-12-03")
    make.activity("No follow-up", contact_id=ann["id"])

    follow_ups = dashboard(client)["follow_ups"]
    assert [f["description"] for f in follow_ups["overdue"]] == ["Overdue last week", "Overdue yesterday"]
    assert [f["description"] for f in follow_ups["upcoming"]] == ["Due today", "In 13 days"]
    assert follow_ups["overdue"][0]["deal_name"] == "N1"
    assert follow_ups["overdue"][0]["contact_name"] == "Ann"


def test_marking_done_removes_a_follow_up(client, make, data):
    activity = make.activity("Call back", contact_id=data["ann"]["id"], follow_up_date="2026-11-18")
    assert len(dashboard(client)["follow_ups"]["overdue"]) == 1
    client.patch(f"/api/activities/{activity['id']}", json={"follow_up_done": True})
    assert dashboard(client)["follow_ups"]["overdue"] == []


def test_latest_15_activities_newest_first(client, make):
    org = make.org("Acme")
    ann = make.contact(org, "Ann")
    for day in range(1, 21):
        make.activity(f"Day {day}", contact_id=ann["id"], occurred_at=f"2026-11-{day:02d}T09:00:00Z")
    recent = dashboard(client)["recent_activity"]
    assert [a["description"] for a in recent] == [f"Day {day}" for day in range(20, 5, -1)]


def test_recent_activity_includes_stage_changes(client, data):
    recent = dashboard(client)["recent_activity"]
    stage_changes = [a for a in recent if a["type"] == "stage_change"]
    assert {a["new_stage"] for a in stage_changes} == {"won", "lost"}
    assert all(a["description"].startswith("Moved from ") for a in stage_changes)


def test_seeded_dashboard_matches_the_mockup(client, engine):
    from accountable import seed

    seed.seed(engine)
    body = dashboard(client)
    assert body["totals"] == {"value_pence": 263_500_00, "expected_pence": 126_050_00, "count": 11}
    assert body["late_count"] == 4
    assert len(body["follow_ups"]["overdue"]) == 5
    assert len(body["follow_ups"]["upcoming"]) == 8
    assert len(body["recent_activity"]) == 15
