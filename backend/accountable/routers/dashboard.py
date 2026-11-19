from datetime import date, timedelta

from fastapi import APIRouter
from sqlalchemy import select

from .. import clock, db, rules
from .activities import activity_query, newest_first, open_follow_ups, serialize

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

d = db.deals

RECENT_ACTIVITY_COUNT = 15
UPCOMING_DAYS = 14
WIN_RATE_DAYS = 90
MONTHS = 12


def _month_start(day: date, months_back: int) -> date:
    index = day.year * 12 + day.month - 1 - months_back
    return date(index // 12, index % 12 + 1, 1)


def _month_key(day: date) -> str:
    return f"{day.year:04d}-{day.month:02d}"


@router.get("")
def dashboard():
    """Every figure on the dashboard (spec section 6.1)."""
    today = clock.today()
    with db.get_engine().connect() as conn:
        deals = [dict(r) for r in conn.execute(select(d)).mappings()]
        follow_ups = open_follow_ups(conn)
        recent = [serialize(r) for r in conn.execute(newest_first(activity_query()).limit(RECENT_ACTIVITY_COUNT)).mappings()]

    open_deals = [x for x in deals if rules.is_open(x["stage"])]
    won = [x for x in deals if x["stage"] == "won"]
    lost = [x for x in deals if x["stage"] == "lost"]

    # Revenue won, and deals won and lost, per calendar month by close date
    months = []
    for back in range(MONTHS - 1, -1, -1):
        key = _month_key(_month_start(today, back))
        won_in = [x for x in won if _month_key(x["close_date"]) == key]
        months.append(
            {
                "month": key,
                "won_pence": sum(x["value_pence"] for x in won_in),
                "won_count": len(won_in),
                "lost_count": sum(1 for x in lost if _month_key(x["close_date"]) == key),
            }
        )

    since = today - timedelta(days=WIN_RATE_DAYS)
    won_recent = sum(1 for x in won if since < x["close_date"] <= today)
    lost_recent = sum(1 for x in lost if since < x["close_date"] <= today)
    decided = won_recent + lost_recent

    # Funnel: value of every deal whose furthest open stage reached each stage, then won
    funnel = []
    for stage in rules.OPEN_STAGES:
        reached = [x for x in deals if rules.OPEN_STAGES.index(x["furthest_stage"]) >= rules.OPEN_STAGES.index(stage)]
        funnel.append({"stage": stage, "value_pence": sum(x["value_pence"] for x in reached), "count": len(reached)})
    funnel.append({"stage": "won", "value_pence": sum(x["value_pence"] for x in won), "count": len(won)})

    upcoming_until = today + timedelta(days=UPCOMING_DAYS)
    return {
        "today": today,
        "totals": rules.totals(deals),
        "late_count": sum(1 for x in open_deals if rules.is_late(x["stage"], x["close_date"], today)),
        "won_this_month_pence": months[-1]["won_pence"],
        "won_last_month_pence": months[-2]["won_pence"],
        "win_rate": {
            "days": WIN_RATE_DAYS,
            "won": won_recent,
            "lost": lost_recent,
            "percent": round(won_recent * 100 / decided) if decided else None,
        },
        "months": months,
        "stages": [
            {**rules.totals(x for x in open_deals if x["stage"] == stage), "stage": stage}
            for stage in rules.OPEN_STAGES
        ],
        "funnel": funnel,
        "follow_ups": {
            "overdue": [f for f in follow_ups if f["follow_up_status"] == "overdue"],
            "upcoming": [f for f in follow_ups if f["follow_up_status"] == "upcoming" and f["follow_up_date"] < upcoming_until],
        },
        "recent_activity": recent,
    }
