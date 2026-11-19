import { formatMoney } from "../../lib/format";
import { stageInfo } from "../../lib/stages";
import type { Dashboard } from "../../lib/types";

/** Open value per stage as one segmented bar, labelled with the stage, count and value. */
export function StageBar({ stages }: { stages: Dashboard["stages"] }) {
  const total = stages.reduce((sum, s) => sum + s.value_pence, 0);
  return (
    <div className="stack" data-testid="stage-bar">
      {stages.map((s) => {
        const info = stageInfo(s.stage);
        return (
          <div key={s.stage} style={{ flex: total ? s.value_pence || 0.0001 : 1 }}>
            <div className="bar" style={{ background: info.colourOnDark, opacity: s.value_pence ? 1 : 0.25 }} />
            <div className="lab">
              {info.name} · {s.count}
              <span className="mono">{formatMoney(s.value_pence)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
