# Plan: building the Accountable MVP

This plan builds what `docs/intent.md` asks for and `docs/spec.md` describes, using the stack in `docs/TECH_STACK.md`. The dashboard and pipeline follow `docs/mockups/option-b/`. If this plan disagrees with the spec, the spec wins.

## 1. Files that change

Everything is new apart from `docs/STATUS.md` and `.gitignore`. Paths are from the repo root.

### Repo root

| File | What it does |
|---|---|
| `package.json` | npm workspace with `frontend/`. Scripts: `dev`, `test`, `seed`, plus `test:backend`, `test:frontend` and `test:e2e`. Dev dependencies: `concurrently`, `@playwright/test`. |
| `package-lock.json` | npm lock file |
| `pyproject.toml`, `uv.lock` | Python 3.12 project for `backend/`: FastAPI, Uvicorn, SQLAlchemy, Pydantic. Dev: pytest, httpx. |
| `scripts/seed.mjs` | runs the backend seed through `uv run`, the same way on Mac, Linux and Windows |
| `.gitignore` | adds `backend/data/` if it isn't already covered by `*.db` |
| `docs/STATUS.md` | how to install, run, test and reset the app, and what's done |

### Backend (`backend/accountable/`)

| File | What it does |
|---|---|
| `main.py` | the FastAPI app. Mounts the routers under `/api`, creates the tables and seeds a new database on start. |
| `config.py` | settings, including the database path from `ACCOUNTABLE_DB`, so tests use their own file |
| `clock.py` | `today()` and `now()` in local time, in one place so tests can fix the date |
| `db.py` | engine, metadata and the four tables (spec section 2) |
| `rules.py` | plain functions: stage probabilities, stage order, late deals, follow-up status, totals, position between neighbours |
| `schemas.py` | Pydantic request and response models, and the 422 error shape |
| `routers/organizations.py` | list, get, create, update, delete with the 409 block |
| `routers/contacts.py` | the same, plus the status filter and the organization-move block |
| `routers/deals.py` | the same, plus stage-change effects on PATCH, and `POST /deals/{id}/move` |
| `routers/pipeline.py` | `GET /api/pipeline`: deals by stage, ordered by position, with totals |
| `routers/activities.py` | create, update, delete; `stage_change` entries can only be deleted |
| `routers/dashboard.py` | `GET /api/dashboard`: every figure in section 6.1 |
| `listing.py` | search, sort and pagination shared by the three list endpoints |
| `seed.py` | deterministic sample data with dates relative to today; `python -m accountable.seed` drops and reseeds |

### Backend tests (`backend/tests/`)

`conftest.py` (a fresh database per test and a fixed today), `test_rules.py`, `test_organizations.py`, `test_contacts.py`, `test_deals.py`, `test_stage_change.py`, `test_move.py`, `test_activities.py`, `test_listing.py`, `test_pipeline.py`, `test_dashboard.py`, `test_seed.py`.

### Frontend (`frontend/`)

| File | What it does |
|---|---|
| `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html` | the Vite app. Vite proxies `/api` to the backend. |
| `src/main.tsx`, `src/App.tsx` | React Router routes (spec section 5) and the TanStack Query client |
| `src/styles/tokens.css`, `src/styles/global.css` | colour tokens, type and surfaces from spec section 7. Fonts come from `@fontsource` packages, so no internet is needed. |
| `src/lib/api.ts` | fetch wrapper that turns 422 and 409 responses into typed errors |
| `src/lib/format.ts` | money (`£12,500`, `£84K`), dates (`19 Nov 2026`), relative times |
| `src/lib/stages.ts` | stage names, order, colours and default probabilities |
| `src/lib/rules.ts` | late deal, overdue follow-up, totals, position between neighbours (the same rules as the backend, for optimistic updates) |
| `src/components/` | `Layout`, `Sidebar`, `Panel`, `DataTable` (TanStack Table with search, sort and pagination), `Modal`, `ConfirmDelete`, `Pill`, `LateTag`, `Toast`, `Skeleton`, `EmptyState` |
| `src/features/organizations/` | list page, record page, form and its Zod schema |
| `src/features/contacts/` | list page with status filter, record page, form and schema |
| `src/features/deals/` | list page, record page with stage dropdown, form and schema (contact picker limited to the organization) |
| `src/features/activities/` | `Timeline` and `ActivityForm`, used by contact and deal pages |
| `src/features/pipeline/` | `PipelinePage`, `SummaryPanel`, `Board`, `Column`, `DealCard`, and the move mutation with rollback |
| `src/features/dashboard/` | `DashboardPage`, `Hero`, `RevenueChart`, `StageBar`, `Funnel`, `WonLostChart`, `FollowUps`, `RecentActivity` |

Unit tests sit beside the code they test, as `*.test.ts`.

### End-to-end tests (`e2e/`)

`playwright.config.ts` (starts the backend and frontend on their own ports with a test database, Chrome only), `fixtures.ts` (reseeds before each test and fails the test on any console error), and one spec file per area, listed under Proof.

## 2. Order of work

Each phase ends with `npm test` passing and a commit. A phase isn't started until the one before it works.

### Phase 1: skeleton

- Root `package.json` with the workspace, `pyproject.toml`, an empty FastAPI app with `GET /api/health`, and an empty Vite app.
- `npm run dev` starts both; `npm test` runs pytest, Vitest and Playwright.
- One smoke test of each kind, so the whole test chain is proven before there's anything to test.
- `docs/STATUS.md` says how to install and run.

### Phase 2: data, rules and seed

- `db.py` tables, `clock.py`, `rules.py`.
- `seed.py` with the counts and coverage in spec section 4, and `npm run seed`.
- The app seeds a new database on start.

### Phase 3: API

1. Organizations, contacts and deals: CRUD, validation, delete blocks, search, sort and pagination.
2. Stage-change effects on deal PATCH (spec section 3.2).
3. Activities, including linking to the deal's main contact and keeping activities after deletes.
4. `POST /deals/{id}/move` and `GET /api/pipeline`.
5. `GET /api/dashboard`.

### Phase 4: frontend shell

- Tokens, fonts, layout and sidebar, matching the mockups.
- Routes with placeholder pages.
- `api.ts`, `format.ts`, `stages.ts`, `rules.ts`.
- Shared components: `DataTable`, `Modal`, `ConfirmDelete`, `Toast`, `Pill`, `Skeleton`, `EmptyState`.

### Phase 5: tables and forms

Organizations, Contacts (with the status filter) and Deals (with late tags): list, add, edit and delete, including the blocked-delete dialogs.

### Phase 6: record pages and timeline

Organization, contact and deal pages, the timeline, logging and editing activities, follow-up chips, and the deal page's stage dropdown.

### Phase 7: pipeline

- Board, columns, cards and summary panel as in `option-b/pipeline.html`.
- Dragging between and within columns, with optimistic totals and rollback.
- "+ Add deal" in each column.

### Phase 8: dashboard

The hero (headline figures, revenue chart, pipeline by stage), funnel, won and lost chart, follow-ups and recent activity, as in `option-b/dashboard.html`.

### Phase 9: finish and check by hand

- Empty, loading and error states on every screen.
- Check every screen against the mockups and the brand.
- Use the app end to end in Chrome, Edge, Safari and Firefox (success criterion 8).
- Check that `npm run dev` and `npm run seed` work on Windows.
- `docs/STATUS.md` brought up to date.

## 3. Risks

| Risk | What could go wrong | How we handle it |
|---|---|---|
| Drag and drop | Free positioning across six scrolling columns is the hardest part of the UI. dnd-kit with nested scroll areas can drop in the wrong place, and Playwright drags with dnd-kit need small mouse steps. | Build the board early in phase 7 with fake data first, and write the drag e2e test straight away. |
| Optimistic moves | The board's totals and the server's totals could disagree, or a failed move could leave the board in the wrong state. | One totals formula in `rules.ts` and `rules.py`, tested with the same cases. The move endpoint returns the server's totals, which replace the optimistic ones. |
| Position numbers | Repeated drops between the same two cards shrink the gap until floats can't tell them apart. | Renumber the column when the gap gets too small, with a test that drops 60 times in one spot. |
| Dates and time zones | "Today" in local time and timestamps in UTC can disagree around midnight, which would flip late deals and overdue follow-ups. Relative seed dates make tests depend on the day they run. | All "today" logic goes through `clock.py`. pytest fixes the date; e2e assertions work out expected dates from the seed, not hard-coded ones. |
| Money rounding | `value × probability / 100` can give fractions of a penny. | Add up in exact numbers and round to whole pence once at the end, on both sides. |
| Working offline | Google Fonts links need the internet, and the intent says the app must work without it. | Bundle the fonts with `@fontsource`. The e2e tests block outside requests to catch anything that sneaks in. |
| One command on every OS | Non-technical users need Node and uv installed first, and npm scripts can break on Windows paths and quoting. | Keep scripts in Node (`scripts/*.mjs`), document the two prerequisites and the install step in `STATUS.md`, and check on Windows in phase 9. |
| Test isolation | E2e tests change data, so one test could break the next. | A separate test database, reseeded before each test, with tests run one at a time. |
| Funnel data | The funnel depends on `furthest_stage`, so seed deals that skip it will make the funnel look wrong. | `test_seed.py` checks that every seeded deal has a `furthest_stage` that fits its stage and its stage-change history. |
| Browsers we don't test automatically | Playwright runs Chrome only, so Safari and Firefox problems would slip through. | Check by hand in all four browsers in phase 9. |

## 4. Proof

`npm test` runs all three suites and fails if any test fails. Passing tests are needed but not enough: success criterion 8 also needs a check by hand.

### Backend unit tests (pytest)

- **Rules**
  - default probability for each stage; Won 100% and Lost 0% can't be edited
  - late: an open deal with a close date before today is late; one due today isn't; Won and Lost never are
  - follow-ups: overdue before today, upcoming from today; done ones are neither
  - totals count open deals only, and expected revenue rounds correctly
  - position between two neighbours, at the top, at the bottom and in an empty column; renumbering when the gap is too small
- **Organizations**: create, read, update; name required and trimmed; delete blocked (409) with contacts or deals, with the counts in the response; delete allowed when empty
- **Contacts**
  - organization required, email checked when given, status defaults to lead
  - moving a contact to another organization is blocked while they're the main contact on a deal there
  - delete blocked while main contact on a deal, with the deals listed; otherwise deleted, and their activities stay with `contact_id` cleared
- **Deals**
  - required fields; contact must belong to the organization (422)
  - editing probability without a stage change marks it manual
  - delete keeps the activities, including stage-change entries, with `deal_id` cleared
- **Stage change** (by PATCH and by move)
  - probability resets to the new stage's default and manual is cleared
  - a "Moved from Proposal to Negotiation" activity is created, linked to the deal and its contact
  - Won and Lost set the close date to today
  - Won makes the main contact a customer
  - `furthest_stage` moves forward and never back
- **Move**: changes stage and position in one transaction; the card lands between the given neighbours; returns updated totals; an unknown deal returns 404
- **Activities**: must link to a contact or deal; a deal activity also links the main contact; `stage_change` can't be created or edited, only deleted
- **Listing**: search on the fields in spec section 4, case-insensitive; sorting on each column both ways; page size 25 and correct totals
- **Pipeline**: all six stages, ordered by position, with board and column totals
- **Dashboard**: each figure checked against a small hand-built data set: monthly revenue won, won and lost counts, win rate, open value, expected revenue, funnel values, stage values, overdue and upcoming follow-ups, latest 15 activities newest first
- **Seed**: counts (10, 30, 40, about 100); at least 6 industries; every status and stage present; 4 or 5 late deals; about 5 overdue and 8 upcoming follow-ups; same output on two runs

### Frontend unit tests (Vitest)

- `format.ts`: `£12,500`, `£0`, `£84K`, `£1.2M`; `19 Nov 2026`; "3 hours ago" and similar
- `rules.ts`: late deal, overdue follow-up, totals and position, using the same cases as the backend tests
- `stages.ts`: order, colours and default probabilities match the spec
- Form schemas:
  - each required field rejected when empty
  - invalid email rejected
  - deal value can't be negative
  - a deal's contact must be from the chosen organization
- Pipeline move: the optimistic update moves the card and changes the totals, and a rejected move restores the board

### End-to-end tests (Playwright, Chrome)

| Spec file | What it proves | Success criterion |
|---|---|---|
| `dashboard.spec.ts` | Opening the app lands on the dashboard; every panel shows seed data; the figures match `/api/dashboard` | 1, 6 |
| `organizations.spec.ts` | Add, search, sort, page, edit and delete an organization; each change still there after a refresh; delete blocked for one with contacts | 2, 3 |
| `contacts.spec.ts` | The same for contacts; the status filter; delete blocked for a main contact; the record page shows the organization and the timeline | 2, 3 |
| `deals.spec.ts` | The same for deals; late deals show the tag; the contact picker only lists the organization's contacts | 2, 3, 4 |
| `pipeline.spec.ts` | Drag a card to another column, then within a column; totals change straight away; after a refresh the card is where it was dropped and the deals list shows the new stage and probability; "+ Add deal" creates a deal at that stage; late cards stand out | 4 |
| `won.spec.ts` | Moving a deal to Won sets today's close date, makes the contact a customer and updates the dashboard's won figures | 4, 6 |
| `activities.spec.ts` | Log an activity with a follow-up on a deal; it shows in the deal's and the contact's timelines, newest first, along with stage-change entries; it shows on the dashboard; marking it done removes it | 5, 6 |
| `reset.spec.ts` | After changes, `npm run seed` brings back the sample data | 2 |

Every e2e test also fails if the browser console logs an error, or if the page tries to reach the internet.

### By hand

Before the MVP is called done, someone uses every section and action above in Chrome, Edge, Safari and Firefox. They check each screen by eye against the mockups and the brand, and confirm there are no console errors. The result goes in `docs/STATUS.md`.
