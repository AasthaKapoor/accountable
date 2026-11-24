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
  - Tests: 164 pytest, 80 Vitest and 33 Playwright tests (after the review fixes below), covering everything in the plan's Proof section, plus empty, loading and error states.
  - Every screen checked in Chrome against the option B mockups, with no console errors.

## Review against `docs/REVIEW.md` (24 Nov 2026)

No tests failed in the review: 163 pytest, 79 Vitest and 32 Playwright all passed. The review found these problems, now fixed, each with a new test that failed before the fix:

- **Deleting the last rows on the final page left an empty page.** The table showed "No ... yet." with no pager, even though records still existed, because nothing moved the page back. `DataTable` now goes to the new last page when the current one comes back empty. Test: `e2e/organizations.spec.ts`, "deleting the only row on the last page goes back a page".
- **Search treated `%` and `_` as wildcards.** The search text went into SQL `LIKE` unescaped, so searching for `_` matched every contact. `listing.py` now escapes them. Test: `test_listing.py`, `test_wildcards_match_themselves`.
- **The organization and contact pickers only loaded the first 100 records.** They asked for one page of 100, the server's largest. Past that, records were missing from the deal and contact forms. They now fetch every page (`fetchAll` in `lib/queries.ts`). Test: `lib/queries.test.ts`.
- **The Contact page's "Add deal" button wasn't in the spec.** It was kept, and `docs/spec.md` section 6.3 now describes it.

One full `npm test` run after the fixes had one e2e failure (`expect(locator).toBeVisible() failed`). The run's output didn't name the test, and it didn't happen again in three more full runs or in 15 repeats of the new test. It may be an intermittent timing problem and still needs looking into if it comes back.

## Decisions made while building

- A delete dialog checks for linked records when it opens and explains a blocked delete straight away. The server still returns 409 if one slips through. Trying the delete first made Chrome log every blocked delete as a console error.
- On the pipeline, a card dropped on another card takes that card's place, as the placeholder shows during the drag. To drop at the bottom of a column, drop below the last card.
- `before_id` in `POST /api/deals/{id}/move` is the card that ends up directly above the moved card, and `after_id` the one directly below.
- A deal created directly as Won or Lost keeps the close date entered. Only a stage change sets it to today.

## Not done yet

- Phase 9 checks by hand (success criterion 8): someone uses every section and action in Chrome, Edge, Safari and Firefox and checks each screen by eye. Only Chrome has been checked so far.
- `npm run dev` and `npm run seed` haven't been tried on Windows yet.
