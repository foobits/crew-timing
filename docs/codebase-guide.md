# Codebase guide

## Repository layout

```
crew-timing/
├── docs/                 Engineering documentation (this folder)
├── e2e/                  Playwright end-to-end specs
├── fixtures/             Sample race JSON for regression
├── src/
│   ├── main.ts           Entry point
│   ├── styles.css        Global styles
│   ├── lib/              Pure domain logic
│   ├── app/              Application layer
│   ├── ui/               Templates, patches, events
│   └── test/             Shared test fixtures & harnesses
├── index.html
├── vite.config.ts        Build, test, coverage config
├── playwright.config.ts
└── .github/workflows/    CI deploy
```

## `src/lib/` — domain

| File | Responsibility |
|------|----------------|
| `time.ts` | Parse/format timestamps, elapsed, gaps; typing formatters |
| `race-state.ts` | `RaceDraft`, `computeRace`, lane CRUD, persistence entry points |
| `persist-race.ts` | Versioned localStorage format, validation, legacy migration |
| `form-commit.ts` | Apply raw field strings → `RaceDraft` (used by form-sync) |
| `ui-helpers.ts` | `escapeHtml`, `sortResults`, gap display helpers |

**Start here** when changing validation rules or finish-time math.

## `src/app/` — application

| File | Responsibility |
|------|----------------|
| `create-app.ts` | State container, render scheduling, wires bind-events |
| `types.ts` | `AppState`, `ConfirmAction`, `ResultsSort`, `calculatedResults` |
| `state.ts` | Initial state, load persisted draft, undo snapshot |
| `form-sync.ts` | `applyStartTimestamp`, `applyLaneGap`, `commitAllFormFields` |
| `persist-scheduler.ts` | Debounced / immediate `persistRace` |
| `clipboard.ts` | Copy-to-clipboard (sync textarea first for iOS) |
| `render-scope.ts` | `RenderScope` union, merge priorities |
| `build-info.ts` / `resolve-app-version.ts` | Footer version label |
| `constants.ts` | Place labels, default format strings |

## `src/ui/` — presentation

| File | Responsibility |
|------|----------------|
| `render-context.ts` | Race start, event label, collapse UI |
| `render-lanes.ts` | Lane grid, gap inputs, ± sign, Calculate button |
| `render-results.ts` | Result cards, sort toggle, copy buttons |
| `render-dialog.ts` | Confirm dialogs, footer actions, build meta |
| `render-app.ts` | Legacy/alternate full render (superseded by patch-dom full path) |
| `patch-dom.ts` | `applyRenderScope`, partial patches, `getComputedRace` (snapshot) |
| `bind-events.ts` | All user interaction handlers |
| `focus.ts` | Preserve/restore focus across DOM replacements |
| `toast.ts` | Ephemeral status messages |
| `components/` | `renderButton`, `renderTextField`, `renderToggleGroup`, etc. |

### UI components pattern

Components return **HTML strings**, not DOM nodes. Attributes and variants live in `components/attrs.ts`, `button.ts`, `field.ts`.

Example consumers: `render-lanes.ts`, `render-results.ts`, `render-dialog.ts`.

## `src/test/`

| File | Role |
|------|------|
| `fixtures.ts` | `sampleAppState()`, shared race fixtures for unit tests |
| `bind-app.ts` | Mount app with `bindEventsOnce` for interaction tests |

## `e2e/`

| File | Role |
|------|------|
| `helpers.ts` | `gotoApp`, `fillRaceContext`, `calculate`, copy helpers |
| `desktop.spec.ts` | Desktop flows + copied-lane checklist |
| `mobile.spec.ts` | Mobile-specific input/commit behavior |
| `fixture.spec.ts` | Regression against `fixtures/weekend-race.json` |
| `webkit-probe.ts` | Skip mobile E2E when local WebKit cannot reach server |

## Common change patterns

### Add a new form field

1. Extend `RaceDraft` if persisted (`lib/race-state.ts`).
2. Bump `PERSISTENCE_VERSION` and add migration in `lib/persist-race.ts` if the stored shape changes.
3. Add apply function in `lib/form-commit.ts`.
4. Wire `form-sync.ts` + input handler in `bind-events.ts`.
5. Render in appropriate `render-*.ts`.
6. Include in `commitAllFormFields` if needed on Calculate.
7. Unit tests in `form-commit.test.ts`, `persist-race.test.ts`, `bind-events.test.ts`; E2E if mobile commit matters.

### Add a new button action

1. Render with `data-action="your-action"` via `renderButton`.
2. Handle in `bind-events.ts` → `handleAction` or body listener.
3. Choose `RenderScope` for DOM update.

### Change results output

1. `computeRace` in `lib/race-state.ts`.
2. `render-results.ts` for display.
3. `fixtures/weekend-race.json` + `e2e/fixture.spec.ts` if outputs change.

## Files intentionally excluded from coverage

See `vite.config.ts` → `coverage.exclude`:

- `main.ts` — bootstrap only
- `render-app.ts` — unused full-render path
- `test/**`, `*.test.ts`, `test-setup.ts`

## Related docs

- [Architecture](architecture.md) — render scopes and event model
- [Testing](testing.md) — how to run and extend tests
