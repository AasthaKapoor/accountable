import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";
import type { Contact, Organization, Page } from "./types";

/** After any change, refetch everything: lists, records, the board and the dashboard. */
export function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}

/** The server's largest page size. */
const MAX_PAGE_SIZE = 100;

/** Every item of a list endpoint, fetching page after page until the total is reached. */
export async function fetchAll<T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const result = await api.get<Page<T>>(path, { ...query, page, page_size: MAX_PAGE_SIZE });
    items.push(...result.items);
    if (result.items.length === 0 || items.length >= result.total) return items;
  }
}

/** Every organization, for pickers. */
export function useOrganizationOptions() {
  return useQuery({
    queryKey: ["organizations", "options"],
    queryFn: () => fetchAll<Organization>("/organizations", { sort: "name" }),
  });
}

/** One organization's contacts, for the deal form's contact picker. */
export function useContactOptions(organizationId: number | undefined) {
  return useQuery({
    queryKey: ["contacts", "options", organizationId],
    queryFn: () => fetchAll<Contact>("/contacts", { organization_id: organizationId, sort: "name" }),
    enabled: organizationId !== undefined,
  });
}

/** One record for a record page, by its route id. */
export function useRecord<T>(kind: "organizations" | "contacts" | "deals", id: string | undefined) {
  return useQuery({
    queryKey: [kind, "record", id],
    queryFn: () => api.get<T>(`/${kind}/${id}`),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
  });
}
