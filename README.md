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

1. Copy the **race start timestamp** from CrewTimer into **Race start**.
2. Enter **reference elapsed** time and select the **reference lane**.
3. Enter each active lane's **gap from reference** (see [Field input formats](#field-input-formats) below).
4. Tap **Calculate**, then **Copy timestamp** on each result and paste into CrewTimer's **Timestamp** field. Copied lanes turn **green**.
5. Confirm CrewTimer's **Delta Time** matches the app's **Calculated elapsed** cross-check.
6. Tap **Next race** when done.

## Field input formats

All time fields accept typed digits and auto-insert colons/decimals as you go (mobile decimal keypad friendly). You can also paste formatted values.

### Event label

Free text (e.g. `Mens 1V 8+ Heat 1`). Optional; saved with the draft.

### Race start timestamp

The clock time CrewTimer shows for **race start** — not elapsed time.

| Accepted | Example |
|----------|---------|
| `HH:MM:SS` | `13:08:01` |
| `HH:MM:SS.SSS` | `13:08:01.491` |

- **24-hour** only (no AM/PM).
- Hours `00`–`23`; minutes and seconds `00`–`59`.
- Milliseconds optional (up to three digits); missing fraction is treated as `.000`.
- Typing digits only is fine: `130801491` becomes `13:08:01.491`.

**Stale drafts:** If you reopen a saved draft from a **previous calendar day** (local date), the app asks you to reconfirm the start time before calculating.

### Reference elapsed time

How long the **reference boat** was on the water (CrewTimer-style elapsed, not a clock timestamp).

| Accepted | Example | Meaning |
|----------|---------|---------|
| `MM:SS.SSS` | `02:23.450` | 2 min 23.450 s |
| `M:SS.SSS` | `1:23.450` | 1 min 23.450 s |
| Decimal seconds | `83.450` | 83.450 s |

Minutes are not limited to two digits (long races are OK). The reference lane's gap field mirrors this value and is read-only.

### Gap from reference (per lane)

How much **ahead (+)** or **behind (−)** each boat finished relative to the reference lane. This is **not** CrewTimer's total elapsed ("Delta Time").

| Accepted | Example | Meaning |
|----------|---------|---------|
| Decimal seconds | `2.511` | 2.511 s behind (default +) |
| `MM:SS.SSS` | `1:23.450` | 1 min 23.450 s |
| Signed decimal | `-2.511` | 2.511 s ahead |
| Signed duration | `-0:02.340` | 2.340 s ahead |

**Sign (+/−):**

- Tap the **+/− button** beside the gap field, **or** type a leading `-` (e.g. `-2.511`).
- On mobile, you can tap **+/− once** while the gap field is still focused — no need to dismiss the keyboard first.
- If you type an explicit sign (`+` or `-`), that sign wins on commit. Otherwise the **+/− toggle** state is kept when you enter an unsigned value like `2.511`.

**Lane status:** Mark a lane **Empty** if it had no finisher; its gap is ignored. **Clear** resets a lane's gap without changing start time or reference.

**Sheet-style entry:** Typing six digits without punctuation in a gap field (e.g. `123450`) auto-formats to `1:23.450`.

### Calculate and mobile commit

**Calculate** reads live values from every field, even if you have not blurred out of an input yet (common on mobile). Fix any validation toast, then calculate again.

### Worked example

From [`fixtures/weekend-race.json`](fixtures/weekend-race.json): enter start **`13:08:01.491`**, reference elapsed **`02:23.450`** on lane **3** (reference), lane **5** gap **`+0:02.340`** (2.340 s behind ref), other lanes **Empty** → **Calculate** → lane **3** CrewTimer timestamp **`13:10:24.941`** (elapsed `02:23.450`); lane **5** **`13:10:27.281`** (elapsed `02:25.790`).

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
| `src/app/` | State, debounced persistence, form sync, app bootstrap, clipboard |
| `src/ui/` | Event binding, render helpers, partial DOM patches, components, focus/toast |
| `e2e/` | Desktop + mobile race flows, fixture regression, copy styling, gap sign toggle |

**189 unit tests.** Coverage thresholds (via `vite.config.ts`) apply to `src/lib/`, `src/app/`, and `src/ui/` — currently ~95% statements / ~98% lines. `bind-events.ts` has dedicated unit tests via `src/test/bind-app.ts`; E2E exercises the full wired app.

**Local E2E note:** Mobile Safari tests may skip on macOS 26+ when Playwright WebKit cannot reach the preview server. **CI on Ubuntu is the source of truth** for mobile E2E (see PR template). Desktop + fixture regression run locally via `npm run test:e2e`.

A **build label** (`v1.0.0 · YYYY-MM-DD`) appears at the bottom of the app after each deploy so you can confirm your phone picked up the latest PWA.

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

[`fixtures/weekend-race.json`](fixtures/weekend-race.json) has sample input and expected outputs for regression testing. `e2e/fixture.spec.ts` loads this file in CI to guard the core conversion contract.

## Notes

- **Gap from reference** is not CrewTimer's "Delta Time" (total elapsed).
- **Next race** clears all data including the localStorage draft.
- **Clear judge data** keeps the start timestamp and event label.
- **Stale drafts** from a previous calendar day prompt start-time reconfirmation (uses local date, not UTC).
- **Persistence** is debounced (~400 ms) during typing; pending writes flush on tab close (`beforeunload` / `pagehide`).
- Midnight rollover is handled internally but not emphasized in the UI.

This app is an arithmetic and data-entry aid. It does not replace the official timing record.
