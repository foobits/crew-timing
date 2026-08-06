# Testing

## Overview

| Layer | Tool | Location | Count (approx.) |
|-------|------|----------|-----------------|
| Unit | Vitest + happy-dom | `src/**/*.test.ts` | 197 |
| E2E | Playwright | `e2e/*.spec.ts` | 12 |
| Fixture contract | Playwright | `e2e/fixture.spec.ts` | 1 scenario |

CI runs **`npm run test:coverage`** then **`npm run test:e2e`** before every deploy.

## Unit tests

### Running

```bash
npm run test              # single run
npm run test:watch        # watch mode
npm run test:coverage     # with v8 coverage gates
```

### Coverage policy

Configured in `vite.config.ts`:

- **Includes:** `src/lib/`, `src/app/`, `src/ui/`
- **Thresholds:** ~85% statements/lines/functions, ~80% branches (see config for exact values)
- **Excludes:** `main.ts`, `render-app.ts`, test harness files

### Environment

- Default Vitest environment: `node` (pure `lib/` tests).
- DOM tests use `// @vitest-environment happy-dom` at file top.
- `src/test-setup.ts` — global mocks (e.g. `localStorage`).

### Key test patterns

**Pure domain** — `lib/race-state.test.ts`, `lib/time.test.ts`, `lib/form-commit.test.ts`:

- No DOM; fast; exhaustive edge cases for parsing and computation.

**App layer** — `app/form-sync.test.ts`, `app/persist-scheduler.test.ts`, `app/create-app.test.ts`:

- Persistence timing, init, debounce flush.

**UI interaction** — `ui/bind-events.test.ts` via `src/test/bind-app.ts`:

- Mounts real event bindings against `#app`.
- Mocks `clipboard.copyText` where needed.
- Asserts state + `renderNow` / `scheduleRender` calls.

**Patch granularity** — `ui/patch-dom.test.ts`:

- Scoped renders do not replace unrelated sections.

### Shared fixtures

`src/test/fixtures.ts` → `sampleAppState()` with sensible default race (8 lanes, lane 2 gap 2.511 s, etc.).

## E2E tests

### Running

```bash
npm run test:e2e        # all projects
npm run test:desktop    # Chromium only
npm run test:mobile     # WebKit iPhone 13 only
```

E2E builds production output and serves via `vite preview` on port **4173** (see `playwright.config.ts`).

### Projects

| Project | Browser | Specs |
|---------|---------|-------|
| `desktop-chrome` | Desktop Chrome | `desktop.spec.ts`, `fixture.spec.ts` |
| `mobile-safari` | iPhone 13 WebKit | `mobile.spec.ts` |

### Mobile CI vs local

- **CI (Ubuntu):** WebKit mobile tests run and are authoritative.
- **Local macOS 26+:** WebKit may fail to reach preview server — `webkit-probe.ts` skips mobile specs with an explicit message.
- PR template expects **12/12 E2E** green on GitHub Actions before merge.

### Helpers (`e2e/helpers.ts`)

| Helper | Purpose |
|--------|---------|
| `gotoApp` | Navigate to `/`, wait for `#start-ts` |
| `fillTimeInput` | Type digits + blur (commits) |
| `setInputWithoutCommit` | Set value + input event only (mobile path) |
| `calculate` | Tap Calculate, scroll to results |
| `copyLaneTimestamp` / `unmarkLaneCopy` | Copy checklist flows |
| `expectLaneCopied` / `expectLaneNotCopied` | Green card assertions |

### What E2E catches that unit tests miss

- Full wiring: Calculate commits unblurred mobile inputs.
- Clipboard + `.copied` styling in real browser.
- Gap ± first tap with focused input (pointerdown path).
- Production build + service worker disabled in test profile.

## Fixture regression

[`fixtures/weekend-race.json`](../fixtures/weekend-race.json):

- Input: start, reference, lane gaps.
- Expected: per-lane finish timestamps and elapsed strings.

Any change to `computeRace` or formatting should update this file and re-run `npm run test:e2e`.

## Adding tests for a new feature

1. **Domain change** → unit tests in `lib/` first.
2. **UI behavior** → `bind-events.test.ts` or render test.
3. **Mobile-specific** → `e2e/mobile.spec.ts`.
4. **Output contract** → extend fixture JSON + `fixture.spec.ts`.

## Related docs

- [Deployment & versioning](deployment-and-versioning.md) — CI pipeline
- [Copied lane feedback](copied-lane-feedback.md) — checklist test scenarios
