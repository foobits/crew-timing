# Crew Timing Calculator

Mobile-first PWA that converts finish-judge data (one reference elapsed time + per-lane gaps) into **CrewTimer-ready chronological timestamps** (`HH:MM:SS.SSS`).

## Quick start

```bash
npm install
npm run dev
```

Open the local URL on your phone (same Wi‑Fi) or use production deployment below.

## Race-day workflow

1. Copy the **race start timestamp** from CrewTimer for this race.
2. Enter **reference elapsed** time and select the **reference lane**.
3. Enter each active lane's **gap from reference** (e.g. `+0:02.34`).
4. Tap **Copy timestamp** on each result and paste into CrewTimer's **Timestamp** correction field.
5. Confirm CrewTimer's **Delta Time** matches the app's calculated elapsed cross-check.
6. Tap **Next race** when done.

## Install on iPhone (recommended)

1. Deploy to GitHub Pages (HTTPS required).
2. Open the site in Safari.
3. Share → **Add to Home Screen**.
4. Use the home-screen icon at the finish line (works offline after first load).

## Commands

```bash
npm run test      # unit tests
npm run build     # production build → dist/
npm run preview   # preview production build
```

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Set **Settings → Pages → Source** to **GitHub Actions** or deploy the `dist/` folder from the `gh-pages` branch.
3. For project sites, set `base` in `vite.config.ts` to your repo path (e.g. `/crew-timing/`).

Example GitHub Action (`.github/workflows/deploy.yml`):

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci && npm test && npm run build
      - uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: dist
```

## CrewTimer verification checklist (required before first regatta)

Complete these steps in a **test event** before relying on this app:

- [ ] Paste a calculated timestamp (`HH:MM:SS.SSS`) into CrewTimer's **Timestamp** field — it is accepted.
- [ ] CrewTimer's **Delta Time** matches the app's **Calculated elapsed** for the same lane.
- [ ] Millisecond precision is preserved (three decimal places).
- [ ] **Stopwatch Data Entry** checkbox remains **unchecked** unless CrewTimer docs say otherwise.
- [ ] Pasting does not add extra spaces or formatting issues.
- [ ] Offline: install PWA, enable airplane mode, reopen from home screen — app loads and draft persists.

## QA fixture

See [`fixtures/weekend-race.json`](fixtures/weekend-race.json) for sample input and expected outputs. Replace with your real regatta data for regression testing.

## Notes

- **Gap from reference** — not CrewTimer's "Delta Time" (which is total elapsed).
- **Next race** clears all data including localStorage draft.
- **Clear judge data** keeps start timestamp and event label.
- Midnight rollover is handled internally but not emphasized in the UI for v1.

This app is an arithmetic and data-entry aid. It does not replace the official timing record.
