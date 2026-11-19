import { EmptyState } from "../../components/EmptyState";
import { Panel } from "../../components/Panel";
import { StagePill } from "../../components/Pill";
import { capitalise, formatRelative } from "../../lib/format";
import { stageInfo } from "../../lib/stages";
import type { Activity } from "../../lib/types";
import { Subject } from "./FollowUps";

export function RecentActivity({ activities }: { activities: Activity[] }) {
  return (
    <Panel title="Recent activity" className="span-7">
      {activities.length === 0 ? (
        <EmptyState compact message="Nothing logged yet." />
      ) : (
        <div className="rows" data-testid="recent-activity">
          {activities.map((a) => (
            <div key={a.id} className="row act-row" data-testid="activity-row">
              <span className="dot" style={{ background: a.new_stage ? stageInfo(a.new_stage).colour : "rgba(7, 59, 76, 0.18)" }} />
              <span className="desc">
                {a.description}
                <Subject activity={a} />
              </span>
              {a.new_stage ? <StagePill stage={a.new_stage} small /> : <span className="t">{capitalise(a.type)}</span>}
              <span className="t" title={a.occurred_at}>{formatRelative(a.occurred_at)}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
