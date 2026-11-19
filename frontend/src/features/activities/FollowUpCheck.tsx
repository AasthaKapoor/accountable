import { useEffect, useState } from "react";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { useRefreshAll } from "../../lib/queries";
import type { Activity } from "../../lib/types";

/** A checkbox that marks a follow-up done (or not done again). */
export function FollowUpCheck({ activity, label }: { activity: Activity; label: string }) {
  const toast = useToast();
  const refresh = useRefreshAll();
  const [done, setDone] = useState(activity.follow_up_done);
  useEffect(() => setDone(activity.follow_up_done), [activity.follow_up_done]);
  return (
    <input
      type="checkbox"
      className="check"
      aria-label={label}
      checked={done}
      onChange={async (e) => {
        const next = e.target.checked;
        setDone(next); // show the tick straight away
        try {
          await api.patch(`/activities/${activity.id}`, { follow_up_done: next });
          await refresh();
        } catch (error) {
          setDone(!next);
          toast(error instanceof Error ? error.message : "Couldn't update the follow-up");
        }
      }}
    />
  );
}
