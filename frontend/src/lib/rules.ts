// Business rules mirrored from backend/accountable/rules.py, tested with the same cases.
import { format } from "date-fns";
import { isOpen, type Stage } from "./stages";

/** Below this gap between neighbours, the server renumbers the column. */
export const MIN_POSITION_GAP = 1e-6;

/** Today's date in local time, as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  return format(now, "yyyy-MM-dd");
}

/** ISO dates compare correctly as strings. */
export function isLate(stage: Stage, closeDate: string, today: string): boolean {
  return isOpen(stage) && closeDate < today;
}

export type FollowUpStatus = "overdue" | "upcoming" | null;

export function followUpStatus(date: string | null, done: boolean, today: string): FollowUpStatus {
  if (!date || done) return null;
  return date < today ? "overdue" : "upcoming";
}

export interface Totals {
  value_pence: number;
  expected_pence: number;
  count: number;
}

/** Round value × probability (hundredths of a penny) to whole pence, halves up. */
export function roundPence(hundredths: number): number {
  return Math.floor((hundredths + 50) / 100);
}

/** Total value and expected revenue across open deals only, rounded once at the end. */
export function totals(deals: { stage: Stage; value_pence: number; probability: number }[]): Totals {
  let value = 0;
  let weighted = 0;
  let count = 0;
  for (const deal of deals) {
    if (!isOpen(deal.stage)) continue;
    value += deal.value_pence;
    weighted += deal.value_pence * deal.probability;
    count += 1;
  }
  return { value_pence: value, expected_pence: roundPence(weighted), count };
}

/** Position for a card dropped between `before` (the card above) and `after` (the card below). */
export function positionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return 1;
  if (before === null) return after! - 1;
  if (after === null) return before + 1;
  return (before + after) / 2;
}

export function gapTooSmall(before: number | null, after: number | null): boolean {
  return before !== null && after !== null && after - before < MIN_POSITION_GAP;
}
