import { describe, expect, test } from "vitest";
import { formatDate, formatDateTime, formatMoney, formatMoneyShort, formatRelative, poundsToPence } from "./format";

describe("formatMoney", () => {
  test("pounds with separators", () => {
    expect(formatMoney(1_250_000)).toBe("£12,500");
    expect(formatMoney(26_350_000)).toBe("£263,500");
  });
  test("zero", () => expect(formatMoney(0)).toBe("£0"));
  test("rounds to whole pounds", () => {
    expect(formatMoney(335_050)).toBe("£3,351");
    expect(formatMoney(49)).toBe("£0");
  });
});

describe("formatMoneyShort", () => {
  test("thousands", () => expect(formatMoneyShort(8_400_000)).toBe("£84K"));
  test("millions", () => expect(formatMoneyShort(120_000_000)).toBe("£1.2M"));
  test("whole millions drop the decimal", () => expect(formatMoneyShort(200_000_000)).toBe("£2M"));
  test("small and zero", () => {
    expect(formatMoneyShort(0)).toBe("£0");
    expect(formatMoneyShort(50_000)).toBe("£500");
  });
});

describe("formatDate", () => {
  test("UK format", () => expect(formatDate("2026-11-19")).toBe("19 Nov 2026"));
  test("single-digit days", () => expect(formatDate("2027-01-05")).toBe("5 Jan 2027"));
  test("date and time", () => expect(formatDateTime(new Date(2026, 10, 19, 14, 30))).toBe("19 Nov 2026, 14:30"));
});

describe("formatRelative", () => {
  const now = new Date(2026, 10, 19, 15, 0);
  test("just now", () => expect(formatRelative(new Date(2026, 10, 19, 14, 59, 40), now)).toBe("Just now"));
  test("minutes", () => expect(formatRelative(new Date(2026, 10, 19, 14, 55), now)).toBe("5 minutes ago"));
  test("one minute", () => expect(formatRelative(new Date(2026, 10, 19, 14, 59), now)).toBe("1 minute ago"));
  test("hours", () => expect(formatRelative(new Date(2026, 10, 19, 12, 0), now)).toBe("3 hours ago"));
  test("yesterday", () => expect(formatRelative(new Date(2026, 10, 18, 20, 0), now)).toBe("Yesterday"));
  test("days", () => expect(formatRelative(new Date(2026, 10, 15, 9, 0), now)).toBe("4 days ago"));
  test("older shows the date", () => expect(formatRelative(new Date(2026, 8, 1, 9, 0), now)).toBe("1 Sep 2026"));
});

test("poundsToPence", () => {
  expect(poundsToPence(12500)).toBe(1_250_000);
  expect(poundsToPence(0.1 + 0.2)).toBe(30);
});
