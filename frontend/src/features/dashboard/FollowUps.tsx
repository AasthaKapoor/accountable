import * as Tabs from "@radix-ui/react-tabs";
import { useState } from "react";
import { Link } from "react-router";
import { EmptyState } from "../../components/EmptyState";
import { formatDate } from "../../lib/format";
import type { Activity, Dashboard } from "../../lib/types";
import { FollowUpCheck } from "../activities/FollowUpCheck";

/** The contact or deal an activity belongs to, or its kept label if both are gone. */
export function Subject({ activity, className }: { activity: Activity; className?: string }) {
  if (activity.deal_id) return <Link className={className} to={`/deals/${activity.deal_id}`}>{activity.deal_name}</Link>;
  if (activity.contact_id) return <Link className={className} to={`/contacts/${activity.contact_id}`}>{activity.contact_name}</Link>;
  return <span className={`muted kept ${className ?? ""}`}>{activity.subject_label}</span>;
}

function Rows({ items, overdue }: { items: Activity[]; overdue?: boolean }) {
  if (items.length === 0) return <EmptyState compact message={overdue ? "Nothing overdue." : "Nothing due in the next 14 days."} />;
  return (
    <div className="rows">
      {items.map((a) => (
        <div key={a.id} className="row follow-row" data-testid="follow-up">
          <FollowUpCheck activity={a} label={`Mark "${a.description}" done`} />
          <span className={`d${overdue ? " overdue" : ""}`}>{formatDate(a.follow_up_date!)}</span>
          <div>
            {a.description}
            <div className="sub">
              <Subject activity={a} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FollowUps({ followUps }: { followUps: Dashboard["follow_ups"] }) {
  const [tab, setTab] = useState(followUps.overdue.length ? "overdue" : "upcoming");
  return (
    <Tabs.Root value={tab} onValueChange={setTab} asChild>
      <section className="panel span-5 top" aria-label="Follow-ups">
        <div className="panel-head">
          <h2>Follow-ups</h2>
          <Tabs.List className="segmented light" aria-label="Follow-ups">
            <Tabs.Trigger value="overdue">
              Overdue <span className="count-badge alert">{followUps.overdue.length}</span>
            </Tabs.Trigger>
            <Tabs.Trigger value="upcoming">
              Upcoming <span className="count-badge quiet">{followUps.upcoming.length}</span>
            </Tabs.Trigger>
          </Tabs.List>
        </div>
        <Tabs.Content value="overdue">
          <Rows items={followUps.overdue} overdue />
        </Tabs.Content>
        <Tabs.Content value="upcoming">
          <Rows items={followUps.upcoming} />
        </Tabs.Content>
      </section>
    </Tabs.Root>
  );
}
