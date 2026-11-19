import { describe, expect, test } from "vitest";
import { contactSchema } from "./contacts/schema";
import { dealSchema } from "./deals/schema";
import { organizationSchema } from "./organizations/schema";

function errorsOf(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  return Object.fromEntries((result.error?.issues ?? []).map((i) => [i.path.join("."), i.message]));
}

describe("organization", () => {
  const valid = { name: "Acme Ltd", website: "", industry: "", notes: "" };
  test("valid", () => expect(organizationSchema.safeParse(valid).success).toBe(true));
  test("name required", () => {
    expect(errorsOf(organizationSchema.safeParse({ ...valid, name: "" }))).toEqual({ name: "Required" });
    expect(errorsOf(organizationSchema.safeParse({ ...valid, name: "   " }))).toEqual({ name: "Required" });
  });
  test("name trimmed and 200 characters at most", () => {
    expect(organizationSchema.parse({ ...valid, name: "  Acme  " }).name).toBe("Acme");
    expect(errorsOf(organizationSchema.safeParse({ ...valid, name: "x".repeat(201) })).name).toBeDefined();
  });
});

describe("contact", () => {
  const valid = { name: "Ann", email: "", phone: "", job_title: "", organization_id: 1, status: "lead" };
  test("valid with optional fields blank", () => expect(contactSchema.safeParse(valid).success).toBe(true));
  test("name required", () => expect(errorsOf(contactSchema.safeParse({ ...valid, name: "" }))).toEqual({ name: "Required" }));
  test("organization required", () => {
    expect(errorsOf(contactSchema.safeParse({ ...valid, organization_id: undefined }))).toEqual({ organization_id: "Required" });
  });
  test("invalid email rejected", () => {
    expect(errorsOf(contactSchema.safeParse({ ...valid, email: "ann@" }))).toEqual({ email: "Enter a valid email address" });
    expect(contactSchema.safeParse({ ...valid, email: "ann@acme.co.uk" }).success).toBe(true);
  });
});

describe("deal", () => {
  const contacts = [
    { id: 10, organization_id: 1 },
    { id: 20, organization_id: 2 },
  ];
  const valid = { name: "Big", organization_id: 1, contact_id: 10, stage: "new", value_pounds: 1000, probability: 10, close_date: "2026-12-01" };

  test("valid", () => expect(dealSchema(contacts).safeParse(valid).success).toBe(true));

  test.each(["name", "organization_id", "contact_id", "value_pounds", "close_date"])("%s required", (field) => {
    const blank = field === "name" || field === "close_date" ? "" : undefined;
    expect(errorsOf(dealSchema(contacts).safeParse({ ...valid, [field]: blank }))).toEqual({ [field]: "Required" });
  });

  test("value can't be negative", () => {
    expect(errorsOf(dealSchema().safeParse({ ...valid, value_pounds: -1 }))).toEqual({ value_pounds: "Can't be negative" });
    expect(dealSchema().safeParse({ ...valid, value_pounds: 0 }).success).toBe(true);
  });

  test("probability between 0 and 100", () => {
    expect(errorsOf(dealSchema().safeParse({ ...valid, probability: 101 })).probability).toBeDefined();
  });

  test("contact must be from the chosen organization", () => {
    expect(errorsOf(dealSchema(contacts).safeParse({ ...valid, contact_id: 20 }))).toEqual({
      contact_id: "Choose a contact from this organization",
    });
    expect(dealSchema(contacts).safeParse({ ...valid, organization_id: 2, contact_id: 20 }).success).toBe(true);
  });
});
