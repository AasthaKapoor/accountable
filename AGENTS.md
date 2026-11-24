# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- `docs/intent.md`: what we're building
- `docs/TECH_STACK.md`: the stack
- `docs/STATUS.md`: what's done so far

Update `docs/STATUS.md` when you finish a piece of work

## Testing

Run `npm test` from the repo root before calling any change done. It runs every suite, in this order, and exits non-zero if any test fails:

1. Backend unit tests: pytest, in `backend/tests/` (`npm run test:backend`)
2. Frontend unit tests: Vitest, `*.test.ts(x)` beside the code (`npm run test:frontend`)
3. End-to-end tests: Playwright in Chrome, in `e2e/` (`npm run test:e2e`)

All three suites always run, even after one fails, and a summary at the end lists which passed. The end-to-end tests start their own backend and frontend on ports 8100 and 5180 with their own database, so nothing else needs to be running and your data isn't touched. A change isn't done until `npm test` passes.
