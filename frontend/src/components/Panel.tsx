import type { ReactNode } from "react";

export function Panel({ title, hint, actions, className = "", children, ...rest }: {
  title?: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <section className={`panel ${className}`} aria-label={rest["aria-label"] ?? (typeof title === "string" ? title : undefined)}>
      {(title || actions || hint) && (
        <div className="panel-head">
          {title && <h2>{title}</h2>}
          {hint && <span className="hint">{hint}</span>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
