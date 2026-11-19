import { useState } from "react";
import { Link, useParams } from "react-router";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { PageHeader } from "../../components/Layout";
import { Panel } from "../../components/Panel";
import { StagePill, StatusPill } from "../../components/Pill";
import { RecordState } from "../../components/RecordState";
import { formatMoney } from "../../lib/format";
import { WebsiteLink } from "../../lib/links";
import { useRecord } from "../../lib/queries";
import type { OrganizationDetail } from "../../lib/types";
import { ContactForm } from "../contacts/ContactForm";
import { DealForm } from "../deals/DealForm";
import { CloseDate } from "../deals/DealsPage";
import { OrganizationForm } from "./OrganizationForm";

export function OrganizationPage() {
  const { id } = useParams();
  const query = useRecord<OrganizationDetail>("organizations", id);
  const [editing, setEditing] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [addingDeal, setAddingDeal] = useState(false);

  const org = query.data;
  if (!org) return <RecordState error={query.error} kind="Organization" back="/organizations" />;

  const addButton = (label: string, onClick: () => void) => (
    <button type="button" className="btn btn-quiet btn-small" onClick={onClick}>
      <Icon name="plus" />
      {label}
    </button>
  );

  return (
    <>
      <PageHeader title={org.name} crumb={<Link to="/organizations">Organizations</Link>} sub={org.industry ?? undefined} />
      <div className="record-grid">
        <div className="stack-v">
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
              <dt>Name</dt>
              <dd>{org.name}</dd>
              <dt>Industry</dt>
              <dd>{org.industry ?? <span className="muted">Not set</span>}</dd>
              <dt>Website</dt>
              <dd>{org.website ? <WebsiteLink website={org.website} /> : <span className="muted">Not set</span>}</dd>
              <dt>Notes</dt>
              <dd className="notes">{org.notes ?? <span className="muted">None</span>}</dd>
            </dl>
          </Panel>
          <Panel title="Open pipeline">
            <div className="figures">
              <div className="figure">
                <div className="label">Open value</div>
                <div className="value">{formatMoney(org.totals.value_pence)}</div>
              </div>
              <div className="figure">
                <div className="label">Expected revenue</div>
                <div className="value">{formatMoney(org.totals.expected_pence)}</div>
              </div>
            </div>
          </Panel>
        </div>
        <div className="stack-v">
          <Panel title="Contacts" actions={addButton("Add contact", () => setAddingContact(true))}>
            {org.contacts.length === 0 ? (
              <EmptyState compact message="No contacts yet." />
            ) : (
              <div className="mini-list">
                {org.contacts.map((c) => (
                  <div key={c.id} className="mini-row">
                    <div>
                      <Link className="main-text" to={`/contacts/${c.id}`}>
                        {c.name}
                      </Link>
                      <div className="sub-text">{c.job_title}</div>
                    </div>
                    <StatusPill status={c.status} />
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <Panel title="Deals" actions={addButton("Add deal", () => setAddingDeal(true))}>
            {org.deals.length === 0 ? (
              <EmptyState compact message="No deals yet." />
            ) : (
              <div className="mini-list">
                {org.deals.map((d) => (
                  <div key={d.id} className="mini-row">
                    <div>
                      <Link className="main-text" to={`/deals/${d.id}`}>
                        {d.name}
                      </Link>
                      <div className="sub-text">
                        <CloseDate deal={d} />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <span className="mono">{formatMoney(d.value_pence)}</span>
                      <StagePill stage={d.stage} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
      <OrganizationForm open={editing} onOpenChange={setEditing} organization={org} />
      <ContactForm open={addingContact} onOpenChange={setAddingContact} organizationId={org.id} />
      <DealForm open={addingDeal} onOpenChange={setAddingDeal} defaults={{ organizationId: org.id }} />
    </>
  );
}
