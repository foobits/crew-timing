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
3. Enter each active lane's **gap from reference** (decimal seconds like `2.511`, or judge-sheet format like `1:23.450`).
4. Tap **Calculate**, then **Copy timestamp** on each result and paste into CrewTimer's **Timestamp** field.
5. Confirm CrewTimer's **Delta Time** matches the app's calculated elapsed cross-check.
6. Tap **Next race** when done.

## Install on iPhone

1. Open the live site in Safari.
2. Share → **Add to Home Screen**.
3. Use the home-screen icon at the finish line (works offline after first load).

## Development

```bash
npm run dev            # local dev server
npm run build          # production build → dist/
npm run preview        # preview production build
npm run test           # unit tests (Vitest)
npm run test:coverage  # unit tests with coverage gate on src/lib/
npm run test:e2e       # Playwright (desktop Chrome + mobile Safari)
npm run test:all       # coverage + E2E (same as CI)
```

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
- Midnight rollover is handled internally but not emphasized in the UI.

This app is an arithmetic and data-entry aid. It does not replace the official timing record.
