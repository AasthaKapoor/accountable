import { expect, test } from "vitest";
import { defaultProbability, isOpen, OPEN_STAGES, probabilityIsFixed, STAGE_KEYS, stageInfo, STATUSES } from "./stages";

test("order", () => {
  expect(STAGE_KEYS).toEqual(["new", "qualified", "proposal", "negotiation", "won", "lost"]);
  expect(OPEN_STAGES).toEqual(["new", "qualified", "proposal", "negotiation"]);
});

test("default probabilities", () => {
  expect(STAGE_KEYS.map(defaultProbability)).toEqual([10, 25, 50, 75, 100, 0]);
});

test("Won and Lost are closed and fixed", () => {
  expect(isOpen("won")).toBe(false);
  expect(isOpen("lost")).toBe(false);
  expect(probabilityIsFixed("won")).toBe(true);
  expect(probabilityIsFixed("negotiation")).toBe(false);
});

test("colours follow the spec", () => {
  expect(STAGE_KEYS.map((s) => stageInfo(s).colour)).toEqual([
    "#118AB2", // Cerulean
    "#FFC145", // Marigold
    "#F78C6B", // Coral
    "rgba(7, 59, 76, 0.6)", // Midnight at 60%
    "#06D6A0", // Sea Green
    "#EF476F", // Raspberry
  ]);
  expect(stageInfo("negotiation").colourOnDark).toBe("#CDD8DB");
  expect(STATUSES.map((s) => s.colour)).toEqual(["#118AB2", "#FFC145", "#06D6A0"]);
});
