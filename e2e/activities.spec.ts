import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";
import { isoDate, ukDate } from "./helpers";

const entries = (page: Page) => page.getByRole("list", { name: "Timeline entries" }).getByRole("listitem");

async function openDeal(page: Page, name: string) {
  await page.goto("/deals");
  await page.getByPlaceholder("Search by deal, organization or contact").fill(name);
  await page.getByRole("cell", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}


test("log an activity with a follow-up on a deal, then mark it done", async ({ page }) => {
  await openDeal(page, "Website rebuild");
  const form = page.getByRole("form", { name: "Log activity" });
  await form.getByLabel("Type").selectOption("call");
  await form.getByLabel("Description").fill("Walked through the sitemap");
  await form.getByLabel("Follow-up date").fill(isoDate(3));
  await form.getByRole("button", { name: "Log activity" }).click();

  // Newest first on the deal
  await expect(entries(page).first()).toContainText("Walked through the sitemap");
  await expect(entries(page).first()).toContainText("Follow up");
  await expect(form.getByLabel("Description")).toHaveValue("");

  // A stage change adds its own entry at the top
  await page.getByRole("button", { name: /Change stage/ }).click();
  await page.getByRole("menuitemradio", { name: /Qualified/ }).click();
  await expect(entries(page).first()).toContainText("Moved from New to Qualified");
  await expect(entries(page).nth(1)).toContainText("Walked through the sitemap");

  // Both show on the main contact's timeline, newest first
  await page.getByRole("link", { name: "Hannah Lowe" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hannah Lowe" })).toBeVisible();
  await expect(entries(page).first()).toContainText("Moved from New to Qualified");
  await expect(entries(page).nth(1)).toContainText("Walked through the sitemap");

  // It shows on the dashboard as upcoming, and in recent activity
  await page.getByRole("link", { name: "Dashboard" }).click();
  const followUps = page.getByRole("region", { name: "Follow-ups" });
  await followUps.getByRole("tab", { name: /Upcoming/ }).click();
  const row = followUps.getByTestId("follow-up").filter({ hasText: "Walked through the sitemap" });
  await expect(row).toContainText(ukDate(isoDate(3)));
  await expect(row.getByRole("link", { name: "Website rebuild" })).toBeVisible();
  await expect(followUps.getByRole("tab", { name: /Upcoming/ })).toContainText("9");
  await expect(page.getByTestId("activity-row").nth(1)).toContainText("Walked through the sitemap");

  // Marking it done removes it from the dashboard
  await row.getByRole("checkbox").check();
  await expect(row).toHaveCount(0);
  await expect(followUps.getByRole("tab", { name: /Upcoming/ })).toContainText("8");

  // and the timeline shows it as done
  await page.goBack();
  await expect(entries(page).nth(1).locator(".chip.done")).toBeVisible();
  await expect(entries(page).nth(1).getByRole("checkbox")).toBeChecked();
});

test("an overdue follow-up shows in Raspberry and can be ticked off from the dashboard", async ({ page }) => {
  await page.goto("/");
  const followUps = page.getByRole("region", { name: "Follow-ups" });
  const rows = followUps.getByTestId("follow-up");
  await expect(rows).toHaveCount(5);
  await expect(rows.first().locator(".d")).toHaveCSS("color", "rgb(239, 71, 111)");
  await rows.first().getByRole("checkbox").check();
  await expect(rows).toHaveCount(4);
  await page.reload();
  await expect(rows).toHaveCount(4);
});

test("edit and delete activities; stage changes can only be deleted", async ({ page }) => {
  await openDeal(page, "ERP integration");
  const first = entries(page).first();
  await expect(first).toContainText("Talked through the integration timeline");
  await first.getByRole("button", { name: /Actions for/ }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Description").fill("Talked through the revised timeline");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(first).toContainText("Talked through the revised timeline");

  const stageEntry = entries(page).filter({ hasText: "Moved from Proposal to Negotiation" });
  await stageEntry.getByRole("button", { name: /Actions for/ }).click();
  await expect(page.getByRole("menuitem", { name: "Edit" })).toHaveCount(0);
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await dialog.getByRole("button", { name: "Delete activity" }).click();
  await expect(stageEntry).toHaveCount(0);
  await page.reload();
  await expect(entries(page).filter({ hasText: "Moved from Proposal to Negotiation" })).toHaveCount(0);
});
