import type { CSSProperties } from "react";
import { STATUSES, stageInfo, type ContactStatus, type Stage } from "../lib/stages";

function tint(colour: string, alpha: number): string {
  if (colour.startsWith("rgba")) return `rgba(7, 59, 76, ${alpha * 0.75})`;
  const n = parseInt(colour.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function Pill({ colour, label, small }: { colour: string; label: string; small?: boolean }) {
  const style = { "--dot": colour, background: tint(colour, 0.16) } as CSSProperties;
  return (
    <span className={`pill${small ? " pill-small" : ""}`} style={style}>
      {label}
    </span>
  );
}

export function StagePill({ stage, small }: { stage: Stage; small?: boolean }) {
  const info = stageInfo(stage);
  return <Pill colour={info.colour} label={info.name} small={small} />;
}

export function StatusPill({ status }: { status: ContactStatus }) {
  const info = STATUSES.find((s) => s.key === status)!;
  return <Pill colour={info.colour} label={info.name} />;
}

export function LateTag() {
  return <span className="tag-late">Late</span>;
}
