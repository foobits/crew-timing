import { touchRace, type RaceDraft } from "./race-state";
import { isParseFailure, parseElapsed, parseGap, parseTimestamp, todayDateString } from "./time";

export type ApplyFieldResult =
  | { ok: true; race: RaceDraft }
  | { ok: false; race: RaceDraft; error: string };

export function isFieldApplyFailure(
  result: ApplyFieldResult,
): result is { ok: false; race: RaceDraft; error: string } {
  return !result.ok;
}

export interface PendingFormFields {
  startTimestamp?: string;
  referenceElapsed?: string;
  laneGaps?: Array<{ lane: number; value: string; readOnly?: boolean }>;
}

export function applyStartTimestampToRace(race: RaceDraft, value: string): ApplyFieldResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      ok: true,
      race: touchRace({
        ...race,
        startTimestampMs: null,
        startDate: todayDateString(),
        startConfirmed: true,
      }),
    };
  }

  const parsed = parseTimestamp(trimmed);
  if (isParseFailure(parsed)) {
    return { ok: false, race, error: parsed.error };
  }

  return {
    ok: true,
    race: touchRace({
      ...race,
      startTimestampMs: parsed.value,
      startDate: todayDateString(),
      startConfirmed: true,
    }),
  };
}

export function applyReferenceElapsedToRace(race: RaceDraft, value: string): ApplyFieldResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      ok: true,
      race: touchRace({ ...race, referenceElapsedMs: null }),
    };
  }

  const parsed = parseElapsed(trimmed);
  if (isParseFailure(parsed)) {
    return { ok: false, race, error: parsed.error };
  }

  return {
    ok: true,
    race: touchRace({ ...race, referenceElapsedMs: parsed.value }),
  };
}

export function applyLaneGapToRace(
  race: RaceDraft,
  laneNum: number,
  value: string,
): ApplyFieldResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      ok: true,
      race: touchRace({
        ...race,
        lanes: race.lanes.map((lane) =>
          lane.lane === laneNum ? { ...lane, gapMs: null, gapNegative: false } : lane,
        ),
      }),
    };
  }

  const lane = race.lanes.find((entry) => entry.lane === laneNum);
  const hasExplicitSign = /^[+-]/.test(trimmed);

  if (hasExplicitSign) {
    const parsed = parseGap(trimmed);
    if (isParseFailure(parsed) || !parsed.signed) {
      return { ok: false, race, error: isParseFailure(parsed) ? parsed.error : "Invalid gap format." };
    }

    return {
      ok: true,
      race: touchRace({
        ...race,
        lanes: race.lanes.map((entry) =>
          entry.lane === laneNum
            ? {
                ...entry,
                gapMs: parsed.signed.ms,
                gapNegative: parsed.signed.negative,
                status: "active",
              }
            : entry,
        ),
      }),
    };
  }

  const parsed = parseElapsed(trimmed);
  if (isParseFailure(parsed)) {
    return { ok: false, race, error: parsed.error };
  }

  return {
    ok: true,
    race: touchRace({
      ...race,
      lanes: race.lanes.map((entry) =>
        entry.lane === laneNum
          ? {
              ...entry,
              gapMs: parsed.value,
              gapNegative: lane?.gapNegative ?? false,
              status: "active",
            }
          : entry,
      ),
    }),
  };
}

/** Merge live DOM values into race state (mobile often skips change until blur). */
export function commitPendingFormFields(
  race: RaceDraft,
  fields: PendingFormFields,
): { race: RaceDraft; errors: string[] } {
  let nextRace = race;
  const errors: string[] = [];

  if (fields.startTimestamp !== undefined) {
    const result = applyStartTimestampToRace(nextRace, fields.startTimestamp);
    nextRace = result.race;
    if (isFieldApplyFailure(result)) errors.push(result.error);
  }

  if (fields.referenceElapsed !== undefined) {
    const result = applyReferenceElapsedToRace(nextRace, fields.referenceElapsed);
    nextRace = result.race;
    if (isFieldApplyFailure(result)) errors.push(result.error);
  }

  for (const gap of fields.laneGaps ?? []) {
    if (gap.readOnly) continue;
    const result = applyLaneGapToRace(nextRace, gap.lane, gap.value);
    nextRace = result.race;
    if (isFieldApplyFailure(result)) errors.push(result.error);
  }

  return { race: nextRace, errors };
}
