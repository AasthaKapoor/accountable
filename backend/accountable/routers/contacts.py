from fastapi import APIRouter, Depends
from sqlalchemy import Select, delete, insert, select, update
from sqlalchemy.engine import Connection

from .. import db
from ..listing import ListParams, list_params, paginate
from ..rules import CONTACT_STATUSES
from ..schemas import ContactCreate, ContactUpdate, DeleteBlocked, NotFound, ValidationFailed
from .activities import timeline
from .deals import deal_query
from .deals import serialize as serialize_deal

router = APIRouter(prefix="/contacts", tags=["contacts"])

c, o, d, a = db.contacts, db.organizations, db.deals, db.activities


def contact_query() -> Select:
    return select(c, o.c.name.label("organization_name")).select_from(c.join(o, c.c.organization_id == o.c.id))


def serialize(row) -> dict:
    row = dict(row)
    row.pop("created_at", None)
    row.pop("updated_at", None)
    return row


def get_contact(conn: Connection, contact_id: int) -> dict:
    row = conn.execute(contact_query().where(c.c.id == contact_id)).mappings().first()
    if row is None:
        raise NotFound("Contact not found")
    return serialize(row)


def _check_organization(conn: Connection, organization_id: int) -> None:
    if conn.execute(select(o.c.id).where(o.c.id == organization_id)).first() is None:
        raise ValidationFailed({"organization_id": "Organization not found"})


def _deals_led_by(conn: Connection, contact_id: int):
    return conn.execute(select(d.c.id, d.c.name).where(d.c.contact_id == contact_id).order_by(d.c.name)).all()


@router.get("")
def list_contacts(
    status: str | None = None,
    organization_id: int | None = None,
    params: ListParams = Depends(list_params),
):
    query = contact_query()
    if status:
        if status not in CONTACT_STATUSES:
            raise ValidationFailed({"status": "Choose lead, qualified or customer"})
        query = query.where(c.c.status == status)
    if organization_id is not None:
        query = query.where(c.c.organization_id == organization_id)
    with db.get_engine().connect() as conn:
        page = paginate(
            conn,
            query,
            params,
            search_columns=[c.c.name, c.c.email, o.c.name],
            sort_columns={
                "name": c.c.name,
                "organization": o.c.name,
                "job_title": c.c.job_title,
                "email": c.c.email,
                "phone": c.c.phone,
                "status": c.c.status,
            },
            default_sort="name",
            id_column=c.c.id,
        )
    page["items"] = [serialize(r) for r in page["items"]]
    return page


@router.post("", status_code=201)
def create_contact(body: ContactCreate):
    with db.get_engine().begin() as conn:
        _check_organization(conn, body.organization_id)
        new_id = conn.execute(insert(c).values(**body.model_dump())).inserted_primary_key[0]
        return get_contact(conn, new_id)


@router.get("/{contact_id}")
def read_contact(contact_id: int):
    with db.get_engine().connect() as conn:
        contact = get_contact(conn, contact_id)
        deals = conn.execute(deal_query().where(d.c.contact_id == contact_id).order_by(d.c.close_date.desc())).mappings()
        contact["deals"] = [serialize_deal(r) for r in deals]
        contact["timeline"] = timeline(conn, contact_id=contact_id)
        return contact


@router.patch("/{contact_id}")
def update_contact(contact_id: int, body: ContactUpdate):
    values = body.provided()
    with db.get_engine().begin() as conn:
        contact = get_contact(conn, contact_id)
        if "organization_id" in values and values["organization_id"] != contact["organization_id"]:
            _check_organization(conn, values["organization_id"])
            led = _deals_led_by(conn, contact_id)
            if led:
                names = ", ".join(r.name for r in led)
                raise ValidationFailed(
                    {"organization_id": f"{contact['name']} is the main contact on {names} at {contact['organization_name']}, so they can't move yet"}
                )
        if values:
            conn.execute(update(c).where(c.c.id == contact_id).values(**values))
        return get_contact(conn, contact_id)


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int):
    with db.get_engine().begin() as conn:
        contact = get_contact(conn, contact_id)
        led = _deals_led_by(conn, contact_id)
        if led:
            count = len(led)
            raise DeleteBlocked(
                f"{contact['name']} can't be deleted because they're the main contact on {count} deal{'' if count == 1 else 's'}.",
                [{"type": "deal", "id": r.id, "name": r.name} for r in led],
            )
        # Activities stay, with the link to the contact removed.
        conn.execute(update(a).where(a.c.contact_id == contact_id).values(contact_id=None))
        conn.execute(delete(c).where(c.c.id == contact_id))
