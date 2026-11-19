import { defineConfig } from "@playwright/test";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
export const API_PORT = 8100;
export const WEB_PORT = 5180;
export const TEST_DB = path.join(root, "backend", "data", "e2e.db");

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    channel: "chrome",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: `uv run uvicorn accountable.main:app --port ${API_PORT}`,
      cwd: root,
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      env: { ACCOUNTABLE_DB: TEST_DB },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "npm run dev -w frontend",
      cwd: root,
      url: `http://localhost:${WEB_PORT}`,
      env: {
        ACCOUNTABLE_API_PORT: String(API_PORT),
        ACCOUNTABLE_WEB_PORT: String(WEB_PORT),
        ACCOUNTABLE_VITE_CACHE: "node_modules/.vite-e2e",
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
