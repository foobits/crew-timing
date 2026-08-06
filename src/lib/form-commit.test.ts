import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyRace, type RaceDraft } from "./race-state";
import * as time from "./time";
import {
  applyLaneGapToRace,
  applyReferenceElapsedToRace,
  applyStartTimestampToRace,
  commitPendingFormFields,
  isFieldApplyFailure,
} from "./form-commit";

afterEach(() => {
  vi.restoreAllMocks();
});

function raceWithStart(): RaceDraft {
  const result = applyStartTimestampToRace(createEmptyRace(), "10:05:03.111");
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("setup failed");
  return result.race;
}

describe("applyStartTimestampToRace", () => {
  it("parses a valid start timestamp", () => {
    const result = applyStartTimestampToRace(createEmptyRace(), "10:05:03.111");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.race.startTimestampMs).toBe(36_303_111);
    expect(result.race.startConfirmed).toBe(true);
  });

  it("clears start timestamp when empty", () => {
    const started = raceWithStart();
    const result = applyStartTimestampToRace(started, "   ");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.race.startTimestampMs).toBe(null);
  });

  it("returns error for invalid timestamp", () => {
    const result = applyStartTimestampToRace(createEmptyRace(), "99:99:99");
    expect(isFieldApplyFailure(result)).toBe(true);
    if (isFieldApplyFailure(result)) {
      expect(result.error).toMatch(/Hours|Minutes|seconds/i);
    }
  });
});

describe("applyReferenceElapsedToRace", () => {
  it("parses MM:SS.SSS reference elapsed", () => {
    const result = applyReferenceElapsedToRace(createEmptyRace(), "01:23.450");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.race.referenceElapsedMs).toBe(83_450);
  });

  it("clears reference elapsed when empty", () => {
    let race = createEmptyRace();
    race = { ...race, referenceElapsedMs: 1_000 };
    const result = applyReferenceElapsedToRace(race, "");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.race.referenceElapsedMs).toBe(null);
  });
  it("returns error for invalid reference elapsed", () => {
    const result = applyReferenceElapsedToRace(createEmptyRace(), "not-valid");
    expect(result.ok).toBe(false);
  });
});

describe("applyLaneGapToRace", () => {
  it("stores decimal-second gaps", () => {
    const result = applyLaneGapToRace(createEmptyRace(), 2, "2.511");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lane2 = result.race.lanes.find((lane) => lane.lane === 2);
    expect(lane2?.gapMs).toBe(2_511);
    expect(lane2?.status).toBe("active");
  });

  it("preserves negative sign from lane state", () => {
    let race = createEmptyRace();
    race = {
      ...race,
      lanes: race.lanes.map((lane) =>
        lane.lane === 2 ? { ...lane, gapNegative: true } : lane,
      ),
    };
    const result = applyLaneGapToRace(race, 2, "2.511");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.race.lanes.find((lane) => lane.lane === 2)?.gapNegative).toBe(true);
  });

  it("honors an explicit leading minus in the gap value", () => {
    const result = applyLaneGapToRace(createEmptyRace(), 2, "-2.511");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lane2 = result.race.lanes.find((lane) => lane.lane === 2);
    expect(lane2?.gapMs).toBe(2_511);
    expect(lane2?.gapNegative).toBe(true);
  });

  it("returns error for invalid gap value", () => {
    const result = applyLaneGapToRace(createEmptyRace(), 2, "bad");
    expect(result.ok).toBe(false);
  });

  it("returns error when an explicit signed gap parses without signed metadata", () => {
    vi.spyOn(time, "parseGap").mockReturnValue({ ok: true, value: 1_000 });
    const result = applyLaneGapToRace(createEmptyRace(), 2, "+1.000");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("Invalid gap format.");
  });
});

describe("commitPendingFormFields", () => {
  it("commits all fields in one pass like mobile Calculate", () => {
    const { race, errors } = commitPendingFormFields(createEmptyRace(), {
      startTimestamp: "10:05:03.111",
      referenceElapsed: "01:23.450",
      laneGaps: [
        { lane: 1, value: "01:23.450", readOnly: true },
        { lane: 2, value: "2.511" },
        { lane: 3, value: "1:23.450" },
      ],
    });

    expect(errors).toEqual([]);
    expect(race.startTimestampMs).toBe(36_303_111);
    expect(race.referenceElapsedMs).toBe(83_450);
    expect(race.lanes.find((lane) => lane.lane === 2)?.gapMs).toBe(2_511);
    expect(race.lanes.find((lane) => lane.lane === 3)?.gapMs).toBe(83_450);
  });

  it("skips readonly reference lane gap input", () => {
    const { race } = commitPendingFormFields(createEmptyRace(), {
      referenceElapsed: "01:23.450",
      laneGaps: [{ lane: 1, value: "99:99.999", readOnly: true }],
    });

    expect(race.referenceElapsedMs).toBe(83_450);
    expect(race.lanes.find((lane) => lane.lane === 1)?.gapMs).toBe(0);
  });

  it("collects parse errors without throwing", () => {
    const { race, errors } = commitPendingFormFields(createEmptyRace(), {
      startTimestamp: "not-a-time",
      referenceElapsed: "01:23.450",
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(race.startTimestampMs).toBe(null);
    expect(race.referenceElapsedMs).toBe(83_450);
  });
});

describe("mobile input sync scenarios", () => {
  it("syncs reference elapsed from input without change event", () => {
    let race = raceWithStart();
    const result = applyReferenceElapsedToRace(race, "01:23.450");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    race = result.race;

    const gapResult = applyLaneGapToRace(race, 2, "2.511");
    expect(gapResult.ok).toBe(true);
    if (!gapResult.ok) return;

    expect(gapResult.race.referenceElapsedMs).toBe(83_450);
    expect(gapResult.race.lanes.find((lane) => lane.lane === 2)?.gapMs).toBe(2_511);
  });
});
