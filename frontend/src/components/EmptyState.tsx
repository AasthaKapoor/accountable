import type { ReactNode } from "react";

export function EmptyState({ message, action, compact }: { message: string; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={`empty${compact ? " compact" : ""}`}>
      <span>{message}</span>
      {action}
    </div>
  );
}
