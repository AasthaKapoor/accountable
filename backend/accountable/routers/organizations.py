from fastapi import APIRouter, Depends
from sqlalchemy import Select, delete, func, insert, select, update
from sqlalchemy.engine import Connection

from .. import db, rules
from ..listing import ListParams, list_params, paginate
from ..schemas import DeleteBlocked, NotFound, OrganizationCreate, OrganizationUpdate
from .contacts import contact_query
from .contacts import serialize as serialize_contact
from .deals import deal_query
from .deals import serialize as serialize_deal

router = APIRouter(prefix="/organizations", tags=["organizations"])

o, c, d = db.organizations, db.contacts, db.deals

contact_count = select(func.count()).where(c.c.organization_id == o.c.id).correlate(o).scalar_subquery()
deal_count = select(func.count()).where(d.c.organization_id == o.c.id).correlate(o).scalar_subquery()
open_value = (
    select(func.coalesce(func.sum(d.c.value_pence), 0))
    .where(d.c.organization_id == o.c.id, d.c.stage.in_(rules.OPEN_STAGES))
    .correlate(o)
    .scalar_subquery()
)


def organization_query() -> Select:
    return select(
        o,
        contact_count.label("contact_count"),
        deal_count.label("deal_count"),
        open_value.label("open_value_pence"),
    )


def _plural(count: int, word: str) -> str:
    return f"{count} {word}{'' if count == 1 else 's'}"


def serialize(row) -> dict:
    row = dict(row)
    row.pop("created_at", None)
    row.pop("updated_at", None)
    return row


def get_organization(conn: Connection, organization_id: int) -> dict:
    row = conn.execute(organization_query().where(o.c.id == organization_id)).mappings().first()
    if row is None:
        raise NotFound("Organization not found")
    return serialize(row)


@router.get("")
def list_organizations(params: ListParams = Depends(list_params)):
    with db.get_engine().connect() as conn:
        page = paginate(
            conn,
            organization_query(),
            params,
            search_columns=[o.c.name, o.c.industry],
            sort_columns={
                "name": o.c.name,
                "industry": o.c.industry,
                "website": o.c.website,
                "contacts": contact_count,
                "deals": deal_count,
                "open_value": open_value,
            },
            default_sort="name",
            id_column=o.c.id,
        )
    page["items"] = [serialize(r) for r in page["items"]]
    return page


@router.post("", status_code=201)
def create_organization(body: OrganizationCreate):
    with db.get_engine().begin() as conn:
        new_id = conn.execute(insert(o).values(**body.model_dump())).inserted_primary_key[0]
        return get_organization(conn, new_id)


@router.get("/{organization_id}")
def read_organization(organization_id: int):
    with db.get_engine().connect() as conn:
        organization = get_organization(conn, organization_id)
        contacts = conn.execute(contact_query().where(c.c.organization_id == organization_id).order_by(c.c.name)).mappings()
        deals = [
            serialize_deal(r)
            for r in conn.execute(deal_query().where(d.c.organization_id == organization_id).order_by(d.c.close_date.desc())).mappings()
        ]
        organization["contacts"] = [serialize_contact(r) for r in contacts]
        organization["deals"] = deals
        organization["totals"] = rules.totals(deals)
        return organization


@router.patch("/{organization_id}")
def update_organization(organization_id: int, body: OrganizationUpdate):
    values = body.provided()
    with db.get_engine().begin() as conn:
        get_organization(conn, organization_id)
        if values:
            conn.execute(update(o).where(o.c.id == organization_id).values(**values))
        return get_organization(conn, organization_id)


@router.delete("/{organization_id}", status_code=204)
def delete_organization(organization_id: int):
    with db.get_engine().begin() as conn:
        organization = get_organization(conn, organization_id)
        contacts = conn.execute(select(c.c.id, c.c.name).where(c.c.organization_id == organization_id).order_by(c.c.name)).all()
        deals = conn.execute(select(d.c.id, d.c.name).where(d.c.organization_id == organization_id).order_by(d.c.name)).all()
        if contacts or deals:
            parts = [_plural(len(x), w) for x, w in ((contacts, "contact"), (deals, "deal")) if x]
            raise DeleteBlocked(
                f"{organization['name']} can't be deleted because it still has {' and '.join(parts)}.",
                [{"type": "contact", "id": r.id, "name": r.name} for r in contacts]
                + [{"type": "deal", "id": r.id, "name": r.name} for r in deals],
                counts={"contacts": len(contacts), "deals": len(deals)},
            )
        conn.execute(delete(o).where(o.c.id == organization_id))
