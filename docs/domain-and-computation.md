# Domain & computation

## Race data model

### `RaceDraft`

The authoritative in-memory (and persisted) representation of one heat:

```typescript
interface RaceDraft {
  eventLabel: string;
  startTimestampMs: number | null;   // ms since midnight, race clock
  startDate: string;                 // YYYY-MM-DD local
  startConfirmed: boolean;           // false when stale draft restored
  referenceLane: number;
  referenceElapsedMs: number | null;
  lanes: LaneDraft[];
  updatedAt: string;                 // ISO — bumps on each touchRace
}
```

### `LaneDraft`

```typescript
interface LaneDraft {
  lane: number;
  status: "active" | "empty";
  gapMs: number | null;              // magnitude only; sign in gapNegative
  gapNegative: boolean;              // true = ahead of reference
}
```

Reference lane: gap is always `0`; input is read-only and mirrors reference elapsed.

## Parsing (`lib/time.ts`)

All user time input flows through parsers that return `{ ok: true, value }` or `{ ok: false, error }`.

| Parser | Accepts | Used for |
|--------|---------|----------|
| `parseTimestamp` | `HH:MM:SS[.SSS]` | Race start |
| `parseElapsed` | `MM:SS.SSS`, decimal seconds | Reference elapsed |
| `parseGap` | Signed elapsed or decimal | Lane gaps |

While typing, formatters insert punctuation (`formatTimestampWhileTyping`, `formatElapsedWhileTyping`, `formatGapWhileTyping`) so mobile decimal keypads work without manual colons.

**Gap sign semantics:**

- UI ± toggle sets `gapNegative`.
- Leading `-` in input overrides on commit (`form-commit.ts`).
- Unsigned value keeps toggle state.

See root README [field input formats](../README.md#field-input-formats) for operator examples.

## Form commit (`lib/form-commit.ts`)

Bridges raw input strings → `RaceDraft` updates:

- `applyStartTimestampToRace`
- `applyReferenceElapsedToRace`
- `applyLaneGapToRace`

`commitPendingFormFields` merges live DOM values — critical on mobile where `change` may not fire before Calculate.

## Computation (`computeRace`)

Given a valid `RaceDraft`, produces `ComputedRace`:

```typescript
interface ComputedRace {
  valid: boolean;
  errors: string[];
  results: LaneResult[];
}
```

### Algorithm (conceptual)

For each **active** lane with a gap:

1. Reference finish offset = `referenceElapsedMs`.
2. Lane offset = reference ± `gapMs` (sign from `gapNegative`).
3. Finish timestamp = `startTimestampMs + offset` (with day rollover via `addDurationToTimestamp`).
4. Sort by finish time for place; detect ties.

Empty lanes and lanes without gaps are skipped. Validation errors (missing start, missing reference elapsed, etc.) populate `errors` and set `valid: false`.

### Output fields per lane

| Field | Use |
|-------|-----|
| `finishFormatted` | Paste into CrewTimer Timestamp |
| `elapsedFormatted` | Cross-check vs CrewTimer Delta Time |
| `place` / `tied` | Display only |

## Reference lane changes

`setReferenceLane` rebases all existing gaps when the operator picks a new reference. If gaps would be invalidated, a confirmation dialog runs first (`confirmAction: "changeRef"`).

## Persistence

- `persistRace` / `loadPersistedRace` — JSON in `localStorage`.
- Invalid or corrupt drafts are rejected; app starts fresh.
- `isStaleDraft` compares `startDate` to local today — forces reconfirmation.

## Regression fixture

[`fixtures/weekend-race.json`](../fixtures/weekend-race.json) encodes a full heat with expected timestamps. `e2e/fixture.spec.ts` loads it in CI — **any change to computation must update the fixture or justify the delta**.

Example expected output:

- Reference lane 3 → finish `13:10:24.941`, elapsed `02:23.450`
- Lane 5 (+2.340 s behind) → finish `13:10:27.281`, elapsed `02:25.790`

## Related docs

- [Project overview](project-overview.md) — terminology
- [Testing](testing.md) — fixture E2E
