from pathlib import Path

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    create_engine,
)
from sqlalchemy.engine import Engine

from . import clock
from .rules import ACTIVITY_TYPES, CONTACT_STATUSES, OPEN_STAGES, STAGES

metadata = MetaData()


def _now():
    return clock.now().replace(tzinfo=None)


def _timestamps():
    return [
        Column("created_at", DateTime, nullable=False, default=_now),
        Column("updated_at", DateTime, nullable=False, default=_now, onupdate=_now),
    ]


def _enum(values, name):
    return Enum(*values, name=name, native_enum=False, create_constraint=True, validate_strings=True)


organizations = Table(
    "organizations",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(200), nullable=False),
    Column("website", Text),
    Column("industry", Text),
    Column("notes", Text),
    *_timestamps(),
)

contacts = Table(
    "contacts",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", Text, nullable=False),
    Column("email", Text),
    Column("phone", Text),
    Column("job_title", Text),
    Column("organization_id", ForeignKey("organizations.id"), nullable=False, index=True),
    Column("status", _enum(CONTACT_STATUSES, "contact_status"), nullable=False, default="lead"),
    *_timestamps(),
)

deals = Table(
    "deals",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", Text, nullable=False),
    Column("organization_id", ForeignKey("organizations.id"), nullable=False, index=True),
    Column("contact_id", ForeignKey("contacts.id"), nullable=False, index=True),
    Column("stage", _enum(STAGES, "deal_stage"), nullable=False),
    Column("value_pence", Integer, nullable=False),
    Column("probability", Integer, nullable=False),
    Column("probability_is_manual", Boolean, nullable=False, default=False),
    Column("close_date", Date, nullable=False),
    Column("position", Float, nullable=False),
    Column("furthest_stage", _enum(OPEN_STAGES, "deal_furthest_stage"), nullable=False),
    *_timestamps(),
)

activities = Table(
    "activities",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("type", _enum(ACTIVITY_TYPES, "activity_type"), nullable=False),
    Column("description", Text, nullable=False),
    Column("occurred_at", DateTime, nullable=False),
    Column("contact_id", ForeignKey("contacts.id"), index=True),
    Column("deal_id", ForeignKey("deals.id"), index=True),
    Column("subject_label", Text, nullable=False),
    Column("follow_up_date", Date),
    Column("follow_up_done", Boolean, nullable=False, default=False),
    *_timestamps(),
)

_engine: Engine | None = None


def init_engine(path: Path) -> Engine:
    """Create the engine for `path` and make it the one the app uses."""
    global _engine
    if _engine is not None:
        _engine.dispose()
    path.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(f"sqlite:///{path}")
    _engine = engine
    return engine


def get_engine() -> Engine:
    if _engine is None:
        raise RuntimeError("Database engine not initialised")
    return _engine


def create_tables(engine: Engine) -> None:
    metadata.create_all(engine)


def drop_tables(engine: Engine) -> None:
    metadata.drop_all(engine)
