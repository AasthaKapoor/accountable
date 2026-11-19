import { expect, test } from "./fixtures";

const table = (page) => page.getByRole("table", { name: "Contacts" });
const rows = (page) => table(page).locator("tbody tr");

test("add, search, sort, edit and delete a contact", async ({ page }) => {
  await page.goto("/contacts");
  await expect(page.getByText("1–25 of 30")).toBeVisible();

  await page.getByRole("button", { name: "New contact" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Zoe Quinn");
  await dialog.getByLabel("Organization").selectOption({ label: "Lumen Studio" });
  await dialog.getByLabel("Email").fill("zoe@");
  await expect(dialog.getByText("Enter a valid email address")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Add contact" })).toBeDisabled();
  await dialog.getByLabel("Email").fill("zoe@lumen.example");
  await dialog.getByLabel("Status").selectOption("qualified");
  await dialog.getByRole("button", { name: "Add contact" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("1–25 of 31")).toBeVisible();

  // Search by organization name and by email
  const search = page.getByPlaceholder("Search by name, email or organization");
  await search.fill("lumen.example");
  await expect(rows(page)).toHaveCount(1);
  await search.fill("lumen");
  await expect(rows(page)).toHaveCount(4);
  await search.fill("");

  // Sort by name descending puts Zoe first
  await page.getByRole("button", { name: "Name" }).click();
  await expect(rows(page).first()).toContainText("Zoe Quinn");
  await expect(rows(page).first()).toContainText("Qualified");

  // Edit
  await page.getByRole("button", { name: "Actions for Zoe Quinn" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await dialog.getByLabel("Job title").fill("Producer");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Name" }).click();
  await expect(rows(page).first()).toContainText("Producer");

  // Delete
  await page.getByRole("button", { name: "Actions for Zoe Quinn" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await dialog.getByRole("button", { name: "Delete contact" }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(page.getByText("1–25 of 30")).toBeVisible();
  await expect(table(page).getByText("Zoe Quinn")).toHaveCount(0);
});

test("filters by status", async ({ page }) => {
  await page.goto("/contacts");
  const filter = page.getByRole("group", { name: "Filter by status" });
  for (const [key, label] of [["lead", "Lead"], ["qualified", "Qualified"], ["customer", "Customer"]]) {
    const { total: count } = await page.request.get(`/api/contacts?status=${key}`).then((r) => r.json());
    expect(count).toBeGreaterThan(0);
    await filter.getByRole("button", { name: label }).click();
    await expect(page.getByText(`1–${count} of ${count}`)).toBeVisible();
    await expect(rows(page)).toHaveCount(count);
    for (const status of await table(page).locator("tbody .pill").allTextContents()) expect(status).toBe(label);
  }
  await filter.getByRole("button", { name: "All" }).click();
  await expect(page.getByText("1–25 of 30")).toBeVisible();
});

test("a main contact on a deal can't be deleted", async ({ page }) => {
  await page.goto("/contacts");
  await page.getByRole("button", { name: "Actions for Priya Shah" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog");
  // The dialog explains straight away, without trying the delete
  await expect(dialog.getByRole("button", { name: "Delete contact" })).toHaveCount(0);
  await expect(dialog).toContainText("Priya Shah can't be deleted because they're the main contact on 3 deals.");
  await expect(dialog.getByRole("link", { name: "Fleet tracking rollout" })).toBeVisible();
  await dialog.getByRole("button", { name: "OK" }).click();
  await page.reload();
  await expect(table(page).getByRole("cell", { name: "Priya Shah", exact: true })).toBeVisible();
});

test("the record page shows the organization, deals and timeline", async ({ page }) => {
  await page.goto("/contacts");
  await page.getByRole("cell", { name: "Daniel Okafor", exact: true }).click();
  await expect(page).toHaveURL(/\/contacts\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Daniel Okafor" })).toBeVisible();
  const details = page.getByRole("region", { name: "Details" });
  await expect(details.getByRole("link", { name: "Ashford Retail" })).toBeVisible();
  const deals = page.getByRole("region", { name: "Deals" });
  await expect(deals.getByRole("link", { name: "Annual licence renewal" })).toBeVisible();
  await expect(deals.getByRole("link", { name: "Payroll module" })).toBeVisible();
  const entries = page.getByRole("list", { name: "Timeline entries" }).getByRole("listitem");
  await expect(entries.first()).toContainText("Agreed renewal terms in principle");
  await expect(page.getByRole("list", { name: "Timeline entries" })).toContainText("Moved from Negotiation to Lost");

  await details.getByRole("link", { name: "Ashford Retail" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ashford Retail" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Contacts" }).getByRole("link", { name: "Daniel Okafor" })).toBeVisible();
});
