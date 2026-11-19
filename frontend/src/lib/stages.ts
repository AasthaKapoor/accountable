export type Stage = "new" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export type OpenStage = Exclude<Stage, "won" | "lost">;

export interface StageInfo {
  key: Stage;
  name: string;
  probability: number;
  open: boolean;
  /** Colour for marks on light backgrounds. */
  colour: string;
  /** Colour for marks on the Midnight panels (Midnight itself doesn't show there). */
  colourOnDark: string;
  /** Column tint on the pipeline board. */
  tint: string;
}

export const STAGES: StageInfo[] = [
  { key: "new", name: "New", probability: 10, open: true, colour: "#118AB2", colourOnDark: "#118AB2", tint: "rgba(17, 138, 178, 0.08)" },
  { key: "qualified", name: "Qualified", probability: 25, open: true, colour: "#FFC145", colourOnDark: "#FFC145", tint: "rgba(255, 193, 69, 0.12)" },
  { key: "proposal", name: "Proposal", probability: 50, open: true, colour: "#F78C6B", colourOnDark: "#F78C6B", tint: "rgba(247, 140, 107, 0.1)" },
  { key: "negotiation", name: "Negotiation", probability: 75, open: true, colour: "rgba(7, 59, 76, 0.6)", colourOnDark: "#CDD8DB", tint: "rgba(7, 59, 76, 0.06)" },
  { key: "won", name: "Won", probability: 100, open: false, colour: "#06D6A0", colourOnDark: "#06D6A0", tint: "rgba(6, 214, 160, 0.09)" },
  { key: "lost", name: "Lost", probability: 0, open: false, colour: "#EF476F", colourOnDark: "#EF476F", tint: "rgba(239, 71, 111, 0.07)" },
];

export const STAGE_KEYS = STAGES.map((s) => s.key);
export const OPEN_STAGES = STAGES.filter((s) => s.open).map((s) => s.key as OpenStage);

const byKey = Object.fromEntries(STAGES.map((s) => [s.key, s])) as Record<Stage, StageInfo>;

export function stageInfo(stage: Stage): StageInfo {
  return byKey[stage];
}

export function isOpen(stage: Stage): boolean {
  return byKey[stage].open;
}

export function defaultProbability(stage: Stage): number {
  return byKey[stage].probability;
}

/** Won and Lost probabilities can't be edited. */
export function probabilityIsFixed(stage: Stage): boolean {
  return !byKey[stage].open;
}

export type ContactStatus = "lead" | "qualified" | "customer";

export const STATUSES: { key: ContactStatus; name: string; colour: string }[] = [
  { key: "lead", name: "Lead", colour: "#118AB2" },
  { key: "qualified", name: "Qualified", colour: "#FFC145" },
  { key: "customer", name: "Customer", colour: "#06D6A0" },
];
