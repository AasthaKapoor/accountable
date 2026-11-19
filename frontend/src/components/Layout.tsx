import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";

export function Layout() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({ title, sub, crumb, children }: { title: ReactNode; sub?: ReactNode; crumb?: ReactNode; children?: ReactNode }) {
  return (
    <div className="title-row">
      <div>
        {crumb && <div className="crumb">{crumb}</div>}
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {children && <div className="title-actions">{children}</div>}
    </div>
  );
}
