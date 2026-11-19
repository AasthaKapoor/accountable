import { expect, test } from "vitest";
import { contactBlocked, organizationBlocked } from "./deleteChecks";

const item = (id: number, name: string) => ({ id, name }) as never;

test("organization with contacts and deals", () => {
  const blocked = organizationBlocked({ name: "Acme Ltd", contacts: [item(1, "A"), item(2, "B"), item(3, "C")], deals: [item(4, "X"), item(5, "Y")] });
  expect(blocked?.message).toBe("Acme Ltd can't be deleted because it still has 3 contacts and 2 deals.");
  expect(blocked?.blocking).toHaveLength(5);
});

test("organization with one contact", () => {
  expect(organizationBlocked({ name: "Acme Ltd", contacts: [item(1, "A")], deals: [] })?.message).toBe(
    "Acme Ltd can't be deleted because it still has 1 contact.",
  );
});

test("empty organization can be deleted", () => {
  expect(organizationBlocked({ name: "Acme Ltd", contacts: [], deals: [] })).toBeNull();
});

test("main contact on deals", () => {
  expect(contactBlocked({ name: "Ann", deals: [item(1, "One")] })?.message).toBe(
    "Ann can't be deleted because they're the main contact on 1 deal.",
  );
  expect(contactBlocked({ name: "Ann", deals: [] })).toBeNull();
});
