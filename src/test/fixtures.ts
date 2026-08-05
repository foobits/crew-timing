import { createEmptyRace, touchRace } from "../lib/race-state";
import { createInitialState } from "../app/state";
import type { AppState } from "../app/types";

export function sampleAppState(overrides: Partial<AppState> = {}): AppState {
  const race = touchRace({
    ...createEmptyRace(),
    startTimestampMs: 47_281_491,
    startDate: "2026-08-04",
    startConfirmed: true,
    referenceLane: 3,
    referenceElapsedMs: 143_450,
    lanes: createEmptyRace().lanes.map((lane) => {
      if (lane.lane === 3) {
        return { ...lane, gapMs: 0, gapNegative: false, status: "active" as const };
      }
      if (lane.lane === 2) {
        return { ...lane, gapMs: 2_511, gapNegative: false, status: "active" as const };
      }
      return lane;
    }),
  });

  return {
    ...createInitialState(),
    race,
    ...overrides,
  };
}
