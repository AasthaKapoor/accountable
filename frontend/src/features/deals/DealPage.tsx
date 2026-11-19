import * as Menu from "@radix-ui/react-dropdown-menu";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { Icon } from "../../components/Icon";
import { PageHeader } from "../../components/Layout";
import { Panel } from "../../components/Panel";
import { StagePill } from "../../components/Pill";
import { RecordState } from "../../components/RecordState";
import { useToast } from "../../components/Toast";
import { api } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { useRecord, useRefreshAll } from "../../lib/queries";
import { STAGES, stageInfo, type Stage } from "../../lib/stages";
import type { Deal, DealDetail } from "../../lib/types";
import { Timeline } from "../activities/Timeline";
import { DealForm } from "./DealForm";
import { CloseDate } from "./DealsPage";

/** The stage pill, which opens a menu of stages. Choosing one changes the stage. */
function StageDropdown({ deal }: { deal: Deal }) {
  const toast = useToast();
  const refresh = useRefreshAll();
  const change = async (stage: Stage) => {
    if (stage === deal.stage) return;
    try {
      await api.patch(`/deals/${deal.id}`, { stage });
      await refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Couldn't change the stage");
    }
  };
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger className="stage-trigger" aria-label={`Stage: ${stageInfo(deal.stage).name}. Change stage`}>
        <StagePill stage={deal.stage} />
        <Icon name="chevronDown" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className="menu" align="start" sideOffset={4}>
          <Menu.RadioGroup value={deal.stage} onValueChange={(v) => change(v as Stage)}>
            {STAGES.map((s) => (
              <Menu.RadioItem key={s.key} value={s.key} className="menu-item">
                <span className="dot" style={{ background: s.colour }} />
                {s.name}
                <Menu.ItemIndicator style={{ marginLeft: "auto" }}>
                  <span className="muted">Current</span>
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function DealPage() {
  const { id } = useParams();
  const query = useRecord<DealDetail>("deals", id);
  const [editing, setEditing] = useState(false);

  const deal = query.data;
  if (!deal) return <RecordState error={query.error} kind="Deal" back="/deals" />;

  return (
    <>
      <PageHeader title={deal.name} crumb={<Link to="/deals">Deals</Link>} sub={deal.organization_name} />
      <div className="record-grid">
        <Panel
          title="Details"
          actions={
            <button type="button" className="btn btn-quiet btn-small" onClick={() => setEditing(true)}>
              <Icon name="edit" />
              Edit
            </button>
          }
        >
          <dl className="details">
            <dt>Stage</dt>
            <dd>
              <StageDropdown deal={deal} />
            </dd>
            <dt>Value</dt>
            <dd className="mono">{formatMoney(deal.value_pence)}</dd>
            <dt>Probability</dt>
            <dd>
              <span className="mono">{deal.probability}%</span>
              {deal.probability_is_manual && <span className="muted"> · set by hand</span>}
            </dd>
            <dt>Expected</dt>
            <dd className="mono">{formatMoney(deal.expected_pence)}</dd>
            <dt>Close date</dt>
            <dd>
              <CloseDate deal={deal} />
            </dd>
            <dt>Organization</dt>
            <dd>
              <Link to={`/organizations/${deal.organization_id}`}>{deal.organization_name}</Link>
            </dd>
            <dt>Main contact</dt>
            <dd>
              <Link to={`/contacts/${deal.contact_id}`}>{deal.contact_name}</Link>
            </dd>
          </dl>
        </Panel>
        <Timeline activities={deal.timeline} dealId={deal.id} />
      </div>
      <DealForm open={editing} onOpenChange={setEditing} deal={deal} />
    </>
  );
}
