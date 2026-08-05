// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import * as raceState from "../lib/race-state";
import { createEmptyRace, touchRace } from "../lib/race-state";
import { createInitialState } from "../app/state";
import type { AppState } from "../app/types";
import {
  applyRenderScope,
  getComputedRace,
  invalidateComputedRace,
  patchCopiedLane,
  patchLaneRow,
  renderFullApp,
} from "./patch-dom";

function sampleState(overrides: Partial<AppState> = {}): AppState {
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

describe("getComputedRace", () => {
  beforeEach(() => {
    invalidateComputedRace();
  });

  it("returns an empty computed result when results are hidden", () => {
    const state = sampleState({ showResults: false });
    const computed = getComputedRace(state);

    expect(computed.valid).toBe(false);
    expect(computed.results).toEqual([]);
    expect(computed.errors).toEqual([]);
  });

  it("computes and caches results while showResults stays true", () => {
    const state = sampleState({ showResults: true });
    const computeSpy = vi.spyOn(raceState, "computeRace");

    const first = getComputedRace(state);
    const second = getComputedRace(state);

    expect(first.valid).toBe(true);
    expect(second).toBe(first);
    expect(computeSpy).toHaveBeenCalledTimes(1);

    computeSpy.mockRestore();
    invalidateComputedRace();
  });

  it("recomputes after invalidation", () => {
    const state = sampleState({ showResults: true });
    const computeSpy = vi.spyOn(raceState, "computeRace");

    getComputedRace(state);
    invalidateComputedRace();
    getComputedRace(state);

    expect(computeSpy).toHaveBeenCalledTimes(2);

    computeSpy.mockRestore();
    invalidateComputedRace();
  });
});

describe("patchCopiedLane", () => {
  it("adds the copied class to a result card", () => {
    const root = document.createElement("div");
    root.innerHTML = `<article class="result-card" data-result-lane="2"></article>`;

    patchCopiedLane(root, 2);

    expect(root.querySelector('[data-result-lane="2"]')?.classList.contains("copied")).toBe(true);
  });
});

describe("patchLaneRow", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("updates only the targeted lane row", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    renderFullApp(root, sampleState());

    const before = root.querySelectorAll(".lane-row").length;
    const lane2Before = root.querySelector('.lane-row[data-lane="2"]')?.outerHTML;

    const nextState = sampleState();
    nextState.race = touchRace({
      ...nextState.race,
      lanes: nextState.race.lanes.map((lane) =>
        lane.lane === 2 ? { ...lane, gapNegative: true } : lane,
      ),
    });

    patchLaneRow(root, nextState, 2);

    expect(root.querySelectorAll(".lane-row")).toHaveLength(before);
    expect(root.querySelector('.lane-row[data-lane="2"]')?.outerHTML).not.toBe(lane2Before);
    expect(
      root.querySelector('.lane-row[data-lane="2"] .gap-sign-btn')?.classList.contains(
        "gap-sign-btn--negative",
      ),
    ).toBe(true);
    expect(root.querySelector('.lane-row[data-lane="3"]')).not.toBeNull();
  });

  it("preserves focus in the edited gap input", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    renderFullApp(root, sampleState());

    const input = root.querySelector<HTMLInputElement>('[data-gap-input="2"]');
    expect(input).not.toBeNull();
    input!.focus();
    input!.setSelectionRange(2, 2);

    const nextState = sampleState();
    nextState.race = touchRace({
      ...nextState.race,
      lanes: nextState.race.lanes.map((lane) =>
        lane.lane === 2 ? { ...lane, gapNegative: true } : lane,
      ),
    });

    patchLaneRow(root, nextState, 2);

    const nextInput = root.querySelector<HTMLInputElement>('[data-gap-input="2"]');
    expect(document.activeElement).toBe(nextInput);
    expect(nextInput?.selectionStart).toBe(2);
    expect(nextInput?.selectionEnd).toBe(2);
  });
});

describe("applyRenderScope", () => {
  beforeEach(() => {
    invalidateComputedRace();
  });

  it("does not mutate the DOM for the none scope", () => {
    const root = document.createElement("div");
    renderFullApp(root, sampleState());
    const before = root.innerHTML;

    applyRenderScope(root, sampleState(), { type: "none" });

    expect(root.innerHTML).toBe(before);
  });

  it("patches only the results section for the results scope", () => {
    const root = document.createElement("div");
    renderFullApp(root, sampleState());
    const lanesBefore = root.querySelector("#lanes-section")?.outerHTML;

    const nextState = sampleState({ showResults: true });
    applyRenderScope(root, nextState, { type: "results" });

    expect(root.querySelector("#lanes-section")?.outerHTML).toBe(lanesBefore);
    expect(root.querySelector("#results-card")?.textContent).toContain("1st");
  });
});
