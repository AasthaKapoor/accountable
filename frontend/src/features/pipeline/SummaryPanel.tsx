import { formatMoney } from "../../lib/format";
import { OPEN_STAGES, stageInfo } from "../../lib/stages";
import type { Pipeline } from "../../lib/types";

/** Board totals and the open value split by stage, on Midnight. */
export function SummaryPanel({ pipeline }: { pipeline: Pipeline }) {
  const stages = OPEN_STAGES.map((stage) => ({
    info: stageInfo(stage),
    value: pipeline.columns.find((c) => c.stage === stage)!.totals.value_pence ?? 0,
  }));
  return (
    <section className="summary" aria-label="Pipeline summary">
      <div>
        <div className="label">Open value</div>
        <div className="value" data-testid="board-value">{formatMoney(pipeline.totals.value_pence)}</div>
      </div>
      <div>
        <div className="label">Expected revenue</div>
        <div className="value" data-testid="board-expected">{formatMoney(pipeline.totals.expected_pence)}</div>
      </div>
      <div>
        <div className="label">Open deals</div>
        <div className="value" data-testid="board-count">{pipeline.totals.count}</div>
      </div>
      <div aria-hidden="true">
        <div className="split">
          {stages.map((s) => (
            <div key={s.info.key} style={{ flexGrow: s.value, background: s.info.colourOnDark }} title={`${s.info.name}: ${formatMoney(s.value)}`} />
          ))}
        </div>
        <div className="split-labels">
          {stages.map((s) => (
            <span key={s.info.key} style={{ flexGrow: s.value }}>
              {s.info.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
