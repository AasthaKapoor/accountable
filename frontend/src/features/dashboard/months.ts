import { format, parseISO } from "date-fns";

/** "2026-11" as "Nov", "November" or "Nov 2026". */
export function monthName(month: string, style: "short" | "long" | "withYear" = "short"): string {
  const date = parseISO(`${month}-01`);
  return format(date, style === "short" ? "MMM" : style === "long" ? "MMMM" : "MMM yyyy");
}
