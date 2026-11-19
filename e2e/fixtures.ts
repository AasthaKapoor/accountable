import { test as base, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { TEST_DB } from "./playwright.config";

const root = path.resolve(import.meta.dirname, "..");

/** Resets the test database to the sample data, the same way `npm run seed` does. */
export function reseed() {
  execFileSync("node", ["scripts/seed.mjs"], {
    cwd: root,
    env: { ...process.env, ACCOUNTABLE_DB: TEST_DB },
    stdio: "pipe",
  });
}

// Every test fails if the browser logs a console error or the page tries to
// reach anything other than the local app.
export const test = base.extend<{ guard: void }>({
  guard: [
    async ({ page }, use) => {
      reseed();
      const problems: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") problems.push(`console error: ${msg.text()}`);
      });
      page.on("pageerror", (err) => problems.push(`page error: ${err.message}`));
      await page.route(/^(?!https?:\/\/(localhost|127\.0\.0\.1)[:/]).*/, (route) => {
        const url = route.request().url();
        if (url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
        problems.push(`outside request: ${url}`);
        return route.abort();
      });
      await use();
      expect(problems, problems.join("\n")).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
