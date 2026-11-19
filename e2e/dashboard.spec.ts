import { expect, test } from "./fixtures";
import { dashboardData, money, ukDate } from "./helpers";

test("opening the app lands on the dashboard, with every panel showing the data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveClass(/active/);
  const data = await dashboardData(page);

  // Headline figures
  await expect(page.getByTestId("open-value")).toHaveText(money(data.totals.value_pence));
  await expect(page.getByTestId("expected")).toHaveText(money(data.totals.expected_pence));
  await expect(page.getByTestId("won-this-month")).toHaveText(money(data.won_this_month_pence));
  await expect(page.getByTestId("win-rate")).toHaveText(`${data.win_rate.percent}%`);
  await expect(page.getByTestId("win-counts")).toHaveText(`${data.win_rate.won} won, ${data.win_rate.lost} lost`);
  await expect(page.getByTestId("open-count")).toHaveText(String(data.totals.count));
  await expect(page.getByTestId("late-count")).toHaveText(`${data.late_count} running late`);
  expect(data.totals.count).toBe(11);

  // Charts and the pipeline visual
  await expect(page.getByRole("img", { name: /Revenue won by month/ }).locator(".recharts-area-curve")).toBeVisible();
  await expect(page.getByRole("img", { name: /Deals won and lost/ }).locator(".recharts-bar-rectangle").first()).toBeVisible();
  for (const stage of data.stages) {
    await expect(page.getByTestId("stage-bar")).toContainText(money(stage.value_pence));
  }
  const funnel = page.getByTestId("funnel");
  await expect(funnel.locator(".fcol")).toHaveCount(5);

  // Follow-ups: overdue first, then upcoming
  const followUps = page.getByRole("region", { name: "Follow-ups" });
  await expect(followUps.getByRole("tab", { name: /Overdue/ })).toHaveAttribute("aria-selected", "true");
  await expect(followUps.getByTestId("follow-up")).toHaveCount(data.follow_ups.overdue.length);
  await expect(followUps.getByTestId("follow-up").first()).toContainText(ukDate(data.follow_ups.overdue[0].follow_up_date));
  await followUps.getByRole("tab", { name: /Upcoming/ }).click();
  await expect(followUps.getByTestId("follow-up")).toHaveCount(data.follow_ups.upcoming.length);

  // Recent activity: latest 15, newest first
  const rows = page.getByTestId("activity-row");
  await expect(rows).toHaveCount(15);
  for (let i = 0; i < 3; i++) await expect(rows.nth(i)).toContainText(data.recent_activity[i].description);
  await expect(rows.first().locator(".pill")).toHaveText("Negotiation");
});

test("a deleted deal's stage changes stay in recent activity", async ({ page }) => {
  await page.goto("/");
  const first = page.getByTestId("activity-row").first();
  await expect(first).toContainText("Moved from Proposal to Negotiation");
  await expect(first.getByRole("link", { name: "Store POS upgrade" })).toBeVisible();

  const deals = await page.request.get("/api/deals?search=store pos").then((r) => r.json());
  await page.request.delete(`/api/deals/${deals.items[0].id}`);
  await page.reload();
  // Still there, now linked to the deal's contact instead of the deleted deal
  await expect(first).toContainText("Moved from Proposal to Negotiation");
  await expect(first.getByRole("link", { name: "Store POS upgrade" })).toHaveCount(0);
  await expect(first.getByRole("link", { name: "Leah Morgan" })).toBeVisible();
});

test("the dashboard's New deal opens the deal form", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New deal" }).click();
  await expect(page.getByRole("dialog", { name: "New deal" })).toBeVisible();
});

test("View pipeline goes to the board", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "View pipeline" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Pipeline" })).toBeVisible();
});
