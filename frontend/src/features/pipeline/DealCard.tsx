import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "react-router";
import { LateTag } from "../../components/Pill";
import { formatDate, formatMoney } from "../../lib/format";
import { stageInfo } from "../../lib/stages";
import type { Deal } from "../../lib/types";

export function DealCardBody({ deal }: { deal: Deal }) {
  return (
    <>
      {deal.is_late && <LateTag />}
      <div className="card-value">{formatMoney(deal.value_pence)}</div>
      <div className="card-name">{deal.name}</div>
      <div className="card-org">{deal.organization_name}</div>
      <div className="card-meter">
        <span className="track">
          <span className="fill" style={{ width: `${deal.probability}%`, background: stageInfo(deal.stage).colour }} />
        </span>
        {deal.probability}%
      </div>
      <div className={`card-date${deal.is_late ? " late-text" : ""}`}>
        {deal.is_late ? "Due " : ""}
        {formatDate(deal.close_date)}
      </div>
    </>
  );
}

/** A draggable card. A click (without a drag) opens the deal. */
export function DealCard({ deal }: { deal: Deal }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id, data: { stage: deal.stage } });
  return (
    <div
      ref={setNodeRef}
      className={`card${isDragging ? " placeholder" : ""}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-testid="deal-card"
      data-deal-id={deal.id}
      aria-label={`${deal.name}, ${formatMoney(deal.value_pence)}`}
      {...attributes}
      {...listeners}
      onClick={() => navigate(`/deals/${deal.id}`)}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === "Enter" && !e.defaultPrevented) navigate(`/deals/${deal.id}`);
      }}
    >
      <DealCardBody deal={deal} />
    </div>
  );
}
