"""Business rules as plain functions (spec section 3).

The frontend's `src/lib/rules.ts` mirrors these, using the same test cases.
"""

from collections.abc import Iterable
from datetime import date

STAGES = ("new", "qualified", "proposal", "negotiation", "won", "lost")
OPEN_STAGES = ("new", "qualified", "proposal", "negotiation")
CLOSED_STAGES = ("won", "lost")
STAGE_NAMES = {
    "new": "New",
    "qualified": "Qualified",
    "proposal": "Proposal",
    "negotiation": "Negotiation",
    "won": "Won",
    "lost": "Lost",
}
DEFAULT_PROBABILITY = {
    "new": 10,
    "qualified": 25,
    "proposal": 50,
    "negotiation": 75,
    "won": 100,
    "lost": 0,
}

CONTACT_STATUSES = ("lead", "qualified", "customer")
ACTIVITY_TYPES = ("note", "call", "email", "stage_change")
USER_ACTIVITY_TYPES = ("note", "call", "email")

# Below this gap between neighbours, a column is renumbered before a drop.
MIN_POSITION_GAP = 1e-6


def is_open(stage: str) -> bool:
    return stage in OPEN_STAGES


def probability_is_fixed(stage: str) -> bool:
    """Won and Lost probabilities can't be edited."""
    return stage in CLOSED_STAGES


def stage_change_description(old: str, new: str) -> str:
    return f"Moved from {STAGE_NAMES[old]} to {STAGE_NAMES[new]}"


def advance_furthest(furthest: str, new_stage: str) -> str:
    """`furthest_stage` moves forward to an open stage and never back."""
    if is_open(new_stage) and OPEN_STAGES.index(new_stage) > OPEN_STAGES.index(furthest):
        return new_stage
    return furthest


def is_late(stage: str, close_date: date, today: date) -> bool:
    return is_open(stage) and close_date < today


def follow_up_status(follow_up_date: date | None, done: bool, today: date) -> str | None:
    """'overdue', 'upcoming', or None when there's no open follow-up."""
    if follow_up_date is None or done:
        return None
    return "overdue" if follow_up_date < today else "upcoming"


def expected_pence(value_pence: int, probability: int) -> int:
    return round_pence(value_pence * probability)


def round_pence(hundredths: int) -> int:
    """Round a sum of value × probability (in hundredths of a penny) to whole pence, halves up."""
    return (hundredths + 50) // 100


def totals(deals: Iterable[dict]) -> dict:
    """Total value and expected revenue across open deals only.

    Expected revenue is added up exactly and rounded once at the end.
    """
    value = 0
    weighted = 0
    count = 0
    for deal in deals:
        if not is_open(deal["stage"]):
            continue
        value += deal["value_pence"]
        weighted += deal["value_pence"] * deal["probability"]
        count += 1
    return {"value_pence": value, "expected_pence": round_pence(weighted), "count": count}


def position_between(before: float | None, after: float | None) -> float:
    """Position for a card dropped between `before` (the card above) and `after` (the card below)."""
    if before is None and after is None:
        return 1.0
    if before is None:
        return after - 1.0
    if after is None:
        return before + 1.0
    return (before + after) / 2


def gap_too_small(before: float | None, after: float | None) -> bool:
    return before is not None and after is not None and (after - before) < MIN_POSITION_GAP


def renumbered(count: int) -> list[float]:
    """Evenly spaced positions for a column of `count` cards."""
    return [float(i + 1) for i in range(count)]
