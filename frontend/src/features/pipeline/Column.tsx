import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Icon } from "../../components/Icon";
import { formatMoney } from "../../lib/format";
import { stageInfo, type Stage } from "../../lib/stages";
import type { ColumnTotals, Deal } from "../../lib/types";
import { DealCard } from "./DealCard";

export function Column({ stage, deals, totals, onAdd }: { stage: Stage; deals: Deal[]; totals: ColumnTotals; onAdd: () => void }) {
  const info = stageInfo(stage);
  const { setNodeRef } = useDroppable({ id: stage });
  return (
    <section className="col" style={{ background: info.tint }} aria-label={`${info.name} column`} data-stage={stage}>
      <div className="col-head">
        <div className="col-title">
          <span>{info.name}</span>
          <span className="count-badge" data-testid="column-count">{deals.length}</span>
        </div>
        {info.open ? (
          <>
            <div className="col-value" data-testid="column-value">{formatMoney(totals.value_pence ?? 0)}</div>
            <div className="col-exp">
              <span className="mono" data-testid="column-expected">{formatMoney(totals.expected_pence ?? 0)}</span> expected
            </div>
          </>
        ) : (
          <div className="col-closed" />
        )}
      </div>
      <SortableContext id={stage} items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div className="cards" ref={setNodeRef} data-testid="column-cards">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      </SortableContext>
      <button type="button" className="add-deal" onClick={onAdd} aria-label={`Add deal to ${info.name}`}>
        <Icon name="plus" />
        Add deal
      </button>
    </section>
  );
}
