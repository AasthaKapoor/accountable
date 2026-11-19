import { differenceInCalendarDays, differenceInMinutes, format, parseISO } from "date-fns";

const pounds = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

/** £12,500 — for tables, cards and headline figures. Rounded to whole pounds. */
export function formatMoney(pence: number): string {
  const value = Math.round(pence / 100);
  return `${value < 0 ? "-" : ""}£${pounds.format(Math.abs(value))}`;
}

/** £84K or £1.2M — for chart axes and tight labels. */
export function formatMoneyShort(pence: number): string {
  const value = pence / 100;
  if (Math.abs(value) >= 1e6) return `£${(value / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(value) >= 1e3) return `£${Math.round(value / 1e3)}K`;
  return `£${Math.round(value)}`;
}

/** 19 Nov 2026, from an ISO date or date-time. */
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "d MMM yyyy");
}

/** 19 Nov 2026, 14:30 */
export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "d MMM yyyy, HH:mm");
}

/** "Just now", "5 minutes ago", "3 hours ago", "Yesterday", "4 days ago", then the date. */
export function formatRelative(value: string | Date, now: Date = new Date()): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  const minutes = differenceInMinutes(now, date);
  if (minutes < 0) return formatDate(date);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const days = differenceInCalendarDays(now, date);
  if (minutes < 24 * 60 && days === 0) {
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (days <= 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return formatDate(date);
}

export function formatPercent(value: number): string {
  return `${value}%`;
}

export function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Pounds typed into a form, as whole pence. */
export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100);
}
