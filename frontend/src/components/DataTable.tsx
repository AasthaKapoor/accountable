import {
  createColumnHelper,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { SkeletonRows } from "./Skeleton";

// Sorting and paging happen on the server; the table only shows one page.
export const features = tableFeatures({ rowSortingFeature, rowPaginationFeature });
export type Column<T extends RowData> = ColumnDef<typeof features, T, any>;
export const columnHelper = <T extends RowData>() => createColumnHelper<typeof features, T>();

declare module "@tanstack/react-table" {
  interface ColumnMeta<TFeatures, TData, TValue> {
    className?: string;
  }
}

export const PAGE_SIZE = 25;

/** Search (debounced 250ms), sort and page for a server-side list. */
export function useListParams(defaultSort: { id: string; desc?: boolean }) {
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: defaultSort.id, desc: defaultSort.desc ?? false }]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const next = searchText.trim();
    if (next === search) return;
    const timer = setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchText, search]);

  const sort = sorting[0];
  return {
    searchText,
    setSearchText,
    sorting,
    setSorting: (updater: Updater<SortingState>) => {
      setSorting((current) => (typeof updater === "function" ? updater(current) : updater));
      setPage(1);
    },
    page,
    setPage,
    query: { search, sort: sort?.id, order: sort?.desc ? "desc" : "asc", page, page_size: PAGE_SIZE },
    resetPage: () => setPage(1),
  };
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="search">
      <Icon name="search" />
      <span className="sr-only">Search</span>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function DataTable<T extends RowData & { id: number }>({
  label,
  columns,
  rows,
  total,
  loading,
  sorting,
  onSortingChange,
  page,
  onPageChange,
  onRowClick,
  empty,
}: {
  label: string;
  columns: Column<T>[];
  rows: T[] | undefined;
  total: number;
  loading: boolean;
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
  page: number;
  onPageChange: (page: number) => void;
  onRowClick: (row: T) => void;
  empty: ReactNode;
}) {
  const table = useTable({
    features,
    columns,
    data: rows ?? [],
    getRowId: (row) => String(row.id),
    manualSorting: true,
    manualPagination: true,
    enableSortingRemoval: false,
    sortDescFirst: false,
    enableMultiSort: false,
    rowCount: total,
    state: { sorting, pagination: { pageIndex: page - 1, pageSize: PAGE_SIZE } },
    onSortingChange,
  });

  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const showEmpty = !loading && rows !== undefined && rows.length === 0;

  return (
    <div className="panel table-panel">
      <table className="data-table" aria-label={label} aria-busy={loading}>
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const column = header.column;
                const sorted = column.getIsSorted();
                const className = column.columnDef.meta?.className;
                return (
                  <th
                    key={header.id}
                    className={className}
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                  >
                    {column.getCanSort() ? (
                      <button type="button" onClick={column.getToggleSortingHandler()}>
                        <table.FlexRender header={header} />
                        {sorted && <Icon name={sorted === "asc" ? "sortUp" : "sortDown"} />}
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {loading && rows === undefined ? (
            <SkeletonRows columns={columns.length} />
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} onClick={() => onRowClick(row.original)}>
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className={cell.column.columnDef.meta?.className}>
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {showEmpty && empty}
      {!showEmpty && (
        <div className="pager">
          <span className="mono" aria-live="polite">
            {first}–{last} of {total}
          </span>
          <div className="pager-buttons">
            <button type="button" className="btn btn-quiet btn-small" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <Icon name="chevronLeft" />
              Previous
            </button>
            <button type="button" className="btn btn-quiet btn-small" disabled={last >= total} onClick={() => onPageChange(page + 1)}>
              Next
              <Icon name="chevronRight" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
