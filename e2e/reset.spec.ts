import { reseed } from "./fixtures";
import { expect, test } from "./fixtures";

test("npm run seed brings back the sample data", async ({ page }) => {
  // Change things: delete a deal, add an organization
  const deals = await page.request.get("/api/deals?search=website rebuild").then((r) => r.json());
  await page.request.delete(`/api/deals/${deals.items[0].id}`);
  await page.request.post("/api/organizations", { data: { name: "Temporary Ltd" } });
  await page.goto("/organizations");
  await expect(page.getByText("1–11 of 11")).toBeVisible();

  reseed(); // the same command as npm run seed, against the test database

  await page.reload();
  await expect(page.getByText("1–10 of 10")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Temporary Ltd", exact: true })).toHaveCount(0);
  await page.goto("/deals");
  await expect(page.getByText("1–25 of 40")).toBeVisible();
  await page.getByPlaceholder("Search by deal, organization or contact").fill("website rebuild");
  await expect(page.getByRole("table", { name: "Deals" }).locator("tbody tr")).toHaveCount(1);
});
