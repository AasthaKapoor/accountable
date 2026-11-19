The MVP is built (phases 1 to 8 of `docs/plan.md`) and all automated tests pass. The checks by hand in phase 9 are still to do: see "Not done yet".

## Install

You need two things installed first:

- [Node.js](https://nodejs.org) 24 or later
- [uv](https://docs.astral.sh/uv/getting-started/installation/), which installs Python 3.12 for you

Then, once, from the repo root:

```
npm install
uv sync
```

For the end-to-end tests you also need Google Chrome installed.

## Run

```
npm run dev
```

Open http://localhost:5173. The first start creates `backend/data/accountable.db` and fills it with sample data. Changes are saved in that file, so they're still there after a refresh or a restart.

## Reset to the sample data

```
npm run seed
```

The sample dates are worked out from today, so the data always looks current.

## Test

```
npm test
```

This runs pytest, then Vitest, then Playwright (which starts its own copy of the app on ports 8100 and 5180, with its own database, `backend/data/e2e.db`). It never touches your data. Each suite can also be run alone with `npm run test:backend`, `npm run test:frontend` or `npm run test:e2e`.

## Done

- `docs/intent.md` clarified (19 Nov 2026): delete rules, activity linking, Won/Lost behaviour, required fields, pipeline columns, pagination, sample data size, UK date format, supported browsers. Currency changed to pounds sterling (£).
- `docs/spec.md` written (19 Nov 2026): data model, business rules, API, frontend libraries, screen designs and brand-based visual design for the MVP.
- Mockups in `docs/mockups/` (19 Nov 2026): three design options (A, B, C) for the dashboard and pipeline, as HTML with PNG screenshots. Option B chosen, and `docs/spec.md` sections 6.1, 6.4 and 7 updated to match.
- `docs/plan.md` written (19 Nov 2026): files that change, the work in nine phases, risks, and the unit and end-to-end tests that prove it.
- MVP built (19 Nov 2026), following the plan's phases 1 to 8:
  - Backend: FastAPI and SQLAlchemy Core on SQLite, every rule in spec section 3, the API in section 4, and a deterministic seed.
  - Frontend: all five sections, record pages with timelines, the drag-and-drop pipeline with optimistic totals and rollback, and the option B dashboard.
  - Tests: 163 pytest, 79 Vitest and 32 Playwright tests, covering everything in the plan's Proof section, plus empty, loading and error states.
  - Every screen checked in Chrome against the option B mockups, with no console errors.

## Decisions made while building

- A delete dialog checks for linked records when it opens and explains a blocked delete straight away. The server still returns 409 if one slips through. Trying the delete first made Chrome log every blocked delete as a console error.
- On the pipeline, a card dropped on another card takes that card's place, as the placeholder shows during the drag. To drop at the bottom of a column, drop below the last card.
- `before_id` in `POST /api/deals/{id}/move` is the card that ends up directly above the moved card, and `after_id` the one directly below.
- A deal created directly as Won or Lost keeps the close date entered. Only a stage change sets it to today.

## Not done yet

- Phase 9 checks by hand (success criterion 8): someone uses every section and action in Chrome, Edge, Safari and Firefox and checks each screen by eye. Only Chrome has been checked so far.
- `npm run dev` and `npm run seed` haven't been tried on Windows yet.
