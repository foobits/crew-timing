// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadPersistedRace, touchRace } from "../lib/race-state";
import { createInitialState } from "./state";
import {
  applyInputFormat,
  applyLaneGap,
  applyReferenceElapsed,
  applyStartTimestamp,
  commitAllFormFields,
  updateRaceDraft,
} from "./form-sync";
import { formatGapWhileTyping } from "../lib/time";

describe("applyInputFormat", () => {
  it("formats the input value in place", () => {
    const input = document.createElement("input");
    input.value = "123450";

    const formatted = applyInputFormat(input, formatGapWhileTyping);

    expect(formatted).toBe("1:23.450");
    expect(input.value).toBe("1:23.450");
  });
});

describe("applyStartTimestamp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates race state and schedules persistence", async () => {
    const state = createInitialState();
    const result = applyStartTimestamp(state, "10:05:03.111");

    expect(result.state.race.startTimestampMs).not.toBeNull();
    expect(result.clearRestoredBanner).toBe(true);
    expect(result.state.restoredBanner).toBe(false);

    await vi.advanceTimersByTimeAsync(400);
    expect(loadPersistedRace()?.startTimestampMs).toBe(result.state.race.startTimestampMs);
  });

  it("returns an error for invalid input without mutating state", () => {
    const state = createInitialState();
    const result = applyStartTimestamp(state, "bad");

    expect(result.error).toBeTruthy();
    expect(result.state).toBe(state);
  });
});

describe("applyReferenceElapsed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates reference elapsed and persists", async () => {
    const state = createInitialState();
    const result = applyReferenceElapsed(state, "01:23.450");

    expect(result.state.race.referenceElapsedMs).toBe(83_450);
    await vi.advanceTimersByTimeAsync(400);
    expect(loadPersistedRace()?.referenceElapsedMs).toBe(83_450);
  });

  it("returns an error for invalid input without mutating state", () => {
    const state = createInitialState();
    const result = applyReferenceElapsed(state, "bad");

    expect(result.error).toBeTruthy();
    expect(result.state).toBe(state);
  });
});

describe("applyLaneGap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("honors explicit negative gap values", async () => {
    const state = createInitialState();
    const result = applyLaneGap(state, 2, "-2.511");

    expect(result.state.race.lanes.find((lane) => lane.lane === 2)?.gapNegative).toBe(true);
    expect(result.state.race.lanes.find((lane) => lane.lane === 2)?.gapMs).toBe(2_511);
  });

  it("returns an error for invalid gap input without mutating state", () => {
    const state = createInitialState();
    const result = applyLaneGap(state, 2, "not-a-gap");

    expect(result.error).toBeTruthy();
    expect(result.state).toBe(state);
  });
});

describe("commitAllFormFields", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reads live DOM values into race state", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <input id="start-ts" value="10:05:03.111" />
      <input id="ref-elapsed" value="01:23.450" />
      <input data-gap-input="2" value="2.511" />
    `;

    const { state, errors } = commitAllFormFields(createInitialState(), root);

    expect(errors).toEqual([]);
    expect(state.race.startTimestampMs).not.toBeNull();
    expect(state.race.referenceElapsedMs).toBe(83_450);
    expect(state.race.lanes.find((lane) => lane.lane === 2)?.gapMs).toBe(2_511);
    expect(loadPersistedRace()?.referenceElapsedMs).toBe(83_450);
  });
});

describe("updateRaceDraft", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears showResults, calculatedResults, and debounces persistence by default", async () => {
    const state = {
      ...createInitialState(),
      showResults: true,
      calculatedResults: { valid: true, results: [], errors: [] },
    };
    const next = updateRaceDraft(state, (race) => touchRace({ ...race, eventLabel: "Heat 2" }));

    expect(next.showResults).toBe(false);
    expect(next.calculatedResults).toBeNull();
    expect(next.race.eventLabel).toBe("Heat 2");
    expect(loadPersistedRace()).toBeNull();

    await vi.advanceTimersByTimeAsync(400);
    expect(loadPersistedRace()?.eventLabel).toBe("Heat 2");
  });

  it("flushes persistence immediately when requested", () => {
    const next = updateRaceDraft(
      createInitialState(),
      (race) => touchRace({ ...race, eventLabel: "Immediate" }),
      { persist: "immediate" },
    );

    expect(loadPersistedRace()?.eventLabel).toBe("Immediate");
    expect(next.race.eventLabel).toBe("Immediate");
  });
});
