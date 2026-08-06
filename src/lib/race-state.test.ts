import { describe, expect, it, vi } from "vitest";
import * as time from "./time";
import {
  addLane,
  clearJudgeData,
  clearPersistedRace,
  computeRace,
  createEmptyRace,
  DEFAULT_LANE_COUNT,
  formatCopyAll,
  formatGapDisplay,
  hasRaceData,
  isStaleDraft,
  loadPersistedRace,
  MIN_LANE_COUNT,
  nextRace,
  persistRace,
  removeLane,
  removeLaneClearingJudgeData,
  setReferenceLane,
  wouldRemoveReferenceLaneWithJudgeData,
  type RaceDraft,
} from "./race-state";

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
        return { ...lane, gapMs: 0, gapNegative: false, status: "active" };
      }
      if (lane.lane === 5) {
        return { ...lane, gapMs: 2_340, gapNegative: false, status: "active" };
      }
      return { ...lane, status: "empty" as const };
    }),
  };
}

describe("computeRace", () => {
  it("computes finish timestamps from reference and gaps", () => {
    const computed = computeRace(sampleRace());
    expect(computed.valid).toBe(true);
    expect(computed.results).toHaveLength(2);

    const lane5 = computed.results.find((r) => r.lane === 5);
    expect(lane5?.finishFormatted).toBe("13:10:27.281");
    expect(lane5?.elapsedFormatted).toBe("02:25.790");
    expect(lane5?.place).toBe(2);
  });

  it("rejects negative elapsed", () => {
    const race = sampleRace();
    race.lanes = race.lanes.map((l) =>
      l.lane === 5 ? { ...l, gapMs: 200_000, gapNegative: true } : l,
    );
    const computed = computeRace(race);
    expect(computed.valid).toBe(false);
    expect(computed.errors.some((e) => e.includes("negative"))).toBe(true);
  });

  it("requires start confirmation when not confirmed", () => {
    const race = sampleRace();
    race.startConfirmed = false;
    const computed = computeRace(race);
    expect(computed.valid).toBe(false);
    expect(computed.errors).toContain("Confirm the restored start timestamp before calculating.");
  });
});

describe("setReferenceLane", () => {
  it("rebases gaps when changing reference lane", () => {
    let race = sampleRace();
    race = setReferenceLane(race, 5);
    const lane3 = race.lanes.find((l) => l.lane === 3);
    expect(lane3?.gapMs).toBe(2_340);
    expect(lane3?.gapNegative).toBe(true);

    const computed = computeRace(race);
    expect(computed.valid).toBe(true);
    const ref = computed.results.find((r) => r.lane === 5);
    expect(ref?.elapsedFormatted).toBe("02:25.790");
  });

  it("no-ops when selecting the current reference lane", () => {
    const race = sampleRace();
    const next = setReferenceLane(race, race.referenceLane);
    expect(next.referenceLane).toBe(race.referenceLane);
    expect(next.lanes).toEqual(race.lanes);
  });

  it("resets lanes when new reference has no gap", () => {
    let race = sampleRace();
    race = setReferenceLane(race, 2, true);
    expect(race.lanes.find((l) => l.lane === 2)?.gapMs).toBe(0);
    expect(race.lanes.find((l) => l.lane === 5)?.gapMs).toBe(null);
  });

  it("rebase can produce negative relative gaps", () => {
    let race = sampleRace();
    race = setReferenceLane(race, 5);
    const lane3 = race.lanes.find((lane) => lane.lane === 3);
    expect(lane3?.gapNegative).toBe(true);
  });

  it("clears judge data when rebasing would make reference elapsed negative", () => {
    let race = sampleRace();
    race = {
      ...race,
      referenceElapsedMs: 1_000,
      lanes: race.lanes.map((lane) => {
        if (lane.lane === 5) {
          return { ...lane, status: "active" as const, gapMs: 2_000, gapNegative: true };
        }
        if (lane.lane === 3) {
          return { ...lane, status: "active" as const, gapMs: 0, gapNegative: false };
        }
        return lane;
      }),
    };

    race = setReferenceLane(race, 5);
    expect(race.referenceLane).toBe(5);
    expect(race.referenceElapsedMs).toBeNull();
    expect(race.lanes.find((lane) => lane.lane === 3)?.gapMs).toBeNull();
    expect(computeRace(race).valid).toBe(false);
  });
});

describe("lane count", () => {
  it("starts with the default lane count", () => {
    const race = createEmptyRace();
    expect(race.lanes.length).toBe(DEFAULT_LANE_COUNT);
  });

  it("adds lanes without a maximum", () => {
    let race = createEmptyRace();
    for (let lane = DEFAULT_LANE_COUNT + 1; lane <= 12; lane += 1) {
      race = addLane(race);
      expect(race.lanes.length).toBe(lane);
      expect(race.lanes.at(-1)?.lane).toBe(lane);
    }
  });

  it("adds a lane above the minimum", () => {
    let race = createEmptyRace();

    while (race.lanes.length > MIN_LANE_COUNT) {
      race = removeLane(race);
    }
    expect(race.lanes.length).toBe(MIN_LANE_COUNT);

    race = addLane(race);
    expect(race.lanes.length).toBe(2);
    expect(race.lanes[1]?.lane).toBe(2);
  });

  it("removes the last lane down to the minimum", () => {
    let race = createEmptyRace();
    race = removeLane(race);
    expect(race.lanes.length).toBe(DEFAULT_LANE_COUNT - 1);
    expect(race.lanes.at(-1)?.lane).toBe(DEFAULT_LANE_COUNT - 1);

    while (race.lanes.length > MIN_LANE_COUNT) {
      race = removeLane(race);
    }
    race = removeLane(race);
    expect(race.lanes.length).toBe(MIN_LANE_COUNT);
  });

  it("moves reference to lane 1 when removing the reference lane without judge data", () => {
    let race = createEmptyRace();
    while (race.lanes.length < 10) {
      race = addLane(race);
    }
    race = { ...race, referenceLane: 10 };
    race = removeLane(race);
    expect(race.lanes.length).toBe(9);
    expect(race.referenceLane).toBe(1);
  });

  it("detects when removing the reference lane would invalidate judge data", () => {
    let race = createEmptyRace();
    while (race.lanes.length < 10) {
      race = addLane(race);
    }
    race = {
      ...race,
      referenceLane: 10,
      referenceElapsedMs: 143_450,
      lanes: race.lanes.map((lane) =>
        lane.lane === 10
          ? { ...lane, gapMs: 0, gapNegative: false, status: "active" as const }
          : lane.lane === 2
            ? { ...lane, gapMs: 2_511, gapNegative: false, status: "active" as const }
            : lane,
      ),
    };

    expect(wouldRemoveReferenceLaneWithJudgeData(race)).toBe(true);

    const cleared = removeLaneClearingJudgeData(race);
    expect(cleared.lanes.length).toBe(9);
    expect(cleared.referenceLane).toBe(1);
    expect(cleared.referenceElapsedMs).toBeNull();
    expect(cleared.lanes.find((lane) => lane.lane === 2)?.gapMs).toBeNull();
  });
});

describe("reset actions", () => {
  it("nextRace returns empty draft", () => {
    const race = nextRace();
    expect(hasRaceData(race)).toBe(false);
    expect(race.referenceElapsedMs).toBe(null);
  });

  it("clearJudgeData keeps start timestamp", () => {
    const race = clearJudgeData(sampleRace());
    expect(race.startTimestampMs).toBe(47_281_491);
    expect(race.referenceElapsedMs).toBe(null);
    expect(race.lanes.find((l) => l.lane === 5)?.gapMs).toBe(null);
  });
});

describe("hasRaceData", () => {
  it("detects entered data", () => {
    expect(hasRaceData(createEmptyRace())).toBe(false);
    expect(hasRaceData(sampleRace())).toBe(true);
  });

  it("detects event label and empty lanes", () => {
    const race = createEmptyRace();
    expect(hasRaceData({ ...race, eventLabel: "Heat 1" })).toBe(true);
    expect(
      hasRaceData({
        ...race,
        lanes: race.lanes.map((lane) =>
          lane.lane === 2 ? { ...lane, status: "empty" } : lane,
        ),
      }),
    ).toBe(true);
  });
});

describe("persistence", () => {
  it("round-trips race drafts through localStorage", () => {
    const race = sampleRace();
    persistRace(race);
    const loaded = loadPersistedRace();
    expect(loaded?.startTimestampMs).toBe(race.startTimestampMs);
    expect(loaded?.lanes.length).toBe(race.lanes.length);
    clearPersistedRace();
    expect(loadPersistedRace()).toBe(null);
  });

  it("persists a versioned envelope", () => {
    persistRace(sampleRace());
    const stored = JSON.parse(localStorage.getItem("crew-timing-race-draft")!);
    expect(stored.version).toBe(1);
    expect(stored.draft.eventLabel).toBe("Mens 1V Heat 2");
  });

  it("loads legacy unversioned drafts from localStorage", () => {
    const race = sampleRace();
    localStorage.setItem("crew-timing-race-draft", JSON.stringify(race));
    const loaded = loadPersistedRace();
    expect(loaded?.eventLabel).toBe(race.eventLabel);
    expect(loaded?.startTimestampMs).toBe(race.startTimestampMs);
  });

  it("rejects invalid persisted drafts", () => {
    localStorage.setItem("crew-timing-race-draft", "{");
    expect(loadPersistedRace()).toBe(null);
  });

  it("rejects drafts with too few lanes", () => {
    localStorage.setItem(
      "crew-timing-race-draft",
      JSON.stringify({ ...sampleRace(), lanes: [] }),
    );
    expect(loadPersistedRace()).toBe(null);
  });

  it("rejects drafts with invalid field types", () => {
    localStorage.setItem(
      "crew-timing-race-draft",
      JSON.stringify({ ...sampleRace(), referenceElapsedMs: "02:23.450" }),
    );
    expect(loadPersistedRace()).toBe(null);
  });
});

describe("formatCopyAll", () => {
  it("includes event label and result lines", () => {
    const computed = computeRace(sampleRace());
    const text = formatCopyAll(sampleRace(), computed.results);
    expect(text).toContain("Mens 1V Heat 2");
    expect(text).toContain("Start: 13:08:01.491");
    expect(text).toContain("Lane 5");
  });
});

describe("formatGapDisplay", () => {
  it("formats signed gap display", () => {
    expect(
      formatGapDisplay({
        lane: 2,
        status: "active",
        gapMs: 2_340,
        gapNegative: true,
      }),
    ).toBe("-00:02.340");
  });
});

describe("isStaleDraft", () => {
  it("flags drafts from another date", () => {
    const race = sampleRace();
    expect(isStaleDraft({ ...race, startDate: "2020-01-01" })).toBe(true);
  });
});

describe("computeRace edge cases", () => {
  it("handles tied places", () => {
    const race = sampleRace();
    race.lanes = race.lanes.map((lane) => {
      if (lane.lane === 4) {
        return { ...lane, status: "active", gapMs: 2_340, gapNegative: false };
      }
      if (lane.lane === 5) {
        return { ...lane, status: "active", gapMs: 2_340, gapNegative: false };
      }
      return lane;
    });
    const computed = computeRace(race);
    expect(computed.valid).toBe(true);
    const lane4 = computed.results.find((r) => r.lane === 4);
    const lane5 = computed.results.find((r) => r.lane === 5);
    expect(lane4?.place).toBe(lane5?.place);
    expect(lane4?.tied).toBe(true);
  });

  it("requires a start timestamp", () => {
    const race = sampleRace();
    race.startTimestampMs = null;
    const computed = computeRace(race);
    expect(computed.errors).toContain("Enter a race start timestamp.");
  });

  it("requires reference elapsed time", () => {
    const race = sampleRace();
    race.referenceElapsedMs = null;
    const computed = computeRace(race);
    expect(computed.errors).toContain("Enter reference elapsed time.");
  });

  it("rejects a negative reference elapsed time", () => {
    const race = sampleRace();
    race.referenceElapsedMs = -1_000;
    const computed = computeRace(race);
    expect(computed.errors).toContain("Reference elapsed time cannot be negative.");
    expect(computed.valid).toBe(false);
  });

  it("reports timestamp mismatch when finish round-trip fails", () => {
    vi.spyOn(time, "elapsedBetweenTimestamps").mockReturnValue(0);
    const computed = computeRace(sampleRace());
    expect(computed.valid).toBe(false);
    expect(computed.errors.some((error) => error.includes("timestamp mismatch"))).toBe(true);
    vi.restoreAllMocks();
  });
});
