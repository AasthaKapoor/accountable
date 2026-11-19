import type { Page } from "@playwright/test";

/** £12,500 from pence, as the app shows it. */
export const money = (pence: number) => `£${Math.round(pence / 100).toLocaleString("en-GB")}`;

/** A date relative to today in local time, as YYYY-MM-DD. */
export function isoDate(daysFromToday = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 19 Nov 2026, from YYYY-MM-DD. */
export function ukDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

export const dashboardData = (page: Page) => page.request.get("/api/dashboard").then((r) => r.json());
