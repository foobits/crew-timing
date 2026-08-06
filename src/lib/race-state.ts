import {
  addDurationToTimestamp,
  elapsedBetweenTimestamps,
  formatElapsed,
  formatGap,
  formatTimestamp,
  todayDateString,
  type Milliseconds,
  type SignedMilliseconds,
} from "./time";
import { parsePersistedRace, serializePersistedRace } from "./persist-race";

export type LaneStatus = "active" | "empty";

export interface LaneDraft {
  lane: number;
  status: LaneStatus;
  gapMs: Milliseconds | null;
  gapNegative: boolean;
}

export interface RaceDraft {
  eventLabel: string;
  startTimestampMs: Milliseconds | null;
  startDate: string;
  startConfirmed: boolean;
  referenceLane: number;
  referenceElapsedMs: Milliseconds | null;
  lanes: LaneDraft[];
  updatedAt: string;
}

export interface LaneResult {
  lane: number;
  elapsedMs: Milliseconds;
  finishTimestampMs: Milliseconds;
  dayOffset: number;
  finishFormatted: string;
  elapsedFormatted: string;
  place: number;
  tied: boolean;
}

export interface ComputedRace {
  valid: boolean;
  errors: string[];
  results: LaneResult[];
}

const STORAGE_KEY = "crew-timing-race-draft";
export const MIN_LANE_COUNT = 1;
export const DEFAULT_LANE_COUNT = 8;

export function createEmptyRace(): RaceDraft {
  return {
    eventLabel: "",
    startTimestampMs: null,
    startDate: todayDateString(),
    startConfirmed: true,
    referenceLane: 1,
    referenceElapsedMs: null,
    lanes: createDefaultLanes(1, DEFAULT_LANE_COUNT),
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultLanes(
  referenceLane: number,
  count: number = DEFAULT_LANE_COUNT,
): LaneDraft[] {
  const laneCount = Math.max(MIN_LANE_COUNT, count);
  return Array.from({ length: laneCount }, (_, index) => {
    const lane = index + 1;
    const isRef = lane === referenceLane;
    return {
      lane,
      status: "active" as LaneStatus,
      gapMs: isRef ? 0 : null,
      gapNegative: false,
    };
  });
}

export function addLane(race: RaceDraft): RaceDraft {
  const newLane = race.lanes.length + 1;
  return enforceInvariants(
    touchRace({
      ...race,
      lanes: [
        ...race.lanes,
        {
          lane: newLane,
          status: "active",
          gapMs: null,
          gapNegative: false,
        },
      ],
    }),
  );
}

export function removeLane(race: RaceDraft): RaceDraft {
  if (race.lanes.length <= MIN_LANE_COUNT) {
    return race;
  }
  const removedLane = race.lanes.length;
  let referenceLane = race.referenceLane;
  if (referenceLane === removedLane) {
    referenceLane = 1;
  }
  return enforceInvariants(
    touchRace({
      ...race,
      referenceLane,
      lanes: race.lanes.slice(0, -1),
    }),
  );
}

export function wouldRemoveReferenceLaneWithJudgeData(race: RaceDraft): boolean {
  if (race.lanes.length <= MIN_LANE_COUNT) {
    return false;
  }
  const removedLane = race.lanes.length;
  if (race.referenceLane !== removedLane) {
    return false;
  }
  return (
    race.referenceElapsedMs !== null ||
    race.lanes.some((lane) => lane.lane !== race.referenceLane && lane.gapMs !== null)
  );
}

export function removeLaneClearingJudgeData(race: RaceDraft): RaceDraft {
  if (race.lanes.length <= MIN_LANE_COUNT) {
    return race;
  }
  const withoutLastLane = touchRace({
    ...race,
    referenceLane: 1,
    lanes: race.lanes.slice(0, -1),
  });
  return clearJudgeData(withoutLastLane);
}

export function touchRace(race: RaceDraft): RaceDraft {
  return { ...race, updatedAt: new Date().toISOString() };
}

function toSigned(ms: Milliseconds, negative: boolean): SignedMilliseconds {
  return { ms, negative };
}

function subtractSigned(a: SignedMilliseconds, b: SignedMilliseconds): SignedMilliseconds {
  const aVal = a.negative ? -a.ms : a.ms;
  const bVal = b.negative ? -b.ms : b.ms;
  const result = aVal - bVal;
  if (result < 0) {
    return { ms: -result, negative: true };
  }
  return { ms: result, negative: false };
}

export function setReferenceLane(
  race: RaceDraft,
  newReferenceLane: number,
  clearIfMissing = false,
): RaceDraft {
  const oldRef = race.referenceLane;
  if (oldRef === newReferenceLane) {
    return enforceInvariants({ ...race, referenceLane: newReferenceLane });
  }

  const newRefLane = race.lanes.find((l) => l.lane === newReferenceLane);
  const hasEnteredGaps = race.lanes.some(
    (l) => l.lane !== oldRef && l.status === "active" && l.gapMs !== null,
  );

  let lanes = race.lanes.map((lane) => ({ ...lane }));
  let referenceElapsedMs = race.referenceElapsedMs;

  if (
    hasEnteredGaps &&
    newRefLane &&
    newRefLane.status === "active" &&
    newRefLane.gapMs !== null &&
    !clearIfMissing
  ) {
    const newRefOldSigned = toSigned(newRefLane.gapMs, newRefLane.gapNegative);
    if (referenceElapsedMs !== null) {
      const gapVal = newRefOldSigned.negative ? -newRefOldSigned.ms : newRefOldSigned.ms;
      referenceElapsedMs = referenceElapsedMs + gapVal;
    }
    lanes = lanes.map((lane) => {
      if (lane.lane === newReferenceLane) {
        return { ...lane, status: "active", gapMs: 0, gapNegative: false };
      }
      if (lane.status !== "active" || lane.gapMs === null) {
        return lane;
      }
      const rebased = subtractSigned(
        toSigned(lane.gapMs, lane.gapNegative),
        newRefOldSigned,
      );
      return {
        ...lane,
        gapMs: rebased.ms,
        gapNegative: rebased.negative,
      };
    });
  } else {
    lanes = createDefaultLanes(newReferenceLane, race.lanes.length);
  }

  return enforceInvariants(
    touchRace({
      ...race,
      referenceLane: newReferenceLane,
      referenceElapsedMs,
      lanes,
    }),
  );
}

export function enforceInvariants(race: RaceDraft): RaceDraft {
  const lanes = race.lanes.map((lane) => {
    if (lane.lane === race.referenceLane) {
      return {
        ...lane,
        status: "active" as LaneStatus,
        gapMs: 0,
        gapNegative: false,
      };
    }
    return lane;
  });
  return { ...race, lanes };
}

export function computeRace(race: RaceDraft): ComputedRace {
  const errors: string[] = [];

  if (race.startTimestampMs === null) {
    errors.push("Enter a race start timestamp.");
  }
  if (!race.startConfirmed) {
    errors.push("Confirm the restored start timestamp before calculating.");
  }
  if (race.referenceElapsedMs === null) {
    errors.push("Enter reference elapsed time.");
  }

  if (errors.length > 0 || race.startTimestampMs === null || race.referenceElapsedMs === null) {
    return { valid: false, errors, results: [] };
  }

  const results: LaneResult[] = [];

  for (const lane of race.lanes) {
    if (lane.status !== "active") continue;

    if (lane.lane === race.referenceLane) {
      const finish = addDurationToTimestamp(race.startTimestampMs, race.referenceElapsedMs);
      results.push({
        lane: lane.lane,
        elapsedMs: race.referenceElapsedMs,
        finishTimestampMs: finish.ms,
        dayOffset: finish.dayOffset,
        finishFormatted: formatTimestamp(finish.ms),
        elapsedFormatted: formatElapsed(race.referenceElapsedMs),
        place: 0,
        tied: false,
      });
      continue;
    }

    if (lane.gapMs === null) continue;

    const gapVal = lane.gapNegative ? -lane.gapMs : lane.gapMs;
    const elapsedMs = race.referenceElapsedMs + gapVal;

    if (elapsedMs < 0) {
      errors.push(`Lane ${lane.lane} elapsed would be negative.`);
      continue;
    }

    const finish = addDurationToTimestamp(race.startTimestampMs, elapsedMs);
    const checkElapsed = elapsedBetweenTimestamps(
      race.startTimestampMs,
      finish.ms,
      finish.dayOffset,
    );
    if (checkElapsed !== elapsedMs) {
      errors.push(`Lane ${lane.lane} timestamp mismatch.`);
    }

    results.push({
      lane: lane.lane,
      elapsedMs,
      finishTimestampMs: finish.ms,
      dayOffset: finish.dayOffset,
      finishFormatted: formatTimestamp(finish.ms),
      elapsedFormatted: formatElapsed(elapsedMs),
      place: 0,
      tied: false,
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors, results: [] };
  }

  const sorted = [...results].sort((a, b) => {
    if (a.elapsedMs !== b.elapsedMs) return a.elapsedMs - b.elapsedMs;
    return a.lane - b.lane;
  });

  let place = 0;
  let prevElapsed: Milliseconds | null = null;
  const withPlaces = sorted.map((result, index) => {
    const tied = prevElapsed !== null && result.elapsedMs === prevElapsed;
    if (!tied) {
      place = index + 1;
    }
    prevElapsed = result.elapsedMs;
    const nextTied =
      index + 1 < sorted.length && sorted[index + 1]!.elapsedMs === result.elapsedMs;
    return { ...result, place, tied: tied || nextTied };
  });

  return {
    valid: withPlaces.length > 0,
    errors: withPlaces.length > 0 ? [] : ["No active lanes with data."],
    results: withPlaces,
  };
}

export function hasRaceData(race: RaceDraft): boolean {
  return (
    race.eventLabel.trim() !== "" ||
    race.startTimestampMs !== null ||
    race.referenceElapsedMs !== null ||
    race.lanes.some((l) => l.lane !== race.referenceLane && l.status === "empty") ||
    race.lanes.some((l) => l.lane !== race.referenceLane && l.gapMs !== null)
  );
}

export function nextRace(): RaceDraft {
  clearPersistedRace();
  return createEmptyRace();
}

export function clearJudgeData(race: RaceDraft): RaceDraft {
  return touchRace(
    enforceInvariants({
      ...race,
      referenceElapsedMs: null,
      lanes: race.lanes.map((lane) => ({
        lane: lane.lane,
        status: "active" as LaneStatus,
        gapMs: lane.lane === race.referenceLane ? 0 : null,
        gapNegative: false,
      })),
    }),
  );
}

export function persistRace(race: RaceDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializePersistedRace(race));
  } catch {
    // Storage unavailable.
  }
}

export function loadPersistedRace(): RaceDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const draft = parsePersistedRace(JSON.parse(raw));
    if (!draft) return null;
    return enforceInvariants(draft);
  } catch {
    return null;
  }
}

export function clearPersistedRace(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function isStaleDraft(race: RaceDraft): boolean {
  return race.startDate !== todayDateString();
}

export function formatCopyAll(race: RaceDraft, results: LaneResult[]): string {
  const lines: string[] = [];
  if (race.eventLabel.trim()) {
    lines.push(race.eventLabel.trim());
  }
  if (race.startTimestampMs !== null) {
    lines.push(`Start: ${formatTimestamp(race.startTimestampMs)}`);
  }
  lines.push("");
  for (const result of results) {
    lines.push(
      `Lane ${result.lane} — ${result.finishFormatted} — elapsed ${result.elapsedFormatted}`,
    );
  }
  return lines.join("\n");
}

export function formatGapDisplay(lane: LaneDraft): string {
  if (lane.gapMs === null) return "";
  return formatGap({ ms: lane.gapMs, negative: lane.gapNegative });
}

export { formatElapsed, formatGap, formatTimestamp };
