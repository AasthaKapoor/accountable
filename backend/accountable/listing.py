"""Search, sort and pagination shared by the three list endpoints."""

from dataclasses import dataclass

from fastapi import Query
from sqlalchemy import ColumnElement, Select, String, func, or_, select
from sqlalchemy.engine import Connection

from .schemas import ValidationFailed

DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 100


@dataclass
class ListParams:
    search: str
    sort: str | None
    order: str
    page: int
    page_size: int


def list_params(
    search: str = "",
    sort: str | None = None,
    order: str = Query("asc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
) -> ListParams:
    return ListParams(search.strip(), sort, order, page, page_size)


def paginate(
    conn: Connection,
    query: Select,
    params: ListParams,
    *,
    search_columns: list[ColumnElement],
    sort_columns: dict[str, ColumnElement],
    default_sort: str,
    id_column: ColumnElement,
) -> dict:
    """Apply search, sort and paging to `query` and return one page with the total."""
    if params.search:
        # Escape LIKE's wildcards so % and _ match themselves.
        text = params.search.lower().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        needle = f"%{text}%"
        query = query.where(or_(*(func.lower(func.coalesce(c, "")).like(needle, escape="\\") for c in search_columns)))

    sort = params.sort or default_sort
    if sort not in sort_columns:
        raise ValidationFailed({"sort": f"Can't sort by {sort}"})
    column = sort_columns[sort]
    if isinstance(column.type, String):
        column = func.lower(column)
    direction = column.desc() if params.order == "desc" else column.asc()
    tiebreak = id_column.desc() if params.order == "desc" else id_column.asc()

    total = conn.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    rows = conn.execute(
        query.order_by(direction.nulls_last(), tiebreak)
        .limit(params.page_size)
        .offset((params.page - 1) * params.page_size)
    ).mappings()
    return {
        "items": [dict(r) for r in rows],
        "total": total,
        "page": params.page,
        "page_size": params.page_size,
    }
