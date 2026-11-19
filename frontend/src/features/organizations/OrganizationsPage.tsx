import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ConfirmDelete } from "../../components/ConfirmDelete";
import { columnHelper, DataTable, SearchBox, useListParams } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { PageHeader } from "../../components/Layout";
import { RowMenu } from "../../components/RowMenu";
import { api } from "../../lib/api";
import { checkOrganization } from "../../lib/deleteChecks";
import { formatMoney } from "../../lib/format";
import { WebsiteLink } from "../../lib/links";
import { useRefreshAll } from "../../lib/queries";
import type { Organization, Page } from "../../lib/types";
import { OrganizationForm } from "./OrganizationForm";

const col = columnHelper<Organization>();

export function OrganizationsPage() {
  const navigate = useNavigate();
  const refresh = useRefreshAll();
  const list = useListParams({ id: "name" });
  const [editing, setEditing] = useState<Organization | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Organization | null>(null);

  const query = useQuery({
    queryKey: ["organizations", list.query],
    queryFn: () => api.get<Page<Organization>>("/organizations", list.query),
    placeholderData: keepPreviousData,
  });

  const columns = useMemo(
    () => [
      col.accessor("name", { header: "Name", meta: { className: "name" } }),
      col.accessor("industry", { header: "Industry", cell: (c) => c.getValue() ?? "" }),
      col.accessor("website", { header: "Website", cell: (c) => <WebsiteLink website={c.getValue()} /> }),
      col.accessor("contact_count", { id: "contacts", header: "Contacts", meta: { className: "num mono" } }),
      col.accessor("deal_count", { id: "deals", header: "Deals", meta: { className: "num mono" } }),
      col.accessor("open_value_pence", { id: "open_value", header: "Open value", meta: { className: "num mono" }, cell: (c) => formatMoney(c.getValue()) }),
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
      New organization
    </button>
  );

  return (
    <>
      <PageHeader title="Organizations">{add}</PageHeader>
      <div className="toolbar">
        <SearchBox value={list.searchText} onChange={list.setSearchText} placeholder="Search by name or industry" />
      </div>
      <DataTable
        label="Organizations"
        columns={columns}
        rows={query.data?.items}
        total={query.data?.total ?? 0}
        loading={query.isPending}
        sorting={list.sorting}
        onSortingChange={list.setSorting}
        page={list.page}
        onPageChange={list.setPage}
        onRowClick={(row) => navigate(`/organizations/${row.id}`)}
        empty={<EmptyState message={list.query.search ? "No organizations match your search." : "No organizations yet."} action={add} />}
      />
      <OrganizationForm open={adding} onOpenChange={setAdding} />
      <OrganizationForm open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} organization={editing ?? undefined} />
      <ConfirmDelete
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete organization"
        name={deleting?.name ?? ""}
        consequence="An organization can only be deleted once it has no contacts or deals."
        check={() => checkOrganization(deleting!.id)}
        onConfirm={() => api.delete(`/organizations/${deleting!.id}`)}
        onDeleted={refresh}
      />
    </>
  );
}
