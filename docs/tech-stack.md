# Tech stack

## Summary

| Layer | Choice |
|-------|--------|
| Language | **TypeScript** (~5.9), `"module": ESNext`, strict typing |
| Runtime | **Node.js 22+** (CI and `package.json` `engines`) |
| Build | **Vite** 7 |
| UI | **Vanilla DOM** — no React/Vue/Svelte |
| Unit tests | **Vitest** 4 + **happy-dom** |
| E2E | **Playwright** (Desktop Chrome + iPhone 13 WebKit) |
| PWA | **vite-plugin-pwa** (Workbox service worker) |
| Hosting | **GitHub Pages** via GitHub Actions |
| Package manager | **npm** (`package-lock.json` committed) |

## Why TypeScript

- Parsing and time arithmetic are error-prone; types document `RaceDraft`, `LaneResult`, parse results.
- Refactors are safer across `lib/` → `app/` → `ui/` boundaries.
- Vitest and Playwright both have first-class TS support.

## Why no UI framework

The UI is form-heavy but structurally stable:

- Sections: context, lanes, results, footer, dialogs.
- Most interactions patch **one row or card**, not the whole tree.
- String templates + scoped `outerHTML` patches keep bundle size small and avoid virtual-DOM overhead on mobile.

Trade-off: no component reactivity — **you** wire state → render via `RenderScope`.

## Dependencies (runtime)

There are **no production npm dependencies**. The shipped app is static HTML/CSS/JS from `dist/`.

## Dev dependencies

| Package | Role |
|---------|------|
| `vite` | Dev server, production bundle |
| `vite-plugin-pwa` | Service worker, web manifest |
| `typescript` | Type-check (`tsc` in build) |
| `vitest` + `@vitest/coverage-v8` | Unit tests and coverage gates |
| `@playwright/test` | E2E against preview server |
| `happy-dom` | DOM environment for unit tests |

## Build pipeline (local)

```bash
npm run build   # tsc && vite build
```

- `tsc` — type-check only (no emit); Vite bundles TS.
- Vite `define` injects `__APP_VERSION__` and `__BUILD_DATE__` at build time.
- PWA plugin generates `sw.js` and precaches static assets.

## Browser targets

- **Primary:** Mobile Safari (iOS PWA).
- **Secondary:** Desktop Chrome for regatta HQ or testing.
- E2C WebKit on Ubuntu CI is the **source of truth** for mobile behavior.

## Conventions

- ES modules throughout (`"type": "module"` in `package.json`).
- CSS in a single `src/styles.css` — design tokens in `:root`.
- No CSS preprocessor.

## Related docs

- [Architecture](architecture.md) — how Vite app bootstraps
- [Deployment & versioning](deployment-and-versioning.md) — CI build env vars
