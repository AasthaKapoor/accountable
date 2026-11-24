# Spec: the Accountable MVP

This spec turns `docs/intent.md` into requirements and a design. If the two disagree, `intent.md` wins. The stack is in `docs/TECH_STACK.md`.

## 1. Scope

A sales CRM for one person, running locally, light mode, for laptop and desktop screens (1280px wide and up). It has five sections: Dashboard, Organizations, Contacts, Deals and Pipeline. These are out of scope: sign-in, multiple users, dark mode, phone layouts, AI, integrations, other currencies, extra reports, tags, custom fields, editable stages, and import or export.

## 2. Data model

The data lives in SQLite through SQLAlchemy Core. Every table has an integer `id`, plus `created_at` and `updated_at` as UTC timestamps.

### organizations

| Field | Type | Rules |
|---|---|---|
| name | text | required, trimmed, 1–200 chars |
| website | text | optional, stored as entered and shown as a link |
| industry | text | optional |
| notes | text | optional |

### contacts

| Field | Type | Rules |
|---|---|---|
| name | text | required |
| email | text | optional, must be a valid email if given |
| phone | text | optional |
| job_title | text | optional |
| organization_id | FK organizations | required |
| status | enum `lead`, `qualified`, `customer` | required, default `lead` |

### deals

| Field | Type | Rules |
|---|---|---|
| name | text | required |
| organization_id | FK organizations | required |
| contact_id | FK contacts | required, and the contact must belong to `organization_id` |
| stage | enum `new`, `qualified`, `proposal`, `negotiation`, `won`, `lost` | required |
| value_pence | integer | required, 0 or more, in pounds sterling (£) |
| probability | integer 0–100 | required, defaults from the stage |
| probability_is_manual | boolean | true when set by hand, cleared on a stage change |
| close_date | date | required, the expected or actual close date |
| position | float | order within its stage column |
| furthest_stage | enum, open stages only | the furthest open stage the deal has reached, used by the funnel |

### activities

| Field | Type | Rules |
|---|---|---|
| type | enum `note`, `call`, `email`, `stage_change` | required. `stage_change` is created by the system only |
| description | text | required |
| occurred_at | datetime | required, defaults to now |
| contact_id | FK contacts, nullable | |
| deal_id | FK deals, nullable | |
| subject_label | text | the linked record's name, kept so an entry still reads well after that record is deleted |
| follow_up_date | date, nullable | |
| follow_up_done | boolean | default false |

When an activity is created, it must link to a contact or a deal. It can lose both links later through deletes.

### Stage probabilities

| Stage | Default probability |
|---|---|
| New | 10% |
| Qualified | 25% |
| Proposal | 50% |
| Negotiation | 75% |
| Won | 100% (fixed) |
| Lost | 0% (fixed) |

Won and Lost are closed stages. The other four are open.

## 3. Business rules

The backend enforces all of these. The frontend mirrors them so it can give feedback sooner.

1. **Deal contact belongs to the organization.** Creating or editing a deal fails with 422 if the contact's `organization_id` differs from the deal's. In the form, the contact picker only lists the chosen organization's contacts, and changing the organization clears the contact. Moving a contact to another organization is blocked (422) while they're the main contact on a deal at their current organization.
2. **Stage change.** When a deal's stage changes, wherever it happens:
   - `probability` becomes the new stage's default, and `probability_is_manual` becomes false.
   - A `stage_change` activity is created with the description "Moved from {Old} to {New}", linked to the deal and its main contact.
   - Moving to Won or Lost sets `close_date` to today, in local time. It stays editable afterwards.
   - Moving to Won sets the main contact's status to `customer`.
   - When the new stage is open and further along than `furthest_stage`, `furthest_stage` is updated.
3. **Manual probability.** Editing a deal's probability while its stage stays the same sets `probability_is_manual` to true. Won and Lost probabilities can't be edited.
4. **Activities on deals.** An activity logged on a deal gets `contact_id` set to the deal's main contact, so it shows in both timelines.
5. **Delete rules.** Every delete asks for confirmation first, and the dialog says what will happen to linked records.
   - An organization with any contacts or deals: blocked (409). The dialog shows the counts and explains why.
   - A contact who is the main contact on any deal: blocked (409). The dialog lists the deals.
   - A contact otherwise: deleted. Their activities stay, with `contact_id` cleared.
   - A deal: deleted. Its activities, including stage-change entries, stay with `deal_id` cleared and still show in recent activity.
   - An activity: deleted.
6. **Late deal.** A deal is late when its stage is open and its `close_date` is before today.
7. **Follow-ups.** A follow-up is open when `follow_up_date` is set and `follow_up_done` is false. It's overdue when that date is before today, and upcoming otherwise.
8. **Totals.** Total value is the sum of `value` across open deals. Expected revenue is the sum of `value × probability / 100` across open deals.

## 4. API

The API serves JSON under `/api`. Money goes over the wire as integer pence, and dates as ISO `YYYY-MM-DD`. Validation errors return 422 with `{ "errors": { field: message } }`. Blocked deletes return 409 with `{ "message", "blocking": [...] }`.

| Method and path | Purpose |
|---|---|
| `GET /api/organizations?search=&sort=&order=&page=&page_size=` | Paginated list with contact and deal counts. |
| `POST /api/organizations`, `GET/PATCH/DELETE /api/organizations/{id}` | CRUD. GET includes the organization's contacts and deals. |
| `GET /api/contacts?search=&status=&organization_id=&sort=&order=&page=&page_size=` | Paginated list with the organization's name. |
| `POST /api/contacts`, `GET/PATCH/DELETE /api/contacts/{id}` | CRUD. GET includes the organization, the contact's deals and their timeline. |
| `GET /api/deals?search=&stage=&sort=&order=&page=&page_size=` | Paginated list with organization and contact names and an `is_late` flag. |
| `POST /api/deals`, `GET/PATCH/DELETE /api/deals/{id}` | CRUD. A PATCH that changes the stage applies the rules in section 3.2. |
| `POST /api/deals/{id}/move` | Body `{ stage, before_id?, after_id? }`. Changes the stage and position in one transaction and returns the updated board totals. |
| `GET /api/pipeline` | All deals grouped by stage and ordered by position, with board and column totals. |
| `POST /api/activities`, `PATCH/DELETE /api/activities/{id}` | CRUD. `stage_change` entries can't be created or edited through the API, only deleted. |
| `GET /api/dashboard` | Every dashboard figure in one response (section 6.1). |

Search matches case-insensitive substrings:
- Organizations: name and industry.
- Contacts: name, email and organization name.
- Deals: name, organization name and contact name.

Page size is 25 by default.

**Ordering within a column.** A dropped card's `position` is set to the midpoint between its new neighbours, or to one more or one less than the end card's. If the gaps get too small, the column is renumbered.

**Seeding.** The backend fills the database with sample data when the file is new, and `npm run seed` drops it and reseeds. Sample dates are relative to today, so the data always looks current. The sample set has:
- 10 organizations across at least 6 industries.
- 30 contacts with every status.
- 40 deals:
  - at every stage;
  - won and lost deals spread over the past 12 months;
  - open deals closing over the next 3 months;
  - 4 or 5 deals that are late.
- About 100 activities, including stage-change entries, with about 5 follow-ups overdue and 8 upcoming.

The seed is deterministic, using a fixed random seed.

## 5. Frontend structure

| Concern | Library |
|---|---|
| Routing | React Router |
| Server state and caching | TanStack Query |
| Tables (sorting, pagination) | TanStack Table, with sorting and paging done on the server |
| Charts | Recharts |
| Drag and drop | dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`) |
| Forms and validation | React Hook Form with Zod |
| Dates | date-fns, formatted as `d MMM yyyy` (19 Nov 2026) |
| Dialogs, menus, popovers | Radix UI primitives |

Routes:
- `/` for the Dashboard.
- `/organizations` and `/organizations/:id`.
- `/contacts` and `/contacts/:id`.
- `/deals` and `/deals/:id`.
- `/pipeline`.

Pipeline moves update the board optimistically: the card and the totals change straight away. If the server rejects a move, the board rolls back and a toast explains why.

## 6. Screens

### Layout

- A fixed left sidebar, 240px wide, on the Midnight background:
  - the Accountable wordmark at the top;
  - nav items for the five sections, each with an icon;
  - Sea Mist text, with the active item shown as a Sea Green pill with Midnight text.
- The main area on `#F0F4F5`, with a page title row holding the title on the left and the primary action on the right.
- Content sits in white rounded panels (12px radius) with no outline, separated by spacing (24px gutters).

### 6.1 Dashboard

The design is option B in `docs/mockups/option-b/dashboard.html`. The page is laid out as a 12-column grid.

1. **Hero panel**, full width, on Midnight with Sea Mist and white text (16px radius). It has three parts:
   - **Headline figures**, on the left:
     - Open pipeline value, the largest figure on the page (46px JetBrains Mono).
     - Below it, in a 2 by 2 grid:
       - Expected revenue.
       - Revenue won this month, with the change against last month.
       - Win rate over the last 90 days (won divided by won plus lost), with a Sea Green ring and the won and lost counts.
       - The number of open deals, and how many are late.
   - **Revenue won by month**, on the right: a line chart of the last 12 months with a Sea Green line and a soft area fill. The tooltip shows the month, the revenue and the number of deals won.
   - **Pipeline by stage**, along the bottom:
     - A segmented bar of open value per stage, in the stage colours. Negotiation uses Sea Mist, because Midnight doesn't show on the dark panel.
     - Each segment is labelled with the stage, its deal count and its value.
     - A Sea Green "View pipeline" link.
2. **Sales funnel** (8 columns): a column for each of New, Qualified, Proposal and Negotiation, then Won, stepping down left to right.
   - Each column's height is the total value of deals whose `furthest_stage` reached that stage. For Won, it's the value of the won deals.
   - The value sits above each column and the stage name below it.
   - A small white badge between two columns shows the conversion from the stage before.
3. **Deals won and lost by month** (4 columns): a stacked bar for each of the last 12 months, Sea Green for won and Coral for lost.
4. **Follow-ups** (5 columns): two tabs, Overdue (shown first, with a Raspberry count badge) and Upcoming (the next 14 days).
   - Each row shows a checkbox that marks it done, the date, the description, and the linked contact or deal.
   - Overdue dates are in Raspberry.
5. **Recent activity** (7 columns): the latest 15 activities, newest first, one line each.
   - Each row has a dot, the description, a link to the contact or deal (or its kept label, unlinked, if deleted), the type and a relative time.
   - For a stage change, the dot and a pill show the new stage's colour.

### 6.2 Tables (Organizations, Contacts, Deals)

These parts are shared:
- A search box, debounced by 250ms.
- Sortable column headings with an arrow showing the direction.
- Pagination at the bottom ("1–25 of 40", plus previous and next).
- A "New ..." primary button.
- A row menu with Edit and Delete.

Clicking a row opens the record's page.

- **Organizations**: Name, Industry, Website, Contacts, Deals, Open value.
- **Contacts**: Name, Organization, Job title, Email, Phone, Status.
  - A segmented filter: All, Lead, Qualified, Customer.
  - Status shows as a pill.
- **Deals**: Name, Organization, Contact, Stage, Value, Probability, Close date.
  - Stage shows as a pill.
  - Late deals get a Raspberry "Late" tag beside the close date, and the date is in Raspberry text.

Add and edit happen in a modal form. Errors show under each field, and Save stays disabled while the form is invalid.

### 6.3 Record pages

The layout is two columns. On the left is a details panel with an Edit button. On the right are the linked records and the timeline.

- **Organization**:
  - The details.
  - A Contacts panel, which can add a contact pre-filled with this organization.
  - A Deals panel, which can add a deal the same way.
  - The organization's open value and expected revenue.
- **Contact**: the details, a link to their organization, their deals, and the timeline. The Deals panel can add a deal pre-filled with this contact and their organization.
- **Deal**:
  - The details: a stage pill with a stage dropdown, the value, the probability (marked "set by hand" when manual), the close date, the organization and the contact.
  - The timeline.

**The timeline** has a "Log activity" form at the top:
- the type (note, call or email);
- a description;
- the date and time, defaulting to now;
- an optional follow-up date.

Entries follow, newest first. Each shows a type icon, the description, its date, and a follow-up chip when one is set. The chip is Raspberry when overdue and can be ticked off. Each entry has Edit and Delete in a menu.

### 6.4 Pipeline

The design is option B in `docs/mockups/option-b/pipeline.html`.

- A summary panel sits above the board, on Midnight like the dashboard hero. It shows:
  - the open value, the expected revenue and the number of open deals;
  - a segmented bar of open value per stage, labelled with the stage names.
- The board sits in a white panel with six columns, New through Won and Lost.
- Each column is tinted with its stage colour at about 8–12%.
- Each column header shows:
  - the stage name and a count badge;
  - the column's open value in large JetBrains Mono, with its expected revenue below. These are blank for Won and Lost, which don't count toward totals.
- Each card is white and shows, from the top:
  - the value, in JetBrains Mono, as the card's largest text;
  - the deal name and the organization;
  - the probability as a thin bar in the stage colour, with the percentage beside it;
  - the close date.
- A late card gets a Raspberry "Late" tag in its top-right corner, and its date reads "Due 14 Nov 2026" in Raspberry.
- A card can be dropped at any point in any column and stays exactly there.
- While dragging, a lifted shadow follows the cursor and a placeholder shows where the card will land.
- Every column ends with a "+ Add deal" button that opens the deal form with that stage set. The new deal goes to the bottom of the column.
- Clicking a card opens the deal page.
- The board scrolls sideways inside its panel when the window is too narrow for all six columns. The page itself never scrolls sideways.
- Within a column, cards scroll inside it once they're taller than about 560px.

## 7. Visual design

The design follows the brand skill.

**Type**
- Instrument Sans for headings and body. Weights: 600 for headings, 400 and 500 for body.
- JetBrains Mono for money, percentages, counts and dates in tables.
- Instrument Serif only for the empty-state line on the dashboard ("Your pipeline at a glance").
- Base size 14px. Page titles are 24px, panel titles 16px.

**Colour tokens**

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F0F4F5` | page background |
| `--panel` | `#FFFFFF` | panels and cards |
| `--ink` | `#073B4C` Midnight | text |
| `--ink-muted` | Midnight at 65% | secondary text |
| `--primary` | `#06D6A0` Sea Green | primary buttons (Midnight text), won, active nav |
| `--primary-text` | `#05A87E` | Sea Green when used as text on light backgrounds |
| `--secondary` | `#FFC145` Marigold | |
| `--secondary-text` | `#B07A0A` | Marigold when used as text |
| `--tertiary` | `#F78C6B` Coral | |
| `--info` | `#118AB2` Cerulean | links, information (white text) |
| `--alert` | `#EF476F` Raspberry | late, overdue, destructive actions (white text) |

**Stage colours.** These follow the brand order, with the semantic colours kept for closed stages.

| Stage | Colour |
|---|---|
| New | Cerulean |
| Qualified | Marigold |
| Proposal | Coral |
| Negotiation | Midnight at 60% |
| Won | Sea Green |
| Lost | Raspberry |

**Status pills**: Lead is Cerulean, Qualified is Marigold, Customer is Sea Green. Each pill is a tinted background with dark text.

**Surfaces**
- Panels are rounded, with no outline and a very soft shadow.
- Panels are white, except the dashboard hero and the pipeline summary, which are Midnight. On Midnight, text is white or Sea Mist, and Midnight-coloured marks use Sea Mist instead.
- No one-edge borders and no top-of-page rule.
- Table rows are separated by a faint row tint on hover, not by lines.
- Gradients are limited to the revenue chart's area fill.
- The mockups in `docs/mockups/option-b/` show these rules in use.

**Formatting**
- Money is shown as `£12,500` in tables and cards and as `£1.2M` or `£84K` on chart axes, always with the `£` sign.
- Dates use the `19 Nov 2026` format. Relative times in recent activity read like "3 hours ago".

**Tone.** Short, plain labels such as "New deal", "Log activity" and "Delete organization". No exclamation marks. Here are two confirmation messages, for example:
- "Delete Acme Ltd? This can't be undone."
- "Acme Ltd can't be deleted because it still has 3 contacts and 2 deals."

**States**
- Every list has an empty state with one line and the primary action.
- Loading shows skeleton rows.
- Errors show as a toast.

## 8. Testing

- **pytest** covers:
  - every rule in section 3: the contact/organization match, stage-change effects, delete blocking and activity preservation, late flags, totals;
  - search, sort and pagination;
  - the seed's counts and coverage.
- **Vitest** covers formatters (money, dates), late and overdue helpers, position calculation, and form validation.
- **Playwright** (Chrome) covers:
  - landing on the dashboard with data;
  - CRUD on each table;
  - blocked deletes;
  - the status filter;
  - dragging a card between columns and within a column, then refreshing;
  - moving a deal to Won, which updates the contact status and the close date;
  - logging a follow-up and seeing it on the dashboard;
  - no console errors.
- Tests run against their own database file, so `npm test` never touches real data.

## 9. Done means

All eight success criteria in `docs/intent.md` are met. On top of passing tests, someone has used every screen and action by hand in a real browser.
