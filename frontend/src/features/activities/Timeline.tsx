import { useState } from "react";
import { Link } from "react-router";
import { ConfirmDelete } from "../../components/ConfirmDelete";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { Modal } from "../../components/Modal";
import { StagePill } from "../../components/Pill";
import { RowMenu } from "../../components/RowMenu";
import { api } from "../../lib/api";
import { formatDate, formatDateTime } from "../../lib/format";
import { useRefreshAll } from "../../lib/queries";
import type { Activity } from "../../lib/types";
import { ActivityForm, activityBody, activityValues, emptyActivity } from "./ActivityForm";
import { FollowUpCheck } from "./FollowUpCheck";

const TYPE_NAMES = { note: "Note", call: "Call", email: "Email", stage_change: "Stage change" };

/** The "Log activity" form and the entries for one contact or deal, newest first. */
export function Timeline({ activities, contactId, dealId, showDealLinks }: {
  activities: Activity[];
  contactId?: number;
  dealId?: number;
  /** On a contact's page, link entries that belong to one of their deals. */
  showDealLinks?: boolean;
}) {
  const refresh = useRefreshAll();
  const [editing, setEditing] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState<Activity | null>(null);

  const log = async (values: ReturnType<typeof emptyActivity>) => {
    await api.post("/activities", { ...activityBody(values), contact_id: contactId ?? null, deal_id: dealId ?? null });
    await refresh();
  };

  return (
    <section className="panel" aria-label="Timeline">
      <div className="panel-head">
        <h2>Timeline</h2>
      </div>
      <ActivityForm initial={emptyActivity()} submitLabel="Log activity" onSubmit={log} compact />
      {activities.length === 0 ? (
        <EmptyState compact message="Nothing logged yet." />
      ) : (
        <ol className="timeline" style={{ listStyle: "none", margin: 0, padding: 0 }} aria-label="Timeline entries">
          {activities.map((a) => (
            <li key={a.id} className="entry">
              <span className="entry-icon" title={TYPE_NAMES[a.type]}>
                <Icon name={a.type} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div>{a.description}</div>
                <div className="entry-meta">
                  <span>{TYPE_NAMES[a.type]}</span>
                  <span className="mono">{formatDateTime(a.occurred_at)}</span>
                  {a.new_stage && <StagePill stage={a.new_stage} small />}
                  {showDealLinks && a.deal_id && <Link to={`/deals/${a.deal_id}`}>{a.deal_name}</Link>}
                  {a.follow_up_date && (
                    <span className={`chip${a.follow_up_done ? " done" : a.follow_up_status === "overdue" ? " overdue" : ""}`}>
                      <FollowUpCheck activity={a} label={`Mark follow-up on ${formatDate(a.follow_up_date)} done`} />
                      Follow up {formatDate(a.follow_up_date)}
                    </span>
                  )}
                </div>
              </div>
              <RowMenu
                label={a.description}
                onEdit={a.type === "stage_change" ? undefined : () => setEditing(a)}
                onDelete={() => setDeleting(a)}
              />
            </li>
          ))}
        </ol>
      )}
      <Modal open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title="Edit activity">
        {editing && (
          <ActivityForm
            initial={activityValues(editing)}
            submitLabel="Save changes"
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              await api.patch(`/activities/${editing.id}`, activityBody(values));
              await refresh();
              setEditing(null);
            }}
          />
        )}
      </Modal>
      <ConfirmDelete
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete activity"
        name={deleting ? `"${deleting.description}"` : ""}
        onConfirm={() => api.delete(`/activities/${deleting!.id}`)}
        onDeleted={refresh}
      />
    </section>
  );
}
