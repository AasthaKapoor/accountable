import { expect, test } from "./fixtures";
import type { Locator, Page } from "@playwright/test";

const column = (page: Page, name: string) => page.getByRole("region", { name: `${name} column` });
const cards = (page: Page, name: string) => column(page, name).getByTestId("deal-card");
const cardNames = (page: Page, name: string) => cards(page, name).locator(".card-name").allTextContents();
const card = (page: Page, name: string) => page.getByTestId("deal-card").filter({ has: page.locator(".card-name", { hasText: name }) });

/** Drag with small mouse steps, as dnd-kit needs, and drop on the top half of `target` or just below it. */
async function drag(page: Page, source: Locator, target: Locator, half: "top" | "below") {
  const from = (await source.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 8, from.y + from.height / 2 + 8, { steps: 4 });
  const y = half === "top" ? to.y + to.height * 0.2 : to.y + to.height + 24;
  await page.mouse.move(to.x + to.width / 2, y, { steps: 25 });
  await page.mouse.move(to.x + to.width / 2, y + 2, { steps: 3 });
  await page.mouse.up();
}

/** Hold move requests until `release()` is called, to see the board before the server answers. */
async function holdMoves(page: Page) {
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/deals/*/move", async (route) => {
    await held;
    await route.continue();
  });
  return release;
}

test("drag a card to another column, then within a column", async ({ page }) => {
  await page.goto("/pipeline");
  await expect(page.getByTestId("board-value")).toHaveText("£263,500");
  await expect(page.getByTestId("board-expected")).toHaveText("£126,050");
  expect(await cardNames(page, "Qualified")).toEqual(["Fleet tracking rollout", "Data migration", "Staff training"]);

  // Support contract (New, £9,500) onto the top half of Data migration in Qualified
  const release = await holdMoves(page);
  await drag(page, card(page, "Support contract"), card(page, "Data migration"), "top");

  // Totals change before the server answers: £9,500 × (25% − 10%) = £1,425 more expected
  await expect(page.getByTestId("board-expected")).toHaveText("£127,475");
  await expect(page.getByTestId("board-value")).toHaveText("£263,500");
  await expect(column(page, "New").getByTestId("column-value")).toHaveText("£24,000");
  await expect(column(page, "Qualified").getByTestId("column-value")).toHaveText("£83,200");
  await expect(column(page, "Qualified").getByTestId("column-count")).toHaveText("4");
  expect(await cardNames(page, "Qualified")).toEqual(["Fleet tracking rollout", "Support contract", "Data migration", "Staff training"]);
  release();

  await page.reload();
  expect(await cardNames(page, "Qualified")).toEqual(["Fleet tracking rollout", "Support contract", "Data migration", "Staff training"]);
  await expect(card(page, "Support contract")).toContainText("25%");

  // Within a column: Analytics pilot to the top of New
  expect(await cardNames(page, "New")).toEqual(["Website rebuild", "Analytics pilot"]);
  await drag(page, card(page, "Analytics pilot"), card(page, "Website rebuild"), "top");
  await expect.poll(() => cardNames(page, "New")).toEqual(["Analytics pilot", "Website rebuild"]);
  await page.waitForLoadState("networkidle");
  await page.reload();
  expect(await cardNames(page, "New")).toEqual(["Analytics pilot", "Website rebuild"]);

  // The deals list shows the new stage and probability
  await page.goto("/deals");
  await page.getByPlaceholder("Search by deal, organization or contact").fill("support contract");
  const row = page.getByRole("table", { name: "Deals" }).locator("tbody tr").first();
  await expect(row).toContainText("Qualified");
  await expect(row).toContainText("25%");
});

test("drop at the bottom of a column", async ({ page }) => {
  await page.goto("/pipeline");
  await drag(page, card(page, "Website rebuild"), card(page, "Annual licence renewal"), "below");
  await expect.poll(() => cardNames(page, "Proposal")).toEqual(["Clinic booking system", "Annual licence renewal", "Website rebuild"]);
  await page.waitForLoadState("networkidle");
  await page.reload();
  expect(await cardNames(page, "Proposal")).toEqual(["Clinic booking system", "Annual licence renewal", "Website rebuild"]);
  await expect(card(page, "Website rebuild")).toContainText("50%");
});

test("a rejected move puts the card back and says why", async ({ page }) => {
  await page.goto("/pipeline");
  await page.route("**/api/deals/*/move", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: "Deal not found" }) }),
  );
  // The browser logs the failed request; that's expected here.
  page.removeAllListeners("console");
  await drag(page, card(page, "Support contract"), card(page, "Data migration"), "top");
  await expect(page.locator(".toast-title", { hasText: "Couldn't move the deal. Deal not found" })).toBeVisible();
  expect(await cardNames(page, "New")).toEqual(["Website rebuild", "Support contract", "Analytics pilot"]);
  await expect(page.getByTestId("board-expected")).toHaveText("£126,050");
});

test("+ Add deal creates a deal at that stage, at the bottom", async ({ page }) => {
  await page.goto("/pipeline");
  await column(page, "Negotiation").getByRole("button", { name: "Add deal to Negotiation" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Stage")).toHaveValue("negotiation");
  await expect(dialog.getByLabel("Probability (%)")).toHaveValue("75");
  await dialog.getByLabel("Name").fill("Board portal");
  await dialog.getByLabel("Organization").selectOption({ label: "Harbour Finance" });
  await dialog.getByLabel("Main contact").selectOption({ label: "Ade Johnson" });
  await dialog.getByLabel("Value (£)").fill("10000");
  await dialog.getByLabel("Close date").fill("2030-01-15");
  await dialog.getByRole("button", { name: "Add deal" }).click();
  await expect(dialog).toBeHidden();
  await expect(cards(page, "Negotiation").last()).toContainText("Board portal");
  await expect(page.getByTestId("board-value")).toHaveText("£273,500");
  await expect(page.getByTestId("board-expected")).toHaveText("£133,550");
});

test("late cards stand out", async ({ page }) => {
  await page.goto("/pipeline");
  const late = page.getByTestId("deal-card").filter({ has: page.locator(".tag-late") });
  await expect(late).toHaveCount(4);
  await expect(late.first().locator(".card-date")).toHaveText(/^Due /);
  await expect(late.first().locator(".card-date")).toHaveCSS("color", "rgb(239, 71, 111)");
});

test("the page never scrolls sideways; the board does", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/pipeline");
  await expect(page.getByTestId("deal-card").first()).toBeVisible();
  const pageScroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(pageScroll).toBe(0);
});

test("clicking a card opens the deal", async ({ page }) => {
  await page.goto("/pipeline");
  await card(page, "ERP integration").click();
  await expect(page.getByRole("heading", { level: 1, name: "ERP integration" })).toBeVisible();
});
