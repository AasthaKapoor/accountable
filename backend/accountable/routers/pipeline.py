from fastapi import APIRouter

from .. import db, rules
from .deals import board_totals, deal_query, serialize

router = APIRouter(prefix="/pipeline", tags=["pipeline"])

d = db.deals


@router.get("")
def pipeline():
    """Every deal, grouped by stage and ordered by position, with board and column totals."""
    with db.get_engine().connect() as conn:
        rows = conn.execute(deal_query().order_by(d.c.position, d.c.id)).mappings()
        deals = [serialize(r) for r in rows]
        totals = board_totals(conn)
    return {
        "columns": [
            {
                "stage": stage,
                "deals": [x for x in deals if x["stage"] == stage],
                "totals": totals["columns"][stage],
            }
            for stage in rules.STAGES
        ],
        "totals": totals["board"],
    }
