import { Link, NavLink } from "react-router";
import { Icon, type IconName } from "./Icon";

const ITEMS: { to: string; label: string; icon: IconName }[] = [
  { to: "/", label: "Dashboard", icon: "dashboard" },
  { to: "/organizations", label: "Organizations", icon: "organizations" },
  { to: "/contacts", label: "Contacts", icon: "contacts" },
  { to: "/deals", label: "Deals", icon: "deals" },
  { to: "/pipeline", label: "Pipeline", icon: "pipeline" },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <Link to="/" className="wordmark" aria-label="Accountable home">
        <span className="wordmark-mark">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#073B4C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 19 12 5l7 14M8.5 13h7" />
          </svg>
        </span>
        Accountable
      </Link>
      <nav className="nav" aria-label="Main">
        {ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"}>
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
