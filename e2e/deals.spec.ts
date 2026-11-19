import { expect, test } from "./fixtures";

const table = (page) => page.getByRole("table", { name: "Deals" });
const rows = (page) => table(page).locator("tbody tr");

test("add, search, sort, edit and delete a deal", async ({ page }) => {
  await page.goto("/deals");
  await expect(page.getByText("1–25 of 40")).toBeVisible();

  await page.getByRole("button", { name: "New deal" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Office move");
  await dialog.getByLabel("Organization").selectOption({ label: "Lumen Studio" });
  await dialog.getByLabel("Main contact").selectOption({ label: "Mei Chen" });
  await dialog.getByLabel("Stage").selectOption("proposal");
  await expect(dialog.getByLabel("Probability (%)")).toHaveValue("50");
  await dialog.getByLabel("Value (£)").fill("-5");
  await expect(dialog.getByText("Can't be negative")).toBeVisible();
  await dialog.getByLabel("Value (£)").fill("12500");
  await dialog.getByLabel("Close date").fill("2030-03-01");
  await dialog.getByRole("button", { name: "Add deal" }).click();
  await expect(dialog).toBeHidden();

  // Newest close date first, so the new deal leads the list
  await expect(rows(page).first()).toContainText("Office move");
  await expect(rows(page).first()).toContainText("£12,500");
  await expect(rows(page).first()).toContainText("50%");
  await expect(rows(page).first()).toContainText("1 Mar 2030");

  await page.getByPlaceholder("Search by deal, organization or contact").fill("mei");
  await expect(rows(page)).toHaveCount(1);
  await page.getByPlaceholder("Search by deal, organization or contact").fill("");

  await page.getByRole("button", { name: "Value" }).click();
  await expect(rows(page).first()).toContainText("£5,500");
  await page.getByRole("button", { name: "Value" }).click();
  await expect(rows(page).first()).toContainText("£64,000");

  // Edit the probability by hand
  await page.getByPlaceholder("Search by deal, organization or contact").fill("office");
  await page.getByRole("button", { name: "Actions for Office move" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await dialog.getByLabel("Probability (%)").fill("60");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await page.getByPlaceholder("Search by deal, organization or contact").fill("office");
  await expect(rows(page).first()).toContainText("60%");

  await page.getByRole("button", { name: "Actions for Office move" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await dialog.getByRole("button", { name: "Delete deal" }).click();
  await expect(page.getByText("No deals match your search.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("1–25 of 40")).toBeVisible();
});

test("late deals show the tag", async ({ page }) => {
  await page.goto("/deals");
  await page.getByRole("button", { name: "Close date" }).click(); // oldest first
  await page.getByPlaceholder("Search by deal, organization or contact").fill("staff training");
  const row = rows(page).first();
  await expect(row.getByText("Late")).toBeVisible();
  await expect(row.locator(".late-text")).toHaveCSS("color", "rgb(239, 71, 111)");
  const tags = await page.request.get("/api/deals?page_size=100").then((r) => r.json());
  const late = tags.items.filter((d) => d.is_late).length;
  await page.getByPlaceholder("Search by deal, organization or contact").fill("");
  await page.getByRole("button", { name: "Close date" }).click();
  await expect(table(page).locator(".tag-late")).toHaveCount(late);
});

test("the contact picker lists only the organization's contacts", async ({ page }) => {
  await page.goto("/deals");
  await page.getByRole("button", { name: "New deal" }).click();
  const dialog = page.getByRole("dialog");
  const contact = dialog.getByLabel("Main contact");
  await expect(contact).toBeDisabled();
  await dialog.getByLabel("Organization").selectOption({ label: "Halden Health" });
  await expect(contact.locator("option")).toHaveText(["Choose a contact", "Aisha Rahman", "Grace Walsh", "Owen Price"]);
  await contact.selectOption({ label: "Owen Price" });
  // Changing the organization clears the contact
  await dialog.getByLabel("Organization").selectOption({ label: "Lumen Studio" });
  await expect(contact).toHaveValue("");
  await expect(contact.locator("option")).toHaveText(["Choose a contact", "Isla Grant", "Jack Wilson", "Mei Chen"]);
});
