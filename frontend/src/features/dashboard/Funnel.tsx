import { Panel } from "../../components/Panel";
import { formatMoneyShort } from "../../lib/format";
import { stageInfo } from "../../lib/stages";
import type { Dashboard } from "../../lib/types";

const MAX_BAR = 170;

/** Value reaching each stage, as columns stepping down, with the conversion from the stage before. */
export function Funnel({ funnel }: { funnel: Dashboard["funnel"] }) {
  const top = Math.max(...funnel.map((f) => f.value_pence), 1);
  return (
    <Panel title="Sales funnel" hint="Value reaching each stage, and conversion from the stage before" className="span-8">
      <div className="funnel" data-testid="funnel">
        {funnel.map((f, i) => {
          const info = stageInfo(f.stage);
          const previous = funnel[i - 1]?.value_pence;
          return (
            <div className="fcol" key={f.stage} data-stage={f.stage}>
              {i > 0 && (
                <span className="conv" title={`Conversion from ${stageInfo(funnel[i - 1].stage).name}`}>
                  {previous ? `${Math.round((f.value_pence / previous) * 100)}%` : "–"}
                </span>
              )}
              <span className="fv">{formatMoneyShort(f.value_pence)}</span>
              <div className="fb" style={{ height: (f.value_pence / top) * MAX_BAR, background: info.colour }} />
              <span className="fn">{info.name}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
