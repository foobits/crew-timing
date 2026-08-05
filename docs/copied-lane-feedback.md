# Copied lane feedback (design)

**Status:** Implemented (see tests in `bind-events.test.ts`, `render-results.test.ts`, `e2e/desktop.spec.ts`).

Green styling on result cards helps finish-line operators track which CrewTimer timestamps they have already copied. This document specifies a **checklist + manual unmark** hybrid (options C + D from UX review).

## Goal

During a heat, operators copy several lane timestamps into CrewTimer. The app should answer:

> Which lanes have I already handled for **this** calculation?

Green is **progress**, not a momentary “copy succeeded” flash.

## Current behavior (shipped)

| Behavior | Today |
|----------|--------|
| Copy succeeds | Lane added to `copiedLanes`; card gets `.copied` (green background + border). |
| Copy fails | No green; toast asks to copy manually. |
| Multiple lanes | All copied lanes stay green at once. |
| Tap **Copy timestamp** again (green) | Unmark only — green clears; clipboard not written again. |
| **Calculate** | All copied marks cleared. |
| **Next race** / **Clear judge data** | All copied marks cleared. |
| Re-sort results | Copied marks preserved. |

## Target behavior (C + D hybrid)

Implemented as documented below. Historical spec retained for reference.

### Meaning of green

| State | Meaning |
|-------|---------|
| Green card | Operator copied this lane and treats it as done for the current results. |
| Normal card | Not copied yet, or operator cleared the mark. |

### Per-lane actions (D1 — toggle on Copy button)

| Action | Result |
|--------|--------|
| Tap **Copy timestamp** (lane not green) | Copy to clipboard; mark lane copied; turn green. |
| Tap **Copy timestamp** (lane already green) | **Unmark only** — remove green; do **not** write clipboard again. |
| Tap **Copy timestamp** again after unmark | Copy + green as usual. |

**Button label when green:** `Copied — tap to unmark` (or similar). Keeps D discoverable without a second control.

**Out of scope for v1 of this design:** separate ✓ button, long-press, card-body tap to unmark. Revisit if accidental unmarks show up in race-day use.

### Bulk reset (C)

Clear **all** copied marks when results may no longer match what was copied:

| Trigger | Clear all copied marks? |
|---------|-------------------------|
| **Calculate** | **Yes** — judge data was committed and results may have changed. |
| **Next race** | Yes (already today). |
| **Clear judge data** | Yes (already today). |
| Edit gap / reference without Calculate | No — marks still refer to last calculated results until operator recalculates. |

**Optional later:** only clear on Calculate when `commitAllFormFields` actually changes race data (skip clear on noop Calculate). Not required for first implementation.

**Optional later:** **Clear copied marks** link in results header if operators want a manual bulk reset without recalculating. Not in v1.

### Example flow

1. Copy lane 2 → green. Paste into CrewTimer.
2. Copy lane 5 → lanes 2 and 5 green (checklist).
3. Marked lane 5 by mistake → tap **Copy timestamp** on lane 5 again → green clears on lane 5 only.
4. Fix lane 3 gap → **Calculate** → all greens clear; new results shown.
5. Copy remaining lanes → greens accumulate again.
6. **Next race** → everything cleared with the rest of the draft.

## Visual design

Keep existing tokens:

- `--copied-bg`, `--success` border on `.result-card.copied`
- Toast on successful copy unchanged (`Copied HH:MM:SS.SSS`)

No auto-fade timer in v1 — checklist stays visible until unmark or bulk reset.

## State model

No schema change:

```ts
copiedLanes: Set<number>  // lane numbers marked copied for current results
```

**Set copied:** successful copy when lane ∉ set.

**Unset copied:** second tap on Copy when lane ∈ set.

**Clear all:** Calculate (new), Next race, Clear judge (existing).

Persist `copiedLanes` in app state only (not localStorage) — copied progress is ephemeral per session/heat, same as today.

## Implementation notes

| Area | Change |
|------|--------|
| `bind-events.ts` | `handleCopyLane`: if `copiedLanes.has(lane)`, remove and re-render; else copy + add. |
| `bind-events.ts` | `calculate` action: `copiedLanes: new Set()` in state update. |
| `render-results.ts` | Button label reflects copied state. |
| `README.md` | Race-day workflow + Notes reference this doc. |

## Tests to add when implementing

- Unit: second tap on Copy removes lane from `copiedLanes` without calling `copyText`.
- Unit: Calculate clears `copiedLanes`.
- E2E: copy two lanes → both green → unmark one → one green.
- E2E: copy lane → Calculate → card not green.

## Open questions

1. **Accidental unmark** — if common, switch to “card tap to unmark, button always copies” (D3).
2. **Copy-all** — should **Copy all** mark every lane green, or leave that button out of checklist semantics?
3. **Sort toggle** — copied state survives re-sort (today); keep that.
