import { expect, test } from "./fixtures";
import type { APIRequestContext } from "@playwright/test";

/** Delete every record through the API, in the order the delete rules allow. */
async function emptyEverything(request: APIRequestContext) {
  const all = async (path: string) => (await request.get(`${path}?page_size=100`).then((r) => r.json())).items;
  for (const d of await all("/api/deals")) await request.delete(`/api/deals/${d.id}`);
  for (const c of await all("/api/contacts")) await request.delete(`/api/contacts/${c.id}`);
  for (const o of await all("/api/organizations")) await request.delete(`/api/organizations/${o.id}`);
  const recent = async () => (await request.get("/api/dashboard").then((r) => r.json())).recent_activity;
  for (let batch = await recent(); batch.length; batch = await recent()) {
    for (const a of batch) await request.delete(`/api/activities/${a.id}`);
  }
}

test("every screen has an empty state", async ({ page }) => {
  await emptyEverything(page.request);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your pipeline at a glance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your pipeline at a glance" })).toHaveCSS("font-family", /Instrument Serif/);
  await expect(page.getByText("Nothing due in the next 14 days.")).toBeVisible();
  await expect(page.getByText("Nothing logged yet.")).toBeVisible();

  for (const [path, message, action] of [
    ["/organizations", "No organizations yet.", "New organization"],
    ["/contacts", "No contacts yet.", "New contact"],
    ["/deals", "No deals yet.", "New deal"],
  ]) {
    await page.goto(path);
    await expect(page.getByText(message)).toBeVisible();
    await expect(page.getByRole("button", { name: action })).toHaveCount(2); // title row and empty state
  }

  await page.goto("/pipeline");
  await expect(page.getByText("No deals yet. Add one to any column.")).toBeVisible();
  await expect(page.getByTestId("board-value")).toHaveText("£0");
});

test("a record that doesn't exist says so", async ({ page }) => {
  // The browser logs the 404 response; that's the point of this test.
  page.removeAllListeners("console");
  await page.goto("/deals/99999");
  await expect(page.getByRole("heading", { level: 1, name: "Deal not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to the list" })).toBeVisible();
});

test("a server error shows a toast and a way to try again", async ({ page }) => {
  page.removeAllListeners("console");
  await page.route("**/api/dashboard", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "The server had a problem" }) }),
  );
  await page.goto("/");
  await expect(page.locator(".toast-title", { hasText: "The server had a problem" })).toBeVisible();
  await expect(page.getByText("Couldn't load the dashboard.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("lists show skeleton rows while loading", async ({ page }) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/organizations?*", async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("/organizations");
  await expect(page.locator(".skeleton").first()).toBeVisible();
  release();
  await expect(page.getByRole("table", { name: "Organizations" }).locator("tbody tr")).toHaveCount(10);
});
