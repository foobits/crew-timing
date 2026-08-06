import {
  createEmptyRace,
  MIN_LANE_COUNT,
  type LaneDraft,
  type LaneStatus,
  type RaceDraft,
} from "./race-state";

export const PERSISTENCE_VERSION = 1;

interface PersistedRaceDraftV1 {
  version: 1;
  draft: RaceDraft;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableMs(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function isCalendarDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function parseLaneDraft(value: unknown, expectedLane: number): LaneDraft | null {
  if (!isRecord(value)) return null;
  if (value.lane !== expectedLane) return null;

  const status: LaneStatus | null =
    value.status === "active" || value.status === "empty" ? value.status : null;
  if (status === null) return null;
  if (!isNullableMs(value.gapMs)) return null;
  if (typeof value.gapNegative !== "boolean") return null;

  return {
    lane: expectedLane,
    status,
    gapMs: value.gapMs,
    gapNegative: value.gapNegative,
  };
}

function parseLanes(value: unknown): LaneDraft[] | null {
  if (!Array.isArray(value) || value.length < MIN_LANE_COUNT) return null;

  const lanes: LaneDraft[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const lane = parseLaneDraft(value[index], index + 1);
    if (!lane) return null;
    lanes.push(lane);
  }
  return lanes;
}

/** Validate a race draft object (legacy or migrated). Returns null when invalid. */
export function validateRaceDraft(value: unknown): RaceDraft | null {
  if (!isRecord(value)) return null;

  if (typeof value.eventLabel !== "string") return null;
  if (!isNullableMs(value.startTimestampMs)) return null;
  if (!isCalendarDate(value.startDate)) return null;
  if (typeof value.startConfirmed !== "boolean") return null;
  if (
    typeof value.referenceLane !== "number" ||
    !Number.isInteger(value.referenceLane) ||
    value.referenceLane < 1
  ) {
    return null;
  }
  if (!isNullableMs(value.referenceElapsedMs)) return null;

  const lanes = parseLanes(value.lanes);
  if (!lanes) return null;
  if (value.referenceLane > lanes.length) return null;

  const updatedAt = isIsoTimestamp(value.updatedAt)
    ? value.updatedAt
    : new Date().toISOString();

  return {
    eventLabel: value.eventLabel,
    startTimestampMs: value.startTimestampMs,
    startDate: value.startDate,
    startConfirmed: value.startConfirmed,
    referenceLane: value.referenceLane,
    referenceElapsedMs: value.referenceElapsedMs,
    lanes,
    updatedAt,
  };
}

function readString(
  raw: Record<string, unknown>,
  key: string,
  fallback: string,
): string | null {
  if (!(key in raw)) return fallback;
  return typeof raw[key] === "string" ? (raw[key] as string) : null;
}

function readBoolean(
  raw: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean | null {
  if (!(key in raw)) return fallback;
  return typeof raw[key] === "boolean" ? (raw[key] as boolean) : null;
}

function readNullableMs(
  raw: Record<string, unknown>,
  key: string,
  fallback: number | null,
): number | null | undefined {
  if (!(key in raw)) return fallback;
  return isNullableMs(raw[key]) ? (raw[key] as number | null) : undefined;
}

function readReferenceLane(
  raw: Record<string, unknown>,
  laneCount: number,
  fallback: number,
): number | null | undefined {
  if (!("referenceLane" in raw)) return fallback;
  const lane = raw.referenceLane;
  if (typeof lane !== "number" || !Number.isInteger(lane) || lane < 1 || lane > laneCount) {
    return undefined;
  }
  return lane;
}

function readIsoTimestamp(
  raw: Record<string, unknown>,
  key: string,
  fallback: string,
): string | undefined {
  if (!(key in raw)) return fallback;
  return isIsoTimestamp(raw[key]) ? (raw[key] as string) : undefined;
}

function migrateLegacyDraft(raw: Record<string, unknown>): RaceDraft | null {
  const defaults = createEmptyRace();
  const legacyLanes = parseLanes(raw.lanes);
  if (!legacyLanes) return null;

  const eventLabel = readString(raw, "eventLabel", defaults.eventLabel);
  const startTimestampMs = readNullableMs(raw, "startTimestampMs", defaults.startTimestampMs);
  const startDate = readString(raw, "startDate", defaults.startDate);
  const startConfirmed = readBoolean(raw, "startConfirmed", defaults.startConfirmed);
  const referenceLane = readReferenceLane(raw, legacyLanes.length, defaults.referenceLane);
  const referenceElapsedMs = readNullableMs(
    raw,
    "referenceElapsedMs",
    defaults.referenceElapsedMs,
  );
  const updatedAt = readIsoTimestamp(raw, "updatedAt", defaults.updatedAt);

  if (
    eventLabel === null ||
    startTimestampMs === undefined ||
    startDate === null ||
    !isCalendarDate(startDate) ||
    startConfirmed === null ||
    referenceLane === undefined ||
    referenceElapsedMs === undefined ||
    updatedAt === undefined
  ) {
    return null;
  }

  return validateRaceDraft({
    eventLabel,
    startTimestampMs,
    startDate,
    startConfirmed,
    referenceLane,
    referenceElapsedMs,
    lanes: legacyLanes,
    updatedAt,
  });
}

/** Parse persisted JSON (versioned or legacy) into a validated race draft. */
export function parsePersistedRace(raw: unknown): RaceDraft | null {
  if (!isRecord(raw)) return null;

  if (raw.version === PERSISTENCE_VERSION) {
    return validateRaceDraft(raw.draft);
  }

  if ("version" in raw) return null;

  return migrateLegacyDraft(raw);
}

export function serializePersistedRace(race: RaceDraft): string {
  const payload: PersistedRaceDraftV1 = {
    version: PERSISTENCE_VERSION,
    draft: race,
  };
  return JSON.stringify(payload);
}
