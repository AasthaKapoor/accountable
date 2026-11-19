import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ConfirmDelete } from "../../components/ConfirmDelete";
import { columnHelper, DataTable, SearchBox, useListParams } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { PageHeader } from "../../components/Layout";
import { StatusPill } from "../../components/Pill";
import { RowMenu } from "../../components/RowMenu";
import { api } from "../../lib/api";
import { checkContact } from "../../lib/deleteChecks";
import { useRefreshAll } from "../../lib/queries";
import { STATUSES, type ContactStatus } from "../../lib/stages";
import type { Contact, Page } from "../../lib/types";
import { ContactForm } from "./ContactForm";

const col = columnHelper<Contact>();

export function ContactsPage() {
  const navigate = useNavigate();
  const refresh = useRefreshAll();
  const list = useListParams({ id: "name" });
  const [status, setStatus] = useState<ContactStatus | "">("");
  const [editing, setEditing] = useState<Contact | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Contact | null>(null);

  const params = { ...list.query, status };
  const query = useQuery({
    queryKey: ["contacts", params],
    queryFn: () => api.get<Page<Contact>>("/contacts", params),
    placeholderData: keepPreviousData,
  });

  const columns = useMemo(
    () => [
      col.accessor("name", { header: "Name", meta: { className: "name" } }),
      col.accessor("organization_name", {
        id: "organization",
        header: "Organization",
        cell: (c) => (
          <Link to={`/organizations/${c.row.original.organization_id}`} onClick={(e) => e.stopPropagation()}>
            {c.getValue()}
          </Link>
        ),
      }),
      col.accessor("job_title", { header: "Job title", cell: (c) => c.getValue() ?? "" }),
      col.accessor("email", { header: "Email", meta: { className: "cell-truncate" }, cell: (c) => c.getValue() ?? "" }),
      col.accessor("phone", { header: "Phone", meta: { className: "mono" }, cell: (c) => c.getValue() ?? "" }),
      col.accessor("status", { header: "Status", cell: (c) => <StatusPill status={c.getValue()} /> }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        meta: { className: "actions" },
        cell: (c) => <RowMenu label={c.row.original.name} onEdit={() => setEditing(c.row.original)} onDelete={() => setDeleting(c.row.original)} />,
      }),
    ],
    [],
  );

  const add = (
    <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
      <Icon name="plus" />
      New contact
    </button>
  );
  const filtered = list.query.search || status;

  return (
    <>
      <PageHeader title="Contacts">{add}</PageHeader>
      <div className="toolbar">
        <SearchBox value={list.searchText} onChange={list.setSearchText} placeholder="Search by name, email or organization" />
        <div className="segmented" role="group" aria-label="Filter by status">
          {[{ key: "" as const, name: "All" }, ...STATUSES].map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={status === s.key}
              onClick={() => {
                setStatus(s.key);
                list.resetPage();
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
      <DataTable
        label="Contacts"
        columns={columns}
        rows={query.data?.items}
        total={query.data?.total ?? 0}
        loading={query.isPending}
        sorting={list.sorting}
        onSortingChange={list.setSorting}
        page={list.page}
        onPageChange={list.setPage}
        onRowClick={(row) => navigate(`/contacts/${row.id}`)}
        empty={<EmptyState message={filtered ? "No contacts match." : "No contacts yet."} action={add} />}
      />
      <ContactForm open={adding} onOpenChange={setAdding} />
      <ContactForm open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} contact={editing ?? undefined} />
      <ConfirmDelete
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete contact"
        name={deleting?.name ?? ""}
        consequence="Their activities stay in recent activity, without the link to them. A contact who is the main contact on a deal can't be deleted."
        check={() => checkContact(deleting!.id)}
        onConfirm={() => api.delete(`/contacts/${deleting!.id}`)}
        onDeleted={refresh}
      />
    </>
  );
}
