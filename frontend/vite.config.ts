/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiPort = process.env.ACCOUNTABLE_API_PORT ?? "8000";

export default defineConfig({
  plugins: [react()],
  // The e2e tests run their own dev server; a separate cache stops the two re-optimizing each other.
  cacheDir: process.env.ACCOUNTABLE_VITE_CACHE ?? "node_modules/.vite",
  server: {
    port: Number(process.env.ACCOUNTABLE_WEB_PORT ?? 5173),
    strictPort: true,
    proxy: {
      "/api": `http://127.0.0.1:${apiPort}`,
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test-setup.ts"],
  },
});
