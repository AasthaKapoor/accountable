import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ConfirmDelete } from "../../components/ConfirmDelete";
import { columnHelper, DataTable, SearchBox, useListParams } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { PageHeader } from "../../components/Layout";
import { LateTag, StagePill } from "../../components/Pill";
import { RowMenu } from "../../components/RowMenu";
import { api } from "../../lib/api";
import { formatDate, formatMoney } from "../../lib/format";
import { useRefreshAll } from "../../lib/queries";
import type { Deal, Page } from "../../lib/types";
import { DealForm } from "./DealForm";

const col = columnHelper<Deal>();

export function CloseDate({ deal }: { deal: Pick<Deal, "close_date" | "is_late"> }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span className={`mono${deal.is_late ? " late-text" : ""}`}>{formatDate(deal.close_date)}</span>
      {deal.is_late && <LateTag />}
    </span>
  );
}

export function DealsPage() {
  const navigate = useNavigate();
  const refresh = useRefreshAll();
  const list = useListParams({ id: "close_date", desc: true });
  const [editing, setEditing] = useState<Deal | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Deal | null>(null);

  const query = useQuery({
    queryKey: ["deals", list.query],
    queryFn: () => api.get<Page<Deal>>("/deals", list.query),
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
      col.accessor("contact_name", {
        id: "contact",
        header: "Contact",
        cell: (c) => (
          <Link to={`/contacts/${c.row.original.contact_id}`} onClick={(e) => e.stopPropagation()}>
            {c.getValue()}
          </Link>
        ),
      }),
      col.accessor("stage", { header: "Stage", cell: (c) => <StagePill stage={c.getValue()} /> }),
      col.accessor("value_pence", { id: "value", header: "Value", meta: { className: "num mono" }, cell: (c) => formatMoney(c.getValue()) }),
      col.accessor("probability", { header: "Probability", meta: { className: "num mono" }, cell: (c) => `${c.getValue()}%` }),
      col.accessor("close_date", { header: "Close date", cell: (c) => <CloseDate deal={c.row.original} /> }),
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
      New deal
    </button>
  );

  return (
    <>
      <PageHeader title="Deals">{add}</PageHeader>
      <div className="toolbar">
        <SearchBox value={list.searchText} onChange={list.setSearchText} placeholder="Search by deal, organization or contact" />
      </div>
      <DataTable
        label="Deals"
        columns={columns}
        rows={query.data?.items}
        total={query.data?.total ?? 0}
        loading={query.isPending}
        sorting={list.sorting}
        onSortingChange={list.setSorting}
        page={list.page}
        onPageChange={list.setPage}
        onRowClick={(row) => navigate(`/deals/${row.id}`)}
        empty={<EmptyState message={list.query.search ? "No deals match your search." : "No deals yet."} action={add} />}
      />
      <DealForm open={adding} onOpenChange={setAdding} />
      <DealForm open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} deal={editing ?? undefined} />
      <ConfirmDelete
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete deal"
        name={deleting?.name ?? ""}
        consequence="Its activities, including stage changes, stay in recent activity without the link to the deal."
        onConfirm={() => api.delete(`/deals/${deleting!.id}`)}
        onDeleted={refresh}
      />
    </>
  );
}
