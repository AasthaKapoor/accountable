import { expect, test } from "./fixtures";

const table = (page) => page.getByRole("table", { name: "Organizations" });
const rows = (page) => table(page).locator("tbody tr");

test("add, search, sort, page, edit and delete an organization", async ({ page }) => {
  await page.goto("/organizations");
  await expect(rows(page)).toHaveCount(10);
  await expect(page.getByText("1–10 of 10")).toBeVisible();

  // Add
  await page.getByRole("button", { name: "New organization" }).click();
  const dialog = page.getByRole("dialog");
  const save = dialog.getByRole("button", { name: "Add organization" });
  await expect(save).toBeDisabled();
  await dialog.getByLabel("Name").fill("Acme Ltd");
  await dialog.getByLabel("Industry").fill("Wholesale");
  await dialog.getByLabel("Website").fill("acme.example");
  await save.click();
  await expect(dialog).toBeHidden();
  await expect(table(page).getByRole("cell", { name: "Acme Ltd", exact: true })).toBeVisible();

  // Search by industry, then by name
  await page.getByPlaceholder("Search by name or industry").fill("wholesale");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Acme Ltd");
  await page.getByPlaceholder("Search by name or industry").fill("zzz");
  await expect(page.getByText("No organizations match your search.")).toBeVisible();
  await page.getByPlaceholder("Search by name or industry").fill("");
  await expect(rows(page)).toHaveCount(11);

  // Sort by name both ways
  await expect(rows(page).first()).toContainText("Acme Ltd");
  await page.getByRole("button", { name: "Name" }).click();
  await expect(rows(page).first()).toContainText("Pennine Energy");
  await expect(table(page).getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "descending");

  // Edit, then refresh
  await page.getByRole("button", { name: "Actions for Acme Ltd" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await dialog.getByLabel("Name").fill("Acme Trading");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(table(page).getByRole("cell", { name: "Acme Trading", exact: true })).toBeVisible();
  await page.reload();
  await expect(table(page).getByRole("cell", { name: "Acme Trading", exact: true })).toBeVisible();

  // Delete, then refresh
  await page.getByRole("button", { name: "Actions for Acme Trading" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(dialog).toContainText("Delete Acme Trading? This can't be undone.");
  await dialog.getByRole("button", { name: "Delete organization" }).click();
  await expect(dialog).toBeHidden();
  await expect(rows(page)).toHaveCount(10);
  await page.reload();
  await expect(table(page).getByText("Acme Trading")).toHaveCount(0);
});

test("pages through more than 25 organizations", async ({ page }) => {
  for (let i = 0; i < 16; i++) {
    await page.request.post("/api/organizations", { data: { name: `Extra ${String(i).padStart(2, "0")}` } });
  }
  await page.goto("/organizations");
  await expect(rows(page)).toHaveCount(25);
  await expect(page.getByText("1–25 of 26")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(rows(page)).toHaveCount(1);
  await expect(page.getByText("26–26 of 26")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(rows(page)).toHaveCount(25);
});

test("deleting the only row on the last page goes back a page", async ({ page }) => {
  for (let i = 0; i < 16; i++) {
    await page.request.post("/api/organizations", { data: { name: `Zed ${String(i).padStart(2, "0")}` } });
  }
  await page.goto("/organizations");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("26–26 of 26")).toBeVisible();

  await page.getByRole("button", { name: "Actions for Zed 15" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Delete organization" }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByText("1–25 of 25")).toBeVisible();
  await expect(rows(page)).toHaveCount(25);
  await expect(page.getByText("No organizations yet.")).toHaveCount(0);
});

test("an organization with contacts and deals can't be deleted", async ({ page }) => {
  await page.goto("/organizations");
  await page.getByRole("button", { name: "Actions for Northgate Logistics" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog");
  // The dialog explains straight away, without trying the delete
  await expect(dialog.getByRole("button", { name: "Delete organization" })).toHaveCount(0);
  await expect(dialog).toContainText("Northgate Logistics can't be deleted because it still has 3 contacts and 5 deals.");
  await dialog.getByRole("button", { name: "OK" }).click();
  await page.reload();
  await expect(table(page).getByRole("cell", { name: "Northgate Logistics", exact: true })).toBeVisible();
});

test("the record page lists contacts and deals, and adds them pre-filled", async ({ page }) => {
  await page.goto("/organizations");
  await page.getByRole("cell", { name: "Lumen Studio", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Lumen Studio" })).toBeVisible();
  const contacts = page.getByRole("region", { name: "Contacts" });
  await expect(contacts.getByRole("link")).toHaveCount(3);
  await expect(page.getByRole("region", { name: "Deals" }).getByRole("link")).toHaveCount(3);

  await contacts.getByRole("button", { name: "Add contact" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Organization")).toHaveValue(/\d+/);
  await expect(dialog.getByLabel("Organization").locator("option:checked")).toHaveText("Lumen Studio");
  await dialog.getByLabel("Name").fill("Noor Ali");
  await dialog.getByRole("button", { name: "Add contact" }).click();
  await expect(contacts.getByRole("link", { name: "Noor Ali" })).toBeVisible();

  await page.getByRole("region", { name: "Deals" }).getByRole("button", { name: "Add deal" }).click();
  await expect(dialog.getByLabel("Organization").locator("option:checked")).toHaveText("Lumen Studio");
  await expect(dialog.getByLabel("Main contact").locator("option")).toHaveCount(5);
});
