from collections import Counter
from datetime import date, timedelta

from sqlalchemy import select

from accountable import db, rules, seed
from accountable.main import open_database

TODAY = date(2026, 11, 19)


def _rows(engine, table):
    with engine.connect() as conn:
        return [dict(r._mapping) for r in conn.execute(select(table).order_by(table.c.id))]


def _seeded(engine):
    seed.seed(engine)
    return {name: _rows(engine, getattr(db, name)) for name in ("organizations", "contacts", "deals", "activities")}


def test_counts(engine):
    data = _seeded(engine)
    assert len(data["organizations"]) == 10
    assert len(data["contacts"]) == 30
    assert len(data["deals"]) == 40
    assert 90 <= len(data["activities"]) <= 110


def test_coverage(engine):
    data = _seeded(engine)
    assert len({o["industry"] for o in data["organizations"]}) >= 6
    assert {c["status"] for c in data["contacts"]} == set(rules.CONTACT_STATUSES)
    assert {d["stage"] for d in data["deals"]} == set(rules.STAGES)
    late = [d for d in data["deals"] if rules.is_late(d["stage"], d["close_date"], TODAY)]
    assert 4 <= len(late) <= 5
    assert any(a["type"] == "stage_change" for a in data["activities"])


def test_dates(engine):
    data = _seeded(engine)
    year_ago = TODAY - timedelta(days=365)
    for deal in data["deals"]:
        if rules.is_open(deal["stage"]):
            assert deal["close_date"] <= TODAY + timedelta(days=92)
        else:
            assert year_ago < deal["close_date"] <= TODAY
    closed_months = {(d["close_date"].year, d["close_date"].month) for d in data["deals"] if not rules.is_open(d["stage"])}
    assert len(closed_months) >= 10


def test_follow_ups(engine):
    data = _seeded(engine)
    status = Counter(rules.follow_up_status(a["follow_up_date"], a["follow_up_done"], TODAY) for a in data["activities"])
    assert 4 <= status["overdue"] <= 6
    assert 7 <= status["upcoming"] <= 9


def test_deal_contacts_belong_to_the_organization(engine):
    data = _seeded(engine)
    org_of = {c["id"]: c["organization_id"] for c in data["contacts"]}
    for deal in data["deals"]:
        assert org_of[deal["contact_id"]] == deal["organization_id"]


def test_won_contacts_are_customers(engine):
    data = _seeded(engine)
    status = {c["id"]: c["status"] for c in data["contacts"]}
    for deal in data["deals"]:
        if deal["stage"] == "won":
            assert status[deal["contact_id"]] == "customer"


def test_probabilities_are_stage_defaults(engine):
    data = _seeded(engine)
    for deal in data["deals"]:
        assert deal["probability"] == rules.DEFAULT_PROBABILITY[deal["stage"]]


def test_furthest_stage_fits_stage_and_history(engine):
    data = _seeded(engine)
    index = rules.OPEN_STAGES.index
    names = {v: k for k, v in rules.STAGE_NAMES.items()}
    for deal in data["deals"]:
        furthest = deal["furthest_stage"]
        assert furthest in rules.OPEN_STAGES
        if rules.is_open(deal["stage"]):
            assert furthest == deal["stage"] or index(furthest) > index(deal["stage"])
        changes = [a for a in data["activities"] if a["deal_id"] == deal["id"] and a["type"] == "stage_change"]
        assert changes or rules.is_open(deal["stage"]), f"{deal['name']} closed with no stage change"
        reached = set()
        for change in sorted(changes, key=lambda a: a["occurred_at"]):
            old, new = change["description"].removeprefix("Moved from ").split(" to ")
            reached |= {names[old], names[new]}
        if changes:
            assert names[changes[-1]["description"].split(" to ")[-1]] == deal["stage"]
        for stage in reached & set(rules.OPEN_STAGES):
            assert index(stage) <= index(furthest), deal["name"]


def test_columns_have_distinct_positions(engine):
    data = _seeded(engine)
    for stage in rules.STAGES:
        positions = [d["position"] for d in data["deals"] if d["stage"] == stage]
        assert len(positions) == len(set(positions))


def test_activities_link_or_keep_a_label(engine):
    data = _seeded(engine)
    for activity in data["activities"]:
        assert activity["subject_label"]
        if activity["deal_id"]:
            deal = next(d for d in data["deals"] if d["id"] == activity["deal_id"])
            assert activity["contact_id"] == deal["contact_id"]


def test_same_output_on_two_runs(engine):
    def strip(data):
        return {k: [{f: v for f, v in r.items() if f not in ("created_at", "updated_at")} for r in rows] for k, rows in data.items()}

    assert strip(_seeded(engine)) == strip(_seeded(engine))


def test_new_database_is_seeded_on_start(db_file):
    assert not db_file.exists()
    engine = open_database()
    assert len(_rows(engine, db.deals)) == 40


def test_existing_database_is_kept_on_start(engine):
    with engine.begin() as conn:
        conn.execute(db.organizations.insert().values(name="Only one"))
    engine = open_database()
    assert [o["name"] for o in _rows(engine, db.organizations)] == ["Only one"]
