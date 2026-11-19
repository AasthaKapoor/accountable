// The same cases as backend/tests/test_rules.py.
import { describe, expect, test } from "vitest";
import { followUpStatus, gapTooSmall, isLate, positionBetween, totals, todayISO } from "./rules";

const TODAY = "2026-11-19";

describe("isLate", () => {
  test("open deal past its close date is late", () => expect(isLate("proposal", "2026-11-18", TODAY)).toBe(true));
  test("due today is not late", () => expect(isLate("proposal", TODAY, TODAY)).toBe(false));
  test("future is not late", () => expect(isLate("new", "2026-12-01", TODAY)).toBe(false));
  test.each(["won", "lost"] as const)("%s is never late", (stage) => expect(isLate(stage, "2026-01-01", TODAY)).toBe(false));
});

describe("followUpStatus", () => {
  test("before today is overdue", () => expect(followUpStatus("2026-11-18", false, TODAY)).toBe("overdue"));
  test("today is upcoming", () => expect(followUpStatus(TODAY, false, TODAY)).toBe("upcoming"));
  test("later is upcoming", () => expect(followUpStatus("2026-11-30", false, TODAY)).toBe("upcoming"));
  test("done is neither", () => {
    expect(followUpStatus("2026-11-01", true, TODAY)).toBeNull();
    expect(followUpStatus("2026-12-01", true, TODAY)).toBeNull();
  });
  test("no date is neither", () => expect(followUpStatus(null, false, TODAY)).toBeNull());
});

describe("totals", () => {
  test("counts open deals only", () => {
    const deals = [
      { stage: "new" as const, value_pence: 100_000, probability: 10 },
      { stage: "negotiation" as const, value_pence: 200_000, probability: 75 },
      { stage: "won" as const, value_pence: 500_000, probability: 100 },
      { stage: "lost" as const, value_pence: 700_000, probability: 0 },
    ];
    expect(totals(deals)).toEqual({ value_pence: 300_000, expected_pence: 160_000, count: 2 });
  });
  test("expected rounds once at the end", () => {
    const deals = [
      { stage: "new" as const, value_pence: 5, probability: 10 },
      { stage: "new" as const, value_pence: 33, probability: 1 },
    ];
    expect(totals(deals).expected_pence).toBe(1);
    expect(totals(deals.slice(0, 1)).expected_pence).toBe(1);
    expect(totals([{ stage: "new", value_pence: 4, probability: 10 }]).expected_pence).toBe(0);
  });
  test("empty", () => expect(totals([])).toEqual({ value_pence: 0, expected_pence: 0, count: 0 }));
});

describe("positionBetween", () => {
  test("between neighbours", () => expect(positionBetween(1, 2)).toBe(1.5));
  test("at the top", () => expect(positionBetween(null, 3)).toBe(2));
  test("at the bottom", () => expect(positionBetween(4, null)).toBe(5));
  test("empty column", () => expect(positionBetween(null, null)).toBe(1));
  test("gap too small", () => {
    expect(gapTooSmall(1, 1 + 1e-7)).toBe(true);
    expect(gapTooSmall(1, 1.5)).toBe(false);
    expect(gapTooSmall(null, 1)).toBe(false);
  });
});

test("todayISO uses local time", () => {
  expect(todayISO(new Date(2026, 10, 19, 23, 59))).toBe("2026-11-19");
  expect(todayISO(new Date(2026, 10, 20, 0, 1))).toBe("2026-11-20");
});
