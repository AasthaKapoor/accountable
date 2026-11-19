import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";
import type { Contact, Organization, Page } from "./types";

/** After any change, refetch everything: lists, records, the board and the dashboard. */
export function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}

/** Every organization, for pickers. */
export function useOrganizationOptions() {
  return useQuery({
    queryKey: ["organizations", "options"],
    queryFn: () => api.get<Page<Organization>>("/organizations", { sort: "name", page_size: 100 }),
    select: (page) => page.items,
  });
}

/** One organization's contacts, for the deal form's contact picker. */
export function useContactOptions(organizationId: number | undefined) {
  return useQuery({
    queryKey: ["contacts", "options", organizationId],
    queryFn: () => api.get<Page<Contact>>("/contacts", { organization_id: organizationId, sort: "name", page_size: 100 }),
    select: (page) => page.items,
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
