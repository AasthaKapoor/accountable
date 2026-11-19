// Checks run when a delete dialog opens, so a blocked delete is explained up front
// instead of failing with a 409. The wording matches the server's.
import { api } from "./api";
import type { Blocking, ContactDetail, OrganizationDetail } from "./types";

export interface Blocked {
  message: string;
  blocking: Blocking[];
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function organizationBlocked(org: Pick<OrganizationDetail, "name" | "contacts" | "deals">): Blocked | null {
  const { contacts, deals } = org;
  if (contacts.length === 0 && deals.length === 0) return null;
  const parts = [
    contacts.length ? plural(contacts.length, "contact") : null,
    deals.length ? plural(deals.length, "deal") : null,
  ].filter(Boolean);
  return {
    message: `${org.name} can't be deleted because it still has ${parts.join(" and ")}.`,
    blocking: [
      ...contacts.map((c) => ({ type: "contact" as const, id: c.id, name: c.name })),
      ...deals.map((d) => ({ type: "deal" as const, id: d.id, name: d.name })),
    ],
  };
}

export function contactBlocked(contact: Pick<ContactDetail, "name" | "deals">): Blocked | null {
  if (contact.deals.length === 0) return null;
  return {
    message: `${contact.name} can't be deleted because they're the main contact on ${plural(contact.deals.length, "deal")}.`,
    blocking: contact.deals.map((d) => ({ type: "deal" as const, id: d.id, name: d.name })),
  };
}

export const checkOrganization = (id: number) => api.get<OrganizationDetail>(`/organizations/${id}`).then(organizationBlocked);
export const checkContact = (id: number) => api.get<ContactDetail>(`/contacts/${id}`).then(contactBlocked);
