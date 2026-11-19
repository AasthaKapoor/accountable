// Shared sample data and helpers for the MVP mockups.
// "Today" is 19 Nov 2026. The figures are consistent across the three screens.

const TODAY = new Date(2026, 10, 19);

const STAGES = [
  { key: "new", name: "New", prob: 10, open: true },
  { key: "qualified", name: "Qualified", prob: 25, open: true },
  { key: "proposal", name: "Proposal", prob: 50, open: true },
  { key: "negotiation", name: "Negotiation", prob: 75, open: true },
  { key: "won", name: "Won", prob: 100, open: false },
  { key: "lost", name: "Lost", prob: 0, open: false },
];

const STAGE_COLOUR = {
  new: "#118AB2",
  qualified: "#FFC145",
  proposal: "#F78C6B",
  negotiation: "rgba(7, 59, 76, 0.6)",
  won: "#06D6A0",
  lost: "#EF476F",
};

// [name, organization, contact, stage, value in pounds, close date (y, m, d)]
// The 11 open deals plus the 14 most recently closed: page 1 of the deals table.
// The other 15 deals (11 won, 4 lost) closed before August 2026.
const DEALS = [
  ["Fleet tracking rollout", "Northgate Logistics", "Priya Shah", "qualified", 42000, [2027, 1, 30]],
  ["Website rebuild", "Brightwater Foods", "Hannah Lowe", "new", 18000, [2027, 1, 12]],
  ["Support contract", "Northgate Logistics", "Tom Bennett", "new", 9500, [2026, 12, 20]],
  ["Clinic booking system", "Halden Health", "Aisha Rahman", "proposal", 36000, [2026, 12, 18]],
  ["Data migration", "Pennine Energy", "Sophie Turner", "qualified", 24500, [2026, 12, 15]],
  ["ERP integration", "Pennine Energy", "Gareth Hughes", "negotiation", 64000, [2026, 12, 10]],
  ["Store POS upgrade", "Ashford Retail", "Leah Morgan", "negotiation", 28500, [2026, 12, 3]],
  ["Compliance audit tooling", "Clarke & Reid Legal", "Fiona Clarke", "negotiation", 12000, [2026, 11, 17]],
  ["Analytics pilot", "Halden Health", "Owen Price", "new", 6000, [2026, 11, 14]],
  ["Staff training", "Clarke & Reid Legal", "James Reid", "qualified", 7200, [2026, 11, 13]],
  ["Annual licence renewal", "Ashford Retail", "Daniel Okafor", "proposal", 15800, [2026, 11, 11]],
  ["Warehouse sensors", "Northgate Logistics", "Priya Shah", "won", 31000, [2026, 11, 12]],
  ["Payroll module", "Ashford Retail", "Daniel Okafor", "lost", 19000, [2026, 11, 6]],
  ["Menu ordering app", "Brightwater Foods", "Marcus Doyle", "won", 14500, [2026, 11, 4]],
  ["Brand site refresh", "Lumen Studio", "Isla Grant", "won", 8800, [2026, 10, 28]],
  ["Patient portal", "Halden Health", "Owen Price", "lost", 22000, [2026, 10, 21]],
  ["Case management setup", "Clarke & Reid Legal", "Fiona Clarke", "won", 26000, [2026, 10, 15]],
  ["Grid monitoring dashboard", "Pennine Energy", "Gareth Hughes", "won", 47000, [2026, 10, 2]],
  ["Supplier portal", "Brightwater Foods", "Hannah Lowe", "lost", 11000, [2026, 9, 25]],
  ["Loyalty scheme", "Ashford Retail", "Leah Morgan", "won", 19500, [2026, 9, 19]],
  ["Route planning tool", "Northgate Logistics", "Priya Shah", "won", 22000, [2026, 9, 3]],
  ["Field service app", "Pennine Energy", "Sophie Turner", "lost", 33000, [2026, 8, 30]],
  ["Studio CMS", "Lumen Studio", "Isla Grant", "won", 6400, [2026, 8, 22]],
  ["Document scanning", "Clarke & Reid Legal", "James Reid", "lost", 5500, [2026, 8, 12]],
  ["Telehealth trial", "Halden Health", "Aisha Rahman", "won", 12000, [2026, 8, 7]],
].map(([name, org, contact, stage, value, [y, m, d]], i) => {
  const s = STAGES.find((x) => x.key === stage);
  const close = new Date(y, m - 1, d);
  return {
    id: i + 1,
    name,
    org,
    contact,
    stage,
    value,
    prob: s.prob,
    close,
    late: s.open && close < TODAY,
  };
});

const TOTAL_DEALS = 40;
const STAGE_COUNTS = { won: 20, lost: 9 }; // all closed deals, including older ones

// Revenue won and deals won/lost by month, Dec 2025 to Nov 2026.
const MONTHS = [
  { m: "Dec", won: 28000, wonCount: 1, lostCount: 0 },
  { m: "Jan", won: 16000, wonCount: 1, lostCount: 1 },
  { m: "Feb", won: 34000, wonCount: 2, lostCount: 0 },
  { m: "Mar", won: 22000, wonCount: 1, lostCount: 1 },
  { m: "Apr", won: 39000, wonCount: 2, lostCount: 0 },
  { m: "May", won: 27000, wonCount: 1, lostCount: 1 },
  { m: "Jun", won: 44000, wonCount: 2, lostCount: 0 },
  { m: "Jul", won: 31000, wonCount: 1, lostCount: 1 },
  { m: "Aug", won: 18400, wonCount: 2, lostCount: 2 },
  { m: "Sep", won: 41500, wonCount: 2, lostCount: 1 },
  { m: "Oct", won: 81800, wonCount: 3, lostCount: 1 },
  { m: "Nov", won: 45500, wonCount: 2, lostCount: 1 },
];

// Value of deals whose furthest stage reached each step, then won.
const FUNNEL = [
  { key: "new", name: "New", value: 844200 },
  { key: "qualified", name: "Qualified", value: 805200 },
  { key: "proposal", name: "Proposal", value: 711500 },
  { key: "negotiation", name: "Negotiation", value: 626700 },
  { key: "won", name: "Won", value: 428200 },
];

// Recent activity: [type, description, linked record, linked?, time, new stage for stage changes]
const ACTIVITY = [
  ["stage", "Moved from Proposal to Negotiation", "Store POS upgrade", true, "2 hours ago", "negotiation"],
  ["call", "Talked through the integration timeline", "ERP integration", true, "4 hours ago"],
  ["email", "Sent the proposal pack", "Clinic booking system", true, "Yesterday"],
  ["note", "Budget for the rollout confirmed for Q1", "Priya Shah", true, "Yesterday"],
  ["stage", "Moved from New to Qualified", "Data migration", true, "2 days ago", "qualified"],
  ["call", "Intro call about the website rebuild", "Hannah Lowe", true, "2 days ago"],
  ["email", "Chased the signed contract", "Compliance audit tooling", true, "3 days ago"],
  ["note", "Wants a pilot before committing", "Owen Price", true, "4 days ago"],
  ["stage", "Moved from Negotiation to Won", "Warehouse sensors", true, "7 days ago", "won"],
  ["call", "Agreed renewal terms in principle", "Annual licence renewal", true, "8 days ago"],
  ["stage", "Moved from Negotiation to Lost", "Payroll module", true, "13 days ago", "lost"],
  ["email", "Sent the training dates", "Staff training", true, "13 days ago"],
  ["note", "Kick-off meeting booked", "Ben Carter", false, "14 days ago"],
  ["stage", "Moved from Negotiation to Won", "Menu ordering app", true, "15 days ago", "won"],
  ["call", "Discussed the menu app launch", "Marcus Doyle", true, "16 days ago"],
];

// Overdue follow-ups: [date, description, linked record]
const FOLLOW = [
  [[2026, 11, 12], "Send the revised quote", "Annual licence renewal"],
  [[2026, 11, 14], "Book the sign-off call", "Compliance audit tooling"],
  [[2026, 11, 15], "Call about the pilot scope", "Owen Price"],
  [[2026, 11, 17], "Share the case study", "Hannah Lowe"],
  [[2026, 11, 18], "Confirm the training dates", "Staff training"],
];

// Helpers

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(d) {
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtMoney(n) {
  return "£" + Math.round(n).toLocaleString("en-GB");
}

function fmtShort(n) {
  if (n >= 1e6) return "£" + (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return "£" + Math.round(n / 1e3) + "K";
  return "£" + n;
}

function openDeals() {
  return DEALS.filter((d) => STAGES.find((s) => s.key === d.stage).open);
}

function totals(deals) {
  return {
    value: deals.reduce((a, d) => a + d.value, 0),
    expected: deals.reduce((a, d) => a + (d.value * d.prob) / 100, 0),
  };
}

// Icons (24px viewBox, stroke-based)
const ICONS = {
  dashboard: '<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 7h6V4h-6z"/>',
  organizations: '<path d="M4 20V6l8-3v17M12 9h8v11M8 9h.01M8 13h.01M8 17h.01M16 13h.01M16 17h.01M2 20h20"/>',
  contacts: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.6 2.5 3 5.2"/>',
  deals: '<path d="M3 7h18v13H3zM8 7V4h8v3M3 12h18"/>',
  pipeline: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  note: '<path d="M5 3h10l4 4v14H5zM14 3v5h5M9 13h6M9 17h4"/>',
  call: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  sortDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  chevronLeft: '<path d="m15 6-6 6 6 6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  up: '<path d="M7 17 17 7M9 7h8v8"/>',
  down: '<path d="M7 7l10 10M17 9v8H9"/>',
};

function icon(name, attrs = "") {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${attrs}>${ICONS[name]}</svg>`;
}

function renderSidebar(active) {
  const items = [
    ["dashboard", "Dashboard"],
    ["organizations", "Organizations"],
    ["contacts", "Contacts"],
    ["deals", "Deals"],
    ["pipeline", "Pipeline"],
  ];
  const links = items
    .map(([k, label]) => `<a href="${k}.html" class="${k === active ? "active" : ""}">${icon(k)}${label}</a>`)
    .join("");
  document.querySelector(".sidebar").innerHTML = `
    <div class="wordmark">
      <span class="wordmark-mark">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#073B4C" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19 12 5l7 14M8.5 13h7"/></svg>
      </span>
      Accountable
    </div>
    <nav class="nav">${links}</nav>`;
}
