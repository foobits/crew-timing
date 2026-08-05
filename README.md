# Race Timing Calculator

Mobile-first PWA that converts finish-judge data (one reference elapsed time + per-lane gaps) into **CrewTimer-ready chronological timestamps** (`HH:MM:SS.SSS`).

**Live app:** https://foobits.github.io/crew-timing/

## Quick start

```bash
npm install
npm run dev
```

Open the local URL on your phone (same Wi‑Fi) or use the live site above.

## Race-day workflow

1. Copy the **race start timestamp** from CrewTimer.
2. Enter **reference elapsed** time and select the **reference lane**.
3. Enter each active lane's **gap from reference** (decimal seconds like `2.511`, or judge-sheet format like `1:23.450`). Use the **+/− toggle** or type a leading minus (e.g. `-2.511`).
4. Tap **Calculate**, then **Copy timestamp** on each result and paste into CrewTimer's **Timestamp** field.
5. Confirm CrewTimer's **Delta Time** matches the app's calculated elapsed cross-check.
6. Tap **Next race** when done.

## Install on iPhone

1. Open the live site in Safari.
2. Share → **Add to Home Screen**.
3. Use the home-screen icon at the finish line (works offline after first load).

## Source layout

```
src/
  main.ts              Bootstrap, PWA service worker
  lib/                 Domain logic (parsing, race computation, form commit)
  app/                 App state, persistence, form sync, create-app orchestration
  ui/                  Event binding, partial DOM patches, render modules, components
  test/                Shared test fixtures and bind-app harness
e2e/                   Playwright desktop + mobile flows
fixtures/              Sample race input/outputs for manual regression
```

Rendering is scoped (`render-scope.ts`) so most interactions patch only the affected section (context, lane row, results, etc.) rather than re-rendering the whole app.

## Development

```bash
npm run dev            # local dev server
npm run build          # production build → dist/
npm run preview        # preview production build
npm run test           # unit tests (Vitest)
npm run test:coverage  # unit tests with coverage gate
npm run test:desktop   # Playwright desktop Chrome only
npm run test:mobile    # Playwright mobile Safari only
npm run test:e2e       # Playwright (desktop + mobile)
npm run test:all       # coverage + E2E (same as CI)
npm run test:watch     # Vitest watch mode
```

### Tests

| Area | What's covered |
|------|----------------|
| `src/lib/` | Parsing, race computation, form commit |
| `src/app/` | State, debounced persistence, form sync, app bootstrap |
| `src/ui/` | Event binding, render helpers, partial DOM patches, components, focus/toast |
| `e2e/` | Desktop + mobile race flows |

**182 unit tests.** Coverage thresholds (via `vite.config.ts`) apply to `src/lib/`, `src/app/`, and `src/ui/` — currently ~95% statements / ~98% lines. `bind-events.ts` has dedicated unit tests via `src/test/bind-app.ts`; E2E exercises the full wired app.

**Local E2E note:** Mobile Safari tests may skip on macOS 26+ when Playwright WebKit cannot reach the preview server. CI on Ubuntu runs the full suite (desktop + mobile).

## Deploy

Pushes to `main` run [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): tests, build, and GitHub Pages deploy. Enable **Settings → Pages → Source: GitHub Actions** on a fork.

## CrewTimer verification (before first regatta)

Test in a **non-scoring event** before relying on this app:

- [ ] Calculated timestamp pastes into CrewTimer's **Timestamp** field and is accepted.
- [ ] CrewTimer **Delta Time** matches the app's **Calculated elapsed** for the same lane.
- [ ] Millisecond precision is preserved (three decimal places).
- [ ] **Stopwatch Data Entry** stays unchecked unless CrewTimer docs say otherwise.
- [ ] Offline: install PWA, enable airplane mode, reopen from home screen — app loads and draft persists.

## QA fixture

[`fixtures/weekend-race.json`](fixtures/weekend-race.json) has sample input and expected outputs for regression testing.

## Notes

- **Gap from reference** is not CrewTimer's "Delta Time" (total elapsed).
- **Next race** clears all data including the localStorage draft.
- **Clear judge data** keeps the start timestamp and event label.
- **Stale drafts** from a previous calendar day prompt start-time reconfirmation (uses local date, not UTC).
- **Persistence** is debounced (~400 ms) during typing; pending writes flush on tab close (`beforeunload` / `pagehide`).
- Midnight rollover is handled internally but not emphasized in the UI.

This app is an arithmetic and data-entry aid. It does not replace the official timing record.
