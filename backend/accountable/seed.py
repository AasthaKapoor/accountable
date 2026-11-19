"""Deterministic sample data, with dates relative to today.

`python -m accountable.seed` drops every table and fills them again.
"""

import random
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import insert
from sqlalchemy.engine import Engine

from . import clock, config, db
from .rules import DEFAULT_PROBABILITY, OPEN_STAGES, is_open, stage_change_description

ORGANIZATIONS = [
    ("Northgate Logistics", "northgatelogistics.co.uk", "Logistics", "Runs a fleet of 300 vans across the north of England."),
    ("Brightwater Foods", "brightwaterfoods.co.uk", "Food and drink", "Family-owned producer with a growing online shop."),
    ("Halden Health", "haldenhealth.co.uk", "Healthcare", "Group of six private clinics."),
    ("Pennine Energy", "pennine-energy.co.uk", "Energy", "Regional energy supplier. Long buying cycles."),
    ("Ashford Retail", "ashfordretail.co.uk", "Retail", "40 stores across Kent and Sussex."),
    ("Clarke & Reid Legal", "clarkereid.law", "Legal services", "Partnership of 25 solicitors."),
    ("Lumen Studio", "lumenstudio.design", "Creative agency", "Small design studio. Quick to decide."),
    ("Kestrel Engineering", "kestrel-eng.co.uk", "Manufacturing", "Precision parts for aerospace."),
    ("Oakfield Academy Trust", "oakfieldtrust.org.uk", "Education", "Trust of eight primary schools."),
    ("Harbour Finance", "harbourfinance.co.uk", "Financial services", "Independent lender to small businesses."),
]

# (name, organization, job title, status)
CONTACTS = [
    ("Priya Shah", "Northgate Logistics", "Operations Director", "customer"),
    ("Tom Bennett", "Northgate Logistics", "IT Manager", "qualified"),
    ("Ravi Patel", "Northgate Logistics", "Fleet Manager", "customer"),
    ("Hannah Lowe", "Brightwater Foods", "Marketing Lead", "qualified"),
    ("Marcus Doyle", "Brightwater Foods", "Head of Digital", "customer"),
    ("Ella Fraser", "Brightwater Foods", "Finance Manager", "lead"),
    ("Aisha Rahman", "Halden Health", "Practice Manager", "customer"),
    ("Owen Price", "Halden Health", "Head of IT", "lead"),
    ("Grace Walsh", "Halden Health", "Clinical Lead", "qualified"),
    ("Gareth Hughes", "Pennine Energy", "Chief Technology Officer", "customer"),
    ("Sophie Turner", "Pennine Energy", "Data Lead", "qualified"),
    ("Rhys Evans", "Pennine Energy", "Procurement Manager", "customer"),
    ("Leah Morgan", "Ashford Retail", "Store Operations Director", "customer"),
    ("Daniel Okafor", "Ashford Retail", "Head of Finance", "qualified"),
    ("Chloe Adams", "Ashford Retail", "Buyer", "customer"),
    ("Fiona Clarke", "Clarke & Reid Legal", "Managing Partner", "customer"),
    ("James Reid", "Clarke & Reid Legal", "Partner", "qualified"),
    ("Nadia Hussain", "Clarke & Reid Legal", "Office Manager", "lead"),
    ("Isla Grant", "Lumen Studio", "Founder", "customer"),
    ("Jack Wilson", "Lumen Studio", "Studio Manager", "customer"),
    ("Mei Chen", "Lumen Studio", "Senior Designer", "lead"),
    ("Callum Ross", "Kestrel Engineering", "Plant Manager", "customer"),
    ("Laura Bishop", "Kestrel Engineering", "Engineering Director", "qualified"),
    ("Sam Kerr", "Kestrel Engineering", "Purchasing Lead", "lead"),
    ("Helen Brooks", "Oakfield Academy Trust", "Business Manager", "customer"),
    ("Peter Lang", "Oakfield Academy Trust", "Head of IT", "customer"),
    ("Zara Ahmed", "Oakfield Academy Trust", "Trust Lead", "lead"),
    ("Oliver Shaw", "Harbour Finance", "Chief Operating Officer", "customer"),
    ("Megan Lloyd", "Harbour Finance", "Compliance Lead", "customer"),
    ("Ade Johnson", "Harbour Finance", "Analyst", "lead"),
]

# (name, organization, contact, stages it has been through, value in pounds, close date in days from today)
# The first stage is where the deal was created; each later one is a stage change.
DEALS = [
    # Open, closing over the next three months, and four running late
    ("Fleet tracking rollout", "Northgate Logistics", "Priya Shah", ["qualified"], 42000, 72),
    ("Website rebuild", "Brightwater Foods", "Hannah Lowe", ["new"], 18000, 54),
    ("Support contract", "Northgate Logistics", "Tom Bennett", ["new"], 9500, 31),
    ("Clinic booking system", "Halden Health", "Aisha Rahman", ["qualified", "proposal"], 36000, 29),
    ("Data migration", "Pennine Energy", "Sophie Turner", ["new", "qualified"], 24500, 26),
    ("ERP integration", "Pennine Energy", "Gareth Hughes", ["proposal", "negotiation"], 64000, 21),
    ("Store POS upgrade", "Ashford Retail", "Leah Morgan", ["proposal", "negotiation"], 28500, 14),
    ("Compliance audit tooling", "Clarke & Reid Legal", "Fiona Clarke", ["negotiation"], 12000, -2),
    ("Analytics pilot", "Halden Health", "Owen Price", ["new"], 6000, -5),
    ("Staff training", "Clarke & Reid Legal", "James Reid", ["qualified"], 7200, -6),
    ("Annual licence renewal", "Ashford Retail", "Daniel Okafor", ["proposal"], 15800, -8),
    # Closed in the last four months
    ("Warehouse sensors", "Northgate Logistics", "Priya Shah", ["proposal", "negotiation", "won"], 31000, -7),
    ("Payroll module", "Ashford Retail", "Daniel Okafor", ["negotiation", "lost"], 19000, -13),
    ("Menu ordering app", "Brightwater Foods", "Marcus Doyle", ["negotiation", "won"], 14500, -15),
    ("Brand site refresh", "Lumen Studio", "Isla Grant", ["proposal", "won"], 8800, -22),
    ("Patient portal", "Halden Health", "Owen Price", ["qualified", "lost"], 22000, -29),
    ("Case management setup", "Clarke & Reid Legal", "Fiona Clarke", ["negotiation", "won"], 26000, -35),
    ("Grid monitoring dashboard", "Pennine Energy", "Gareth Hughes", ["negotiation", "won"], 47000, -48),
    ("Supplier portal", "Brightwater Foods", "Hannah Lowe", ["proposal", "lost"], 11000, -55),
    ("Loyalty scheme", "Ashford Retail", "Leah Morgan", ["negotiation", "won"], 19500, -61),
    ("Route planning tool", "Northgate Logistics", "Priya Shah", ["negotiation", "won"], 22000, -77),
    ("Field service app", "Pennine Energy", "Sophie Turner", ["negotiation", "lost"], 33000, -81),
    ("Studio CMS", "Lumen Studio", "Isla Grant", ["proposal", "won"], 6400, -89),
    ("Document scanning", "Clarke & Reid Legal", "James Reid", ["new", "lost"], 5500, -99),
    ("Telehealth trial", "Halden Health", "Aisha Rahman", ["negotiation", "won"], 12000, -104),
    # Closed earlier in the year
    ("Machine monitoring", "Kestrel Engineering", "Callum Ross", ["negotiation", "won"], 38000, -118),
    ("Parent portal", "Oakfield Academy Trust", "Helen Brooks", ["proposal", "won"], 21000, -135),
    ("Risk reporting suite", "Harbour Finance", "Oliver Shaw", ["negotiation", "won"], 52000, -150),
    ("Shop floor tablets", "Kestrel Engineering", "Laura Bishop", ["proposal", "lost"], 17500, -162),
    ("Cold chain tracking", "Northgate Logistics", "Ravi Patel", ["negotiation", "won"], 29000, -178),
    ("Online ordering", "Brightwater Foods", "Marcus Doyle", ["proposal", "won"], 16000, -196),
    ("Staff rota app", "Halden Health", "Grace Walsh", ["qualified", "lost"], 9000, -210),
    ("Smart meter analytics", "Pennine Energy", "Rhys Evans", ["negotiation", "won"], 44000, -228),
    ("Gift card system", "Ashford Retail", "Chloe Adams", ["negotiation", "won"], 13500, -245),
    ("Matter management", "Clarke & Reid Legal", "Nadia Hussain", ["negotiation", "lost"], 24000, -262),
    ("Pupil data dashboard", "Oakfield Academy Trust", "Peter Lang", ["proposal", "won"], 18500, -279),
    ("Client onboarding", "Harbour Finance", "Megan Lloyd", ["negotiation", "won"], 33500, -298),
    ("Studio booking tool", "Lumen Studio", "Jack Wilson", ["proposal", "won"], 7800, -316),
    ("Supplier audit tool", "Kestrel Engineering", "Sam Kerr", ["new", "lost"], 12500, -330),
    ("Payments gateway", "Harbour Finance", "Oliver Shaw", ["negotiation", "won"], 27000, -345),
]

# When each open deal's stage changes happened, in days before today (latest last).
OPEN_DEAL_CHANGES = {
    "Clinic booking system": [9],
    "Data migration": [2],
    "ERP integration": [6],
    "Store POS upgrade": [2 / 24],
}

# (type, description, deal or None, contact or None, days ago, follow-up in days from today, done)
ACTIVITIES = [
    ("call", "Talked through the integration timeline", "ERP integration", None, 4 / 24, None, False),
    ("email", "Sent the proposal pack", "Clinic booking system", None, 1, None, False),
    ("note", "Budget for the rollout confirmed for Q1", None, "Priya Shah", 1.1, None, False),
    ("call", "Intro call about the website rebuild", None, "Hannah Lowe", 2.2, None, False),
    ("email", "Chased the signed contract", "Compliance audit tooling", None, 3, None, False),
    ("note", "Wants a pilot before committing", None, "Owen Price", 4, None, False),
    ("call", "Agreed renewal terms in principle", "Annual licence renewal", None, 8, None, False),
    ("email", "Sent the training dates", "Staff training", None, 13, None, False),
    ("call", "Discussed the menu app launch", None, "Marcus Doyle", 16, None, False),
    # Overdue follow-ups
    ("email", "Send the revised quote", "Annual licence renewal", None, 10, -7, False),
    ("call", "Book the sign-off call", "Compliance audit tooling", None, 9, -5, False),
    ("call", "Call about the pilot scope", None, "Owen Price", 6, -4, False),
    ("note", "Share the case study", None, "Hannah Lowe", 5, -2, False),
    ("email", "Confirm the training dates", "Staff training", None, 12, -1, False),
    # Upcoming follow-ups
    ("note", "Send the updated proposal", "Clinic booking system", None, 1.3, 1, False),
    ("call", "Follow up on the rollout budget", "Fleet tracking rollout", None, 3.2, 2, False),
    ("call", "Check the integration scope with IT", "ERP integration", None, 5, 3, False),
    ("email", "Send the contract for signature", "Store POS upgrade", None, 2.4, 4, False),
    ("call", "Book a demo for the finance team", "Data migration", None, 4.5, 6, False),
    ("email", "Share pricing options", "Website rebuild", None, 6.5, 8, False),
    ("note", "Ask about the support hours they need", "Support contract", None, 7, 10, False),
    ("call", "Check in about plans for the new term", None, "Zara Ahmed", 11, 12, False),
    # Follow-ups already done
    ("call", "Confirm the go-live date", "Warehouse sensors", None, 18, -10, True),
    ("email", "Send the final invoice", "Menu ordering app", None, 20, -16, True),
    ("call", "Check how the first month went", None, "Isla Grant", 21, -14, True),
]

# A contact deleted after this was logged: the entry keeps its label but has no link.
DELETED_CONTACT_ACTIVITY = ("note", "Kick-off meeting booked", "Ben Carter", 14)

GENERATED_DESCRIPTIONS = {
    "note": [
        "Reviewing budgets this quarter",
        "Decision sits with the board",
        "Happy with the demo, wants references",
        "Prefers to hear by email",
        "New finance lead starts next month",
        "Asked for a phased rollout",
    ],
    "call": [
        "Quick check-in about the timeline",
        "Walked through the demo",
        "Talked about pricing tiers",
        "Discovery call with the team",
        "Answered questions about data security",
        "Agreed next steps",
    ],
    "email": [
        "Sent the meeting notes",
        "Shared the case study",
        "Sent the price breakdown",
        "Shared the onboarding plan",
        "Replied to the security questions",
        "Sent the reference contacts",
    ],
}
GENERATED_COUNT = 40
RANDOM_SEED = 2026


def _at(day: date, hour: int = 10, minute: int = 0) -> datetime:
    """A local time on `day`, as naive UTC for storage."""
    local = datetime.combine(day, time(hour, minute)).astimezone()
    return local.astimezone(UTC).replace(tzinfo=None)


def _ago(now: datetime, days: float) -> datetime:
    return (now - timedelta(days=days)).replace(tzinfo=None, microsecond=0)


def build() -> dict[str, list[dict]]:
    """Every row of the sample data, ready to insert. Same output for the same today and now."""
    rng = random.Random(RANDOM_SEED)
    today = clock.today()
    now = clock.now().astimezone(UTC)

    orgs = []
    org_ids = {}
    for i, (name, website, industry, notes) in enumerate(ORGANIZATIONS, start=1):
        orgs.append({"id": i, "name": name, "website": website, "industry": industry, "notes": notes})
        org_ids[name] = i

    contacts = []
    contact_ids = {}
    for i, (name, org, job_title, status) in enumerate(CONTACTS, start=1):
        first, last = name.lower().split(" ", 1)
        domain = next(o[1] for o in ORGANIZATIONS if o[0] == org)
        contacts.append(
            {
                "id": i,
                "name": name,
                "email": f"{first}.{last.replace(' ', '')}@{domain}",
                "phone": f"07{rng.randint(100, 999)} {rng.randint(100000, 999999)}",
                "job_title": job_title,
                "organization_id": org_ids[org],
                "status": status,
            }
        )
        contact_ids[name] = i

    deals = []
    deal_ids = {}
    activities = []
    for i, (name, org, contact, path, pounds, close_in) in enumerate(DEALS, start=1):
        stage = path[-1]
        close_date = today + timedelta(days=close_in)
        furthest = max((s for s in path if is_open(s)), key=OPEN_STAGES.index)
        deals.append(
            {
                "id": i,
                "name": name,
                "organization_id": org_ids[org],
                "contact_id": contact_ids[contact],
                "stage": stage,
                "value_pence": pounds * 100,
                "probability": DEFAULT_PROBABILITY[stage],
                "probability_is_manual": False,
                "close_date": close_date,
                "position": 0.0,
                "furthest_stage": furthest,
            }
        )
        deal_ids[name] = i

        # One stage-change entry per move, the last on the close date for closed deals.
        changes = list(zip(path, path[1:]))
        if is_open(stage):
            days_ago = OPEN_DEAL_CHANGES.get(name, [])
            times = [_ago(now, d) for d in days_ago]
        else:
            times = [_at(close_date - timedelta(days=12 * (len(changes) - 1 - k)), 15) for k in range(len(changes))]
        for (old, new), when in zip(changes, times, strict=True):
            activities.append(
                {
                    "type": "stage_change",
                    "description": stage_change_description(old, new),
                    "occurred_at": when,
                    "contact_id": contact_ids[contact],
                    "deal_id": i,
                    "subject_label": name,
                    "follow_up_date": None,
                    "follow_up_done": False,
                }
            )

    # Order each column: open stages by value (largest first), closed by close date (latest first).
    for stage in {d["stage"] for d in deals}:
        column = [d for d in deals if d["stage"] == stage]
        if is_open(stage):
            column.sort(key=lambda d: -d["value_pence"])
        else:
            column.sort(key=lambda d: d["close_date"], reverse=True)
        for position, deal in enumerate(column, start=1):
            deal["position"] = float(position)

    deal_by_id = {d["id"]: d for d in deals}

    def _activity(kind, description, deal_name, contact_name, when, follow_up, done):
        if deal_name:
            deal = deal_by_id[deal_ids[deal_name]]
            contact_id, deal_id, label = deal["contact_id"], deal["id"], deal_name
        else:
            contact_id, deal_id, label = contact_ids[contact_name], None, contact_name
        return {
            "type": kind,
            "description": description,
            "occurred_at": when,
            "contact_id": contact_id,
            "deal_id": deal_id,
            "subject_label": label,
            "follow_up_date": follow_up,
            "follow_up_done": done,
        }

    for kind, description, deal_name, contact_name, days_ago, follow_in, done in ACTIVITIES:
        follow_up = today + timedelta(days=follow_in) if follow_in is not None else None
        activities.append(_activity(kind, description, deal_name, contact_name, _ago(now, days_ago), follow_up, done))

    kind, description, label, days_ago = DELETED_CONTACT_ACTIVITY
    activities.append(
        {
            "type": kind,
            "description": description,
            "occurred_at": _ago(now, days_ago),
            "contact_id": None,
            "deal_id": None,
            "subject_label": label,
            "follow_up_date": None,
            "follow_up_done": False,
        }
    )

    # Older history, spread across deals and contacts, before each deal closed.
    for _ in range(GENERATED_COUNT):
        kind = rng.choice(["note", "call", "email"])
        description = rng.choice(GENERATED_DESCRIPTIONS[kind])
        if rng.random() < 0.7:
            deal = rng.choice(deals)
            latest = max(17, (today - deal["close_date"]).days + 1)
            day = today - timedelta(days=rng.randint(latest, latest + 40))
            activities.append(_activity(kind, description, deal["name"], None, _at(day, rng.randint(9, 17), rng.choice([0, 15, 30, 45])), None, False))
        else:
            contact = rng.choice(contacts)
            day = today - timedelta(days=rng.randint(17, 120))
            activities.append(_activity(kind, description, None, contact["name"], _at(day, rng.randint(9, 17), rng.choice([0, 15, 30, 45])), None, False))

    activities.sort(key=lambda a: a["occurred_at"])
    for i, activity in enumerate(activities, start=1):
        activity["id"] = i

    return {"organizations": orgs, "contacts": contacts, "deals": deals, "activities": activities}


def seed(engine: Engine) -> None:
    """Drop every table, create them again and fill them with the sample data."""
    data = build()
    db.drop_tables(engine)
    db.create_tables(engine)
    with engine.begin() as conn:
        conn.execute(insert(db.organizations), data["organizations"])
        conn.execute(insert(db.contacts), data["contacts"])
        conn.execute(insert(db.deals), data["deals"])
        conn.execute(insert(db.activities), data["activities"])


def main() -> None:
    path = config.db_path()
    engine = db.init_engine(path)
    seed(engine)
    print(f"Reset {path} to the sample data.")


if __name__ == "__main__":
    main()
