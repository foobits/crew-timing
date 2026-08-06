// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import * as raceState from "../lib/race-state";
import { computeRace, touchRace } from "../lib/race-state";
import { createInitialState } from "../app/state";
import { sampleAppState } from "../test/fixtures";
import {
  applyRenderScope,
  getComputedRace,
  invalidateComputedRace,
  patchBanners,
  patchContext,
  patchResultCard,
  patchDialog,
  patchFooter,
  patchLaneCountControls,
  patchLaneRow,
  patchLanes,
  patchResults,
  renderFullApp,
} from "./patch-dom";

describe("getComputedRace", () => {
  beforeEach(() => {
    invalidateComputedRace();
  });

  it("returns an empty computed result when results are hidden", () => {
    const state = sampleAppState({ showResults: false });
    const computed = getComputedRace(state);

    expect(computed.valid).toBe(false);
    expect(computed.results).toEqual([]);
    expect(computed.errors).toEqual([]);
  });

  it("returns an empty computed result when no calculation snapshot exists", () => {
    const state = sampleAppState({ showResults: true, calculationSnapshot: null });
    const computed = getComputedRace(state);

    expect(computed.valid).toBe(false);
    expect(computed.results).toEqual([]);
  });

  it("returns the stored calculation snapshot without recomputing", () => {
    const state = sampleAppState({ showResults: true });
    const computeSpy = vi.spyOn(raceState, "computeRace");

    const first = getComputedRace(state);
    const second = getComputedRace(state);

    expect(first.valid).toBe(true);
    expect(second).toBe(first);
    expect(computeSpy).not.toHaveBeenCalled();

    computeSpy.mockRestore();
  });

  it("keeps the snapshot when the draft changes after calculate", () => {
    const state = sampleAppState({ showResults: true });
    const snapshot = getComputedRace(state);

    const edited = sampleAppState({
      showResults: true,
      calculationSnapshot: { race: structuredClone(state.race), computed: snapshot },
      race: touchRace({
        ...state.race,
        referenceElapsedMs: 999_999,
      }),
    });

    expect(getComputedRace(edited)).toBe(snapshot);
  });
});

describe("patchResultCard", () => {
  it("re-renders a result card with copied styling and unmark label", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    renderFullApp(root, sampleAppState({ showResults: true }));

    const state = sampleAppState({ showResults: true, copiedLanes: new Set([2]) });
    const computed = computeRace(state.race);

    patchResultCard(root, state, 2, computed);

    const card = root.querySelector('[data-result-lane="2"]');
    expect(card?.classList.contains("copied")).toBe(true);
    expect(card?.querySelector('[data-copy-lane="2"]')?.textContent).toBe(
      "Copied — tap to unmark",
    );
  });

  it("re-renders a result card without copied styling after unmark", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    renderFullApp(root, sampleAppState({ showResults: true, copiedLanes: new Set([2]) }));

    const state = sampleAppState({ showResults: true, copiedLanes: new Set() });
    const computed = computeRace(state.race);

    patchResultCard(root, state, 2, computed);

    const card = root.querySelector('[data-result-lane="2"]');
    expect(card?.classList.contains("copied")).toBe(false);
    expect(card?.querySelector('[data-copy-lane="2"]')?.textContent).toBe("Copy timestamp");
  });
});

describe("patchLaneRow", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("updates only the targeted lane row", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    renderFullApp(root, sampleAppState());

    const before = root.querySelectorAll(".lane-row").length;
    const lane2Before = root.querySelector('.lane-row[data-lane="2"]')?.outerHTML;

    const nextState = sampleAppState();
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
    renderFullApp(root, sampleAppState());

    const input = root.querySelector<HTMLInputElement>('[data-gap-input="2"]');
    expect(input).not.toBeNull();
    input!.focus();
    input!.setSelectionRange(2, 2);

    const nextState = sampleAppState();
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

  it("returns early when the lane or row is missing", () => {
    const root = document.createElement("div");
    root.innerHTML = `<div class="lane-row" data-lane="2"></div>`;
    const before = root.innerHTML;

    patchLaneRow(root, sampleAppState(), 99);
    expect(root.innerHTML).toBe(before);

    root.innerHTML = "";
    patchLaneRow(root, sampleAppState(), 2);
    expect(root.innerHTML).toBe("");
  });
});

describe("applyRenderScope", () => {
  beforeEach(() => {
    invalidateComputedRace();
  });

  it("does not mutate the DOM for the none scope", () => {
    const root = document.createElement("div");
    renderFullApp(root, sampleAppState());
    const before = root.innerHTML;

    applyRenderScope(root, sampleAppState(), { type: "none" });

    expect(root.innerHTML).toBe(before);
  });

  it("patches only the results section for the results scope", () => {
    const root = document.createElement("div");
    renderFullApp(root, sampleAppState());
    const lanesBefore = root.querySelector("#lanes-section")?.outerHTML;

    const nextState = sampleAppState({ showResults: true });
    applyRenderScope(root, nextState, { type: "results" });

    expect(root.querySelector("#lanes-section")?.outerHTML).toBe(lanesBefore);
    expect(root.querySelector("#results-card")?.textContent).toContain("1st");
  });

  it("patches individual scopes without rerendering the whole app", () => {
    const root = document.createElement("div");
    renderFullApp(root, sampleAppState());
    const fullBefore = root.querySelector("header")?.outerHTML;

    patchBanners(root, sampleAppState({ restoredBanner: true }), false);
    expect(root.querySelector("#app-banners")?.textContent).toContain("Restored race draft");

    patchContext(root, sampleAppState({ contextCollapsed: true }), false);
    expect(root.querySelector("#context-card")?.classList.contains("collapsed")).toBe(true);

    patchLanes(root, sampleAppState());
    expect(root.querySelectorAll(".lane-row").length).toBeGreaterThan(0);

    patchDialog(root, sampleAppState({ confirmAction: "clearJudge" }));
    expect(root.querySelector("#confirm-host")?.textContent).toContain("Clear judge data");

    patchFooter(sampleAppState());
    expect(document.getElementById("footer-actions")).not.toBeNull();

    const preResultsState = sampleAppState({ showResults: true });
    patchResultCard(root, preResultsState, 2, getComputedRace(preResultsState));
    expect(root.querySelector('[data-result-lane="2"]')).toBeNull();

    const resultsState = sampleAppState({ showResults: true });
    patchResults(root, resultsState, getComputedRace(resultsState));
    expect(root.querySelector("#results-card")?.textContent).toContain("Results");

    patchLaneCountControls(root, sampleAppState());
    expect(root.querySelector(".lane-count")?.textContent).toBe("8");

    expect(root.querySelector("header")?.outerHTML).toBe(fullBefore);
  });

  it("handles copied-lane, banners, dialog, footer, context, and lanes scopes", () => {
    const root = document.createElement("div");
    renderFullApp(root, sampleAppState({ showResults: true }));

    applyRenderScope(root, sampleAppState({ showResults: true, copiedLanes: new Set([2]) }), {
      type: "copied-lane",
      lane: 2,
    });
    expect(root.querySelector('[data-result-lane="2"]')?.classList.contains("copied")).toBe(true);
    expect(root.querySelector('[data-copy-lane="2"]')?.textContent).toBe("Copied — tap to unmark");

    applyRenderScope(root, sampleAppState({ restoredBanner: true }), { type: "banners" });
    expect(root.querySelector("#app-banners")?.textContent).toContain("Restored race draft");

    applyRenderScope(root, sampleAppState({ confirmAction: "nextRace" }), { type: "dialog" });
    expect(root.querySelector("#confirm-host")?.textContent).toContain(
      "Clear this race and start the next one?",
    );

    applyRenderScope(root, createInitialState(), { type: "footer" });
    expect(document.getElementById("footer-actions")).toBeNull();

    applyRenderScope(root, sampleAppState({ contextCollapsed: true }), { type: "context" });
    expect(root.querySelector("#context-card")?.classList.contains("collapsed")).toBe(true);
    expect(document.getElementById("footer-actions")).not.toBeNull();

    applyRenderScope(root, createInitialState(), { type: "context" });
    expect(document.getElementById("footer-actions")).toBeNull();

    applyRenderScope(root, sampleAppState(), { type: "lanes" });
    expect(root.querySelectorAll(".lane-row").length).toBe(8);
  });

  it("patches a single lane row and lane-count controls together", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    renderFullApp(root, sampleAppState());

    const nextState = sampleAppState();
    nextState.race = touchRace({
      ...nextState.race,
      lanes: nextState.race.lanes.map((lane) =>
        lane.lane === 2 ? { ...lane, gapNegative: true } : lane,
      ),
    });

    applyRenderScope(root, nextState, { type: "lane-row", lane: 2 });

    expect(
      root.querySelector('.lane-row[data-lane="2"] .gap-sign-btn')?.classList.contains(
        "gap-sign-btn--negative",
      ),
    ).toBe(true);
    expect(root.querySelector(".lane-count")?.textContent).toBe("8");
  });
});
