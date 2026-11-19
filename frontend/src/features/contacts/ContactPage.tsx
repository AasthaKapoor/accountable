import { useState } from "react";
import { Link, useParams } from "react-router";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { PageHeader } from "../../components/Layout";
import { Panel } from "../../components/Panel";
import { StagePill, StatusPill } from "../../components/Pill";
import { RecordState } from "../../components/RecordState";
import { formatMoney } from "../../lib/format";
import { useRecord } from "../../lib/queries";
import type { ContactDetail } from "../../lib/types";
import { Timeline } from "../activities/Timeline";
import { DealForm } from "../deals/DealForm";
import { CloseDate } from "../deals/DealsPage";
import { ContactForm } from "./ContactForm";

export function ContactPage() {
  const { id } = useParams();
  const query = useRecord<ContactDetail>("contacts", id);
  const [editing, setEditing] = useState(false);
  const [addingDeal, setAddingDeal] = useState(false);

  const contact = query.data;
  if (!contact) return <RecordState error={query.error} kind="Contact" back="/contacts" />;

  return (
    <>
      <PageHeader
        title={contact.name}
        crumb={<Link to="/contacts">Contacts</Link>}
        sub={[contact.job_title, contact.organization_name].filter(Boolean).join(" at ")}
      />
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
              <dt>Status</dt>
              <dd>
                <StatusPill status={contact.status} />
              </dd>
              <dt>Organization</dt>
              <dd>
                <Link to={`/organizations/${contact.organization_id}`}>{contact.organization_name}</Link>
              </dd>
              <dt>Job title</dt>
              <dd>{contact.job_title ?? <span className="muted">Not set</span>}</dd>
              <dt>Email</dt>
              <dd>{contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : <span className="muted">Not set</span>}</dd>
              <dt>Phone</dt>
              <dd className="mono">{contact.phone ?? <span className="muted">Not set</span>}</dd>
            </dl>
          </Panel>
          <Panel
            title="Deals"
            actions={
              <button type="button" className="btn btn-quiet btn-small" onClick={() => setAddingDeal(true)}>
                <Icon name="plus" />
                Add deal
              </button>
            }
          >
            {contact.deals.length === 0 ? (
              <EmptyState compact message="Not the main contact on any deals." />
            ) : (
              <div className="mini-list">
                {contact.deals.map((d) => (
                  <div key={d.id} className="mini-row">
                    <div>
                      <Link className="main-text" to={`/deals/${d.id}`}>
                        {d.name}
                      </Link>
                      <div className="sub-text">
                        <span className="mono">{formatMoney(d.value_pence)}</span> · <CloseDate deal={d} />
                      </div>
                    </div>
                    <StagePill stage={d.stage} />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
        <Timeline activities={contact.timeline} contactId={contact.id} showDealLinks />
      </div>
      <ContactForm open={editing} onOpenChange={setEditing} contact={contact} />
      <DealForm
        open={addingDeal}
        onOpenChange={setAddingDeal}
        defaults={{ organizationId: contact.organization_id, contactId: contact.id }}
      />
    </>
  );
}
