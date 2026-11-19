"""Every "today" and "now" goes through here, so tests can fix the date.

Callers use `clock.today()` (not `from clock import today`) so a patched
value is picked up everywhere.
"""

from datetime import UTC, date, datetime


def now() -> datetime:
    """The current moment in UTC, timezone-aware."""
    return datetime.now(UTC)


def today() -> date:
    """Today's date in the computer's local time zone."""
    return now().astimezone().date()
