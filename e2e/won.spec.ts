import { expect, test } from "./fixtures";
import { dashboardData, isoDate, money, ukDate } from "./helpers";

test("moving a deal to Won closes it today, makes the contact a customer and updates the dashboard", async ({ page }) => {
  const before = await dashboardData(page);
  await page.goto("/deals");
  await page.getByPlaceholder("Search by deal, organization or contact").fill("data migration");
  await page.getByRole("cell", { name: "Data migration", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Data migration" })).toBeVisible();

  // Sophie Turner starts as qualified
  const contactLink = page.getByRole("link", { name: "Sophie Turner" });
  await page.getByRole("button", { name: /Change stage/ }).click();
  await page.getByRole("menuitemradio", { name: /Won/ }).click();

  const details = page.getByRole("region", { name: "Details" });
  await expect(details.getByRole("button", { name: /Stage: Won/ })).toBeVisible();
  await expect(details).toContainText(ukDate(isoDate(0)));
  await expect(details).toContainText("100%");

  await contactLink.click();
  await expect(page.getByRole("region", { name: "Details" }).locator(".pill")).toHaveText("Customer");

  // £24,500 won this month; one fewer open deal; Qualified loses £24,500 × 25%
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByTestId("won-this-month")).toHaveText(money(before.won_this_month_pence + 24_500_00));
  await expect(page.getByTestId("open-count")).toHaveText(String(before.totals.count - 1));
  await expect(page.getByTestId("expected")).toHaveText(money(before.totals.expected_pence - 6_125_00));
  await expect(page.getByTestId("win-counts")).toHaveText(`${before.win_rate.won + 1} won, ${before.win_rate.lost} lost`);
  await expect(page.getByTestId("activity-row").first()).toContainText("Moved from Qualified to Won");
});

test("moving a deal to Lost in the edit form closes it today", async ({ page }) => {
  await page.goto("/deals");
  await page.getByPlaceholder("Search by deal, organization or contact").fill("store pos");
  await page.getByRole("button", { name: "Actions for Store POS upgrade" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Stage").selectOption("lost");
  await expect(dialog.getByLabel("Probability (%)")).toHaveValue("0");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  const row = page.getByRole("table", { name: "Deals" }).locator("tbody tr").first();
  await expect(row).toContainText("Lost");
  await expect(row).toContainText(ukDate(isoDate(0)));
});
