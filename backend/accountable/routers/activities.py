from fastapi import APIRouter
from sqlalchemy import Select, and_, delete, insert, select, update
from sqlalchemy.engine import Connection

from .. import clock, db
from ..rules import STAGE_NAMES, follow_up_status
from ..schemas import ActivityCreate, ActivityUpdate, NotFound, ValidationFailed, iso_utc, to_utc_naive

router = APIRouter(prefix="/activities", tags=["activities"])

_STAGE_BY_NAME = {name: key for key, name in STAGE_NAMES.items()}

a, c, d = db.activities, db.contacts, db.deals


def activity_query() -> Select:
    """Activities with the names of whatever they're still linked to."""
    return select(
        a,
        c.c.name.label("contact_name"),
        d.c.name.label("deal_name"),
    ).select_from(a.outerjoin(c, a.c.contact_id == c.c.id).outerjoin(d, a.c.deal_id == d.c.id))


def newest_first(query: Select) -> Select:
    return query.order_by(a.c.occurred_at.desc(), a.c.id.desc())


def serialize(row) -> dict:
    row = dict(row)
    new_stage = None
    if row["type"] == "stage_change":
        new_stage = _STAGE_BY_NAME.get(row["description"].rsplit(" to ", 1)[-1])
    return {
        "id": row["id"],
        "type": row["type"],
        "description": row["description"],
        "occurred_at": iso_utc(row["occurred_at"]),
        "contact_id": row["contact_id"],
        "contact_name": row["contact_name"],
        "deal_id": row["deal_id"],
        "deal_name": row["deal_name"],
        "subject_label": row["subject_label"],
        "follow_up_date": row["follow_up_date"],
        "follow_up_done": row["follow_up_done"],
        "follow_up_status": follow_up_status(row["follow_up_date"], row["follow_up_done"], clock.today()),
        "new_stage": new_stage,
    }


def timeline(conn: Connection, *, contact_id: int | None = None, deal_id: int | None = None) -> list[dict]:
    query = activity_query()
    if contact_id is not None:
        query = query.where(a.c.contact_id == contact_id)
    if deal_id is not None:
        query = query.where(a.c.deal_id == deal_id)
    return [serialize(r) for r in conn.execute(newest_first(query)).mappings()]


def get_activity(conn: Connection, activity_id: int) -> dict:
    row = conn.execute(activity_query().where(a.c.id == activity_id)).mappings().first()
    if row is None:
        raise NotFound("Activity not found")
    return serialize(row)


@router.post("", status_code=201)
def create_activity(body: ActivityCreate):
    with db.get_engine().begin() as conn:
        if body.deal_id is not None:
            deal = conn.execute(select(d.c.name, d.c.contact_id).where(d.c.id == body.deal_id)).first()
            if deal is None:
                raise ValidationFailed({"deal_id": "Deal not found"})
            # An activity on a deal also goes in its main contact's timeline.
            contact_id, label = deal.contact_id, deal.name
        elif body.contact_id is not None:
            contact = conn.execute(select(c.c.name).where(c.c.id == body.contact_id)).first()
            if contact is None:
                raise ValidationFailed({"contact_id": "Contact not found"})
            contact_id, label = body.contact_id, contact.name
        else:
            raise ValidationFailed({"contact_id": "Link the activity to a contact or a deal"})

        occurred_at = to_utc_naive(body.occurred_at) if body.occurred_at else clock.now().replace(tzinfo=None, microsecond=0)
        new_id = conn.execute(
            insert(a).values(
                type=body.type,
                description=body.description,
                occurred_at=occurred_at,
                contact_id=contact_id,
                deal_id=body.deal_id,
                subject_label=label,
                follow_up_date=body.follow_up_date,
                follow_up_done=body.follow_up_done,
            )
        ).inserted_primary_key[0]
        return get_activity(conn, new_id)


@router.patch("/{activity_id}")
def update_activity(activity_id: int, body: ActivityUpdate):
    values = body.provided()
    with db.get_engine().begin() as conn:
        current = get_activity(conn, activity_id)
        if current["type"] == "stage_change":
            raise ValidationFailed({"type": "Stage changes can't be edited, only deleted"})
        if "occurred_at" in values:
            values["occurred_at"] = to_utc_naive(values["occurred_at"])
        if values:
            conn.execute(update(a).where(a.c.id == activity_id).values(**values))
        return get_activity(conn, activity_id)


@router.delete("/{activity_id}", status_code=204)
def delete_activity(activity_id: int):
    with db.get_engine().begin() as conn:
        get_activity(conn, activity_id)
        conn.execute(delete(a).where(a.c.id == activity_id))


def open_follow_ups(conn: Connection) -> list[dict]:
    query = activity_query().where(and_(a.c.follow_up_date.is_not(None), a.c.follow_up_done.is_(False)))
    rows = conn.execute(query.order_by(a.c.follow_up_date, a.c.id)).mappings()
    return [serialize(r) for r in rows]
