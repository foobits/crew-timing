import { describe, expect, it } from "vitest";
import {
  PERSISTENCE_VERSION,
  parsePersistedRace,
  serializePersistedRace,
  validateRaceDraft,
} from "./persist-race";
import { createEmptyRace, type RaceDraft } from "./race-state";

function sampleRace(): RaceDraft {
  return {
    ...createEmptyRace(),
    eventLabel: "Mens 1V Heat 2",
    startTimestampMs: 47_281_491,
    startDate: "2026-08-04",
    startConfirmed: true,
    referenceLane: 3,
    referenceElapsedMs: 143_450,
    lanes: createEmptyRace().lanes.map((lane) => {
      if (lane.lane === 3) {
        return { ...lane, gapMs: 0, gapNegative: false, status: "active" as const };
      }
      if (lane.lane === 5) {
        return { ...lane, gapMs: 2_340, gapNegative: false, status: "active" as const };
      }
      return { ...lane, status: "empty" as const };
    }),
    updatedAt: "2026-08-04T18:00:00.000Z",
  };
}

describe("serializePersistedRace", () => {
  it("writes a versioned envelope", () => {
    const race = sampleRace();
    const parsed = JSON.parse(serializePersistedRace(race)) as {
      version: number;
      draft: RaceDraft;
    };

    expect(parsed.version).toBe(PERSISTENCE_VERSION);
    expect(parsed.draft.eventLabel).toBe("Mens 1V Heat 2");
  });
});

describe("validateRaceDraft", () => {
  it("accepts a complete race draft", () => {
    expect(validateRaceDraft(sampleRace())).toEqual(sampleRace());
  });

  it("rejects non-objects", () => {
    expect(validateRaceDraft(null)).toBeNull();
    expect(validateRaceDraft("race")).toBeNull();
  });

  it("rejects missing or invalid scalar fields", () => {
    const race = sampleRace();

    expect(validateRaceDraft({ ...race, eventLabel: 1 })).toBeNull();
    expect(validateRaceDraft({ ...race, startTimestampMs: -1 })).toBeNull();
    expect(validateRaceDraft({ ...race, startDate: "08/04/2026" })).toBeNull();
    expect(validateRaceDraft({ ...race, startConfirmed: "yes" })).toBeNull();
    expect(validateRaceDraft({ ...race, referenceLane: 0 })).toBeNull();
    expect(validateRaceDraft({ ...race, referenceElapsedMs: Number.NaN })).toBeNull();
  });

  it("rejects invalid lanes and out-of-range reference lanes", () => {
    const race = sampleRace();

    expect(validateRaceDraft({ ...race, lanes: [] })).toBeNull();
    expect(
      validateRaceDraft({
        ...race,
        lanes: race.lanes.map((lane) =>
          lane.lane === 2 ? { ...lane, status: "missing" } : lane,
        ),
      }),
    ).toBeNull();
    expect(
      validateRaceDraft({
        ...race,
        lanes: race.lanes.map((lane) =>
          lane.lane === 2 ? { ...lane, lane: 99 } : lane,
        ),
      }),
    ).toBeNull();
    expect(validateRaceDraft({ ...race, referenceLane: race.lanes.length + 1 })).toBeNull();
  });

  it("fills in a missing updatedAt timestamp", () => {
    const race = sampleRace();
    const validated = validateRaceDraft({ ...race, updatedAt: "not-a-date" });

    expect(validated?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("parsePersistedRace", () => {
  it("loads versioned drafts", () => {
    const race = sampleRace();
    const loaded = parsePersistedRace(JSON.parse(serializePersistedRace(race)));

    expect(loaded).toEqual(race);
  });

  it("migrates legacy unversioned drafts with defaults for missing fields", () => {
    const race = sampleRace();
    const legacy = {
      eventLabel: race.eventLabel,
      startTimestampMs: race.startTimestampMs,
      referenceLane: race.referenceLane,
      referenceElapsedMs: race.referenceElapsedMs,
      lanes: race.lanes,
    };

    const loaded = parsePersistedRace(legacy);

    expect(loaded?.eventLabel).toBe(race.eventLabel);
    expect(loaded?.startTimestampMs).toBe(race.startTimestampMs);
    expect(loaded?.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(loaded?.startConfirmed).toBe(true);
    expect(loaded?.referenceLane).toBe(3);
    expect(loaded?.lanes).toHaveLength(8);
  });

  it("rejects unknown persistence versions", () => {
    expect(parsePersistedRace({ version: 99, draft: sampleRace() })).toBeNull();
  });

  it("rejects malformed versioned payloads", () => {
    expect(parsePersistedRace({ version: 1, draft: { eventLabel: 1 } })).toBeNull();
  });

  it("rejects legacy drafts with unusable lane data", () => {
    expect(parsePersistedRace({ lanes: [{ lane: 2, status: "active" }] })).toBeNull();
  });

  it("rejects legacy drafts when lanes are missing", () => {
    expect(parsePersistedRace({ eventLabel: "Heat 1" })).toBeNull();
  });

  it("rejects legacy drafts when a present field has the wrong type", () => {
    expect(
      parsePersistedRace({ lanes: sampleRace().lanes, referenceElapsedMs: "02:23.450" }),
    ).toBeNull();
  });
});
