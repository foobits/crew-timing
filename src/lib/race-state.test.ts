import { describe, expect, it } from "vitest";
import {
  clearJudgeData,
  computeRace,
  createEmptyRace,
  hasRaceData,
  nextRace,
  setReferenceLane,
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

  it("resets lanes when new reference has no gap", () => {
    let race = sampleRace();
    race = setReferenceLane(race, 2, true);
    expect(race.lanes.find((l) => l.lane === 2)?.gapMs).toBe(0);
    expect(race.lanes.find((l) => l.lane === 5)?.gapMs).toBe(null);
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
});
