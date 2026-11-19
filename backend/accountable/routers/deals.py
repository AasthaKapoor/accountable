from fastapi import APIRouter, Depends
from sqlalchemy import Select, case, delete, func, insert, select, update
from sqlalchemy.engine import Connection

from .. import clock, db, rules
from ..listing import ListParams, list_params, paginate
from ..schemas import DealCreate, DealMove, DealUpdate, NotFound, ValidationFailed
from .activities import timeline

router = APIRouter(prefix="/deals", tags=["deals"])

d, o, c, a = db.deals, db.organizations, db.contacts, db.activities

STAGE_ORDER = case({s: i for i, s in enumerate(rules.STAGES)}, value=d.c.stage)


def deal_query() -> Select:
    return select(
        d,
        o.c.name.label("organization_name"),
        c.c.name.label("contact_name"),
    ).select_from(d.join(o, d.c.organization_id == o.c.id).join(c, d.c.contact_id == c.c.id))


def serialize(row) -> dict:
    row = dict(row)
    row.pop("created_at", None)
    row.pop("updated_at", None)
    row["is_late"] = rules.is_late(row["stage"], row["close_date"], clock.today())
    row["expected_pence"] = rules.expected_pence(row["value_pence"], row["probability"])
    return row


def get_deal(conn: Connection, deal_id: int) -> dict:
    row = conn.execute(deal_query().where(d.c.id == deal_id)).mappings().first()
    if row is None:
        raise NotFound("Deal not found")
    return serialize(row)


def board_totals(conn: Connection) -> dict:
    """Board totals (open deals only) and each column's own figures."""
    deals = [dict(r) for r in conn.execute(select(d.c.stage, d.c.value_pence, d.c.probability)).mappings()]
    columns = {}
    for stage in rules.STAGES:
        in_column = [x for x in deals if x["stage"] == stage]
        if rules.is_open(stage):
            columns[stage] = rules.totals(in_column)
        else:
            columns[stage] = {"value_pence": None, "expected_pence": None, "count": len(in_column)}
    return {"board": rules.totals(deals), "columns": columns}


def _bottom_position(conn: Connection, stage: str, exclude_id: int | None = None) -> float:
    query = select(func.max(d.c.position)).where(d.c.stage == stage)
    if exclude_id is not None:
        query = query.where(d.c.id != exclude_id)
    return rules.position_between(conn.execute(query).scalar(), None)


def _check_contact(conn: Connection, organization_id: int, contact_id: int) -> None:
    if conn.execute(select(o.c.id).where(o.c.id == organization_id)).first() is None:
        raise ValidationFailed({"organization_id": "Organization not found"})
    contact = conn.execute(select(c.c.organization_id).where(c.c.id == contact_id)).first()
    if contact is None:
        raise ValidationFailed({"contact_id": "Contact not found"})
    if contact.organization_id != organization_id:
        raise ValidationFailed({"contact_id": "Choose a contact from this organization"})


def stage_change_values(conn: Connection, deal: dict, new_stage: str) -> dict:
    """Apply the stage-change rules (spec section 3.2) and return the deal's new values.

    Logs the "Moved from ... to ..." activity and, for Won, makes the main contact a customer.
    """
    old_stage = deal["stage"]
    values = {
        "stage": new_stage,
        "probability": rules.DEFAULT_PROBABILITY[new_stage],
        "probability_is_manual": False,
        "furthest_stage": rules.advance_furthest(deal["furthest_stage"], new_stage),
    }
    if not rules.is_open(new_stage):
        values["close_date"] = clock.today()
    if new_stage == "won":
        conn.execute(update(c).where(c.c.id == deal["contact_id"]).values(status="customer"))
    conn.execute(
        insert(a).values(
            type="stage_change",
            description=rules.stage_change_description(old_stage, new_stage),
            occurred_at=clock.now().replace(tzinfo=None, microsecond=0),
            contact_id=deal["contact_id"],
            deal_id=deal["id"],
            subject_label=deal["name"],
        )
    )
    return values


@router.get("")
def list_deals(stage: str | None = None, params: ListParams = Depends(list_params)):
    query = deal_query()
    if stage:
        if stage not in rules.STAGES:
            raise ValidationFailed({"stage": "Choose one of the stages"})
        query = query.where(d.c.stage == stage)
    with db.get_engine().connect() as conn:
        page = paginate(
            conn,
            query,
            params,
            search_columns=[d.c.name, o.c.name, c.c.name],
            sort_columns={
                "name": d.c.name,
                "organization": o.c.name,
                "contact": c.c.name,
                "stage": STAGE_ORDER,
                "value": d.c.value_pence,
                "probability": d.c.probability,
                "close_date": d.c.close_date,
            },
            default_sort="close_date",
            id_column=d.c.id,
        )
    page["items"] = [serialize(r) for r in page["items"]]
    return page


@router.post("", status_code=201)
def create_deal(body: DealCreate):
    values = body.model_dump()
    with db.get_engine().begin() as conn:
        _check_contact(conn, body.organization_id, body.contact_id)
        default = rules.DEFAULT_PROBABILITY[body.stage]
        if body.probability is None or rules.probability_is_fixed(body.stage):
            values["probability"] = default
        values["probability_is_manual"] = values["probability"] != default
        values["position"] = _bottom_position(conn, body.stage)
        values["furthest_stage"] = body.stage if rules.is_open(body.stage) else "new"
        new_id = conn.execute(insert(d).values(**values)).inserted_primary_key[0]
        if body.stage == "won":
            conn.execute(update(c).where(c.c.id == body.contact_id).values(status="customer"))
        return get_deal(conn, new_id)


@router.get("/{deal_id}")
def read_deal(deal_id: int):
    with db.get_engine().connect() as conn:
        deal = get_deal(conn, deal_id)
        deal["timeline"] = timeline(conn, deal_id=deal_id)
        return deal


@router.patch("/{deal_id}")
def update_deal(deal_id: int, body: DealUpdate):
    values = body.provided()
    with db.get_engine().begin() as conn:
        deal = get_deal(conn, deal_id)
        organization_id = values.get("organization_id", deal["organization_id"])
        contact_id = values.get("contact_id", deal["contact_id"])
        if "organization_id" in values or "contact_id" in values:
            _check_contact(conn, organization_id, contact_id)
        merged = {**deal, **values, "stage": deal["stage"]}

        new_stage = values.get("stage", deal["stage"])
        if new_stage != deal["stage"]:
            # A stage change resets the probability, whatever else was sent.
            values.pop("probability", None)
            values.update(stage_change_values(conn, merged, new_stage))
            values["position"] = _bottom_position(conn, new_stage, exclude_id=deal_id)
        elif "probability" in values and values["probability"] != deal["probability"]:
            if rules.probability_is_fixed(deal["stage"]):
                raise ValidationFailed({"probability": f"{rules.STAGE_NAMES[deal['stage']]} deals are fixed at {deal['probability']}%"})
            values["probability_is_manual"] = True

        if values:
            conn.execute(update(d).where(d.c.id == deal_id).values(**values))
        return get_deal(conn, deal_id)


@router.delete("/{deal_id}", status_code=204)
def delete_deal(deal_id: int):
    with db.get_engine().begin() as conn:
        get_deal(conn, deal_id)
        # Activities stay, including stage changes, with the link to the deal removed.
        conn.execute(update(a).where(a.c.deal_id == deal_id).values(deal_id=None))
        conn.execute(delete(d).where(d.c.id == deal_id))


def _neighbour_position(conn: Connection, neighbour_id: int | None, stage: str, field: str) -> float | None:
    if neighbour_id is None:
        return None
    row = conn.execute(select(d.c.stage, d.c.position).where(d.c.id == neighbour_id)).first()
    if row is None or row.stage != stage:
        raise ValidationFailed({field: "That card isn't in this column"})
    return row.position


def _renumber(conn: Connection, stage: str, exclude_id: int) -> None:
    ids = conn.execute(
        select(d.c.id).where(d.c.stage == stage, d.c.id != exclude_id).order_by(d.c.position, d.c.id)
    ).scalars().all()
    for deal_id, position in zip(ids, rules.renumbered(len(ids)), strict=True):
        conn.execute(update(d).where(d.c.id == deal_id).values(position=position))


@router.post("/{deal_id}/move")
def move_deal(deal_id: int, body: DealMove):
    """Change a deal's stage and place in one transaction, and return the new board totals."""
    with db.get_engine().begin() as conn:
        deal = get_deal(conn, deal_id)
        if deal_id in (body.before_id, body.after_id):
            raise ValidationFailed({"before_id": "A card can't be its own neighbour"})

        def neighbours():
            before = _neighbour_position(conn, body.before_id, body.stage, "before_id")
            after = _neighbour_position(conn, body.after_id, body.stage, "after_id")
            if before is None and after is None:
                before = conn.execute(
                    select(func.max(d.c.position)).where(d.c.stage == body.stage, d.c.id != deal_id)
                ).scalar()
            return before, after

        before, after = neighbours()
        if rules.gap_too_small(before, after):
            _renumber(conn, body.stage, deal_id)
            before, after = neighbours()

        values = {"position": rules.position_between(before, after)}
        if body.stage != deal["stage"]:
            values.update(stage_change_values(conn, deal, body.stage))
        conn.execute(update(d).where(d.c.id == deal_id).values(**values))
        return {"deal": get_deal(conn, deal_id), "totals": board_totals(conn)}
