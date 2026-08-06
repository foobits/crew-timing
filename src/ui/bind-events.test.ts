// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as clipboard from "../app/clipboard";
import { createInitialState } from "../app/state";
import { createEmptyRace, touchRace } from "../lib/race-state";
import { sampleAppState, sampleRaceWithReferenceLane10 } from "../test/fixtures";
import { mountBoundApp } from "../test/bind-app";
import { applyRenderScope } from "./patch-dom";
import { renderFooter } from "./render-dialog";

function fillTimeInput(root: ParentNode, selector: string, value: string): void {
  const input = root.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("bindEventsOnce", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(clipboard, "copyText").mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("toggles gap sign on lane rows", () => {
    const app = mountBoundApp(sampleAppState());
    app.root
      .querySelector<HTMLElement>('[data-gap-sign="2"]')
      ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    expect(app.getState().race.lanes.find((lane) => lane.lane === 2)?.gapNegative).toBe(true);
    expect(app.scheduleRender).toHaveBeenCalledWith({ type: "lane-row", lane: 2 });
  });

  it("toggles gap sign on the first tap while a gap value is focused", () => {
    const app = mountBoundApp(sampleAppState());
    const lane2 = app.root.querySelector<HTMLInputElement>('[data-gap-input="2"]')!;
    lane2.value = "2.511";
    lane2.focus();

    app.root
      .querySelector<HTMLElement>('[data-gap-sign="2"]')
      ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));

    const lane = app.getState().race.lanes.find((entry) => entry.lane === 2);
    expect(lane?.gapNegative).toBe(true);
    expect(lane?.gapMs).toBe(2_511);
    expect(
      app.root
        .querySelector('[data-gap-sign="2"]')
        ?.classList.contains("gap-sign-btn--negative"),
    ).toBe(true);
  });

  it("does not toggle gap sign from click alone (mobile uses pointerdown)", () => {
    const app = mountBoundApp(sampleAppState());
    const lane2 = app.root.querySelector<HTMLInputElement>('[data-gap-input="2"]')!;
    lane2.value = "2.511";
    lane2.focus();

    app.root.querySelector<HTMLElement>('[data-gap-sign="2"]')?.click();

    const lane = app.getState().race.lanes.find((entry) => entry.lane === 2);
    expect(lane?.gapNegative).toBe(false);
    expect(lane?.gapMs).toBe(2_511);
  });

  it("prevents default on gap sign pointerdown so blur does not eat the first tap", () => {
    const app = mountBoundApp(sampleAppState());
    const sign = app.root.querySelector<HTMLElement>('[data-gap-sign="2"]')!;
    const event = new PointerEvent("pointerdown", { bubbles: true, cancelable: true });
    const preventDefault = vi.spyOn(event, "preventDefault");

    sign.dispatchEvent(event);

    expect(preventDefault).toHaveBeenCalled();
    expect(app.getState().race.lanes.find((lane) => lane.lane === 2)?.gapNegative).toBe(true);
  });

  it("toggles gap sign back to positive while the gap input stays focused", () => {
    const app = mountBoundApp(sampleAppState());
    const lane2 = app.root.querySelector<HTMLInputElement>('[data-gap-input="2"]')!;
    lane2.value = "2.511";
    lane2.focus();

    const sign = () =>
      app.root
        .querySelector<HTMLElement>('[data-gap-sign="2"]')
        ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));

    sign();
    sign();

    const lane = app.getState().race.lanes.find((entry) => entry.lane === 2);
    expect(lane?.gapNegative).toBe(false);
    expect(lane?.gapMs).toBe(2_511);
    expect(document.activeElement).toBe(app.root.querySelector('[data-gap-input="2"]'));
  });

  it("marks a lane empty from the status toggle", () => {
    const app = mountBoundApp(sampleAppState());
    app.root
      .querySelector<HTMLButtonElement>('[data-status="4"][data-status-value="empty"]')
      ?.click();

    const lane = app.getState().race.lanes.find((entry) => entry.lane === 4);
    expect(lane?.status).toBe("empty");
    expect(lane?.gapMs).toBeNull();
  });

  it("clears a lane gap from the row action", () => {
    const app = mountBoundApp(sampleAppState());
    app.root.querySelector<HTMLElement>('[data-clear-lane="2"]')?.click();

    const lane = app.getState().race.lanes.find((entry) => entry.lane === 2);
    expect(lane?.gapMs).toBeNull();
    expect(lane?.gapNegative).toBe(false);
  });

  it("adds and removes lanes", () => {
    const app = mountBoundApp(sampleAppState());
    const initialCount = app.getState().race.lanes.length;

    app.root.querySelector<HTMLElement>('[data-action="add-lane"]')?.click();
    expect(app.getState().race.lanes).toHaveLength(initialCount + 1);

    app.root.querySelector<HTMLElement>('[data-action="remove-lane"]')?.click();
    expect(app.getState().race.lanes).toHaveLength(initialCount);
  });

  it("calculates results from live form values", () => {
    const app = mountBoundApp(sampleAppState());
    fillTimeInput(app.root, "#start-ts", "10:05:03.111");
    fillTimeInput(app.root, "#ref-elapsed", "01:23.450");

    const lane2 = app.root.querySelector<HTMLInputElement>('[data-gap-input="2"]')!;
    lane2.value = "2.511";
    lane2.dispatchEvent(new InputEvent("input", { bubbles: true }));

    app.root.querySelector<HTMLElement>('[data-action="calculate"]')?.click();

    expect(app.getState().showResults).toBe(true);
    expect(app.getState().calculationSnapshot?.computed.valid).toBe(true);
    expect(app.renderNow).toHaveBeenCalledWith({ type: "results" });
    expect(app.root.querySelector(".result-card")).not.toBeNull();
  });

  it("rejects calculate when live form values are invalid", () => {
    const app = mountBoundApp(sampleAppState());
    fillTimeInput(app.root, "#start-ts", "10:05:03.111");
    fillTimeInput(app.root, "#ref-elapsed", "01:23.450");

    const ref = app.root.querySelector<HTMLInputElement>("#ref-elapsed")!;
    ref.value = "not-valid";
    ref.dispatchEvent(new InputEvent("input", { bubbles: true }));

    app.root.querySelector<HTMLElement>('[data-action="calculate"]')?.click();

    expect(app.getState().showResults).toBe(false);
    expect(app.getState().calculationSnapshot).toBeNull();
    expect(app.getState().resultsStale).toBe(false);
    expect(document.getElementById("toast")?.textContent).toBeTruthy();
    expect(app.root.querySelector(".result-card")).toBeNull();
  });

  it("marks stale results when Calculate fails after a prior success", () => {
    const app = mountBoundApp(sampleAppState({ showResults: true }));
    fillTimeInput(app.root, "#start-ts", "10:05:03.111");
    fillTimeInput(app.root, "#ref-elapsed", "01:23.450");

    const ref = app.root.querySelector<HTMLInputElement>("#ref-elapsed")!;
    ref.value = "not-valid";
    ref.dispatchEvent(new InputEvent("input", { bubbles: true }));

    app.root.querySelector<HTMLElement>('[data-action="calculate"]')?.click();

    expect(app.getState().resultsStale).toBe(true);
    expect(app.getState().calculationSnapshot?.computed.valid).toBe(true);
    expect(app.root.querySelector(".results-stale-banner")?.textContent).toContain(
      "Calculation failed",
    );
    const lane2Copy = app.root.querySelector<HTMLButtonElement>('[data-result-lane="2"] button');
    const copyAll = Array.from(
      app.root.querySelectorAll<HTMLButtonElement>(".results-header-actions button"),
    ).find((button) => button.textContent === "Copy all");
    expect(lane2Copy?.disabled).toBe(true);
    expect(copyAll?.disabled).toBe(true);
  });

  it("uses the calculation snapshot race for copy all", async () => {
    const app = mountBoundApp(sampleAppState());
    fillTimeInput(app.root, "#start-ts", "10:05:03.111");
    fillTimeInput(app.root, "#ref-elapsed", "01:23.450");
    app.root.querySelector<HTMLElement>('[data-action="calculate"]')?.click();

    fillTimeInput(app.root, "#start-ts", "11:11:11.111");
    app.root.querySelector<HTMLElement>('[data-action="copy-all"]')?.click();
    await vi.waitFor(() => expect(clipboard.copyText).toHaveBeenCalled());

    const copiedAll = vi.mocked(clipboard.copyText).mock.calls.at(-1)?.[0] ?? "";
    expect(copiedAll).toContain("10:05:03.111");
    expect(copiedAll).not.toContain("11:11:11.111");
  });

  it("keeps copy-all aligned with displayed per-lane copy values after draft edits", async () => {
    const app = mountBoundApp(sampleAppState());
    fillTimeInput(app.root, "#start-ts", "10:05:03.111");
    fillTimeInput(app.root, "#ref-elapsed", "01:23.450");
    app.root.querySelector<HTMLElement>('[data-action="calculate"]')?.click();

    const lane2Before = app.root.querySelector<HTMLButtonElement>('[data-copy-lane="2"]')!;
    const displayedCopyValue = lane2Before.dataset.copyValue ?? "";

    const lane2 = app.root.querySelector<HTMLInputElement>('[data-gap-input="2"]')!;
    lane2.value = "9.999";
    lane2.dispatchEvent(new InputEvent("input", { bubbles: true }));

    app.root.querySelector<HTMLElement>('[data-action="copy-all"]')?.click();
    await vi.waitFor(() => expect(clipboard.copyText).toHaveBeenCalled());

    const copiedAll = vi.mocked(clipboard.copyText).mock.calls.at(-1)?.[0] ?? "";
    expect(copiedAll).toContain(displayedCopyValue);
    expect(copiedAll).not.toContain("09:999");
  });

  it("collapses and expands race context", () => {
    const app = mountBoundApp(sampleAppState());
    app.root.querySelector<HTMLElement>('[data-action="toggle-context"]')?.click();
    expect(app.getState().contextCollapsed).toBe(true);

    app.root.querySelector<HTMLElement>('[data-action="expand-context"]')?.click();
    expect(app.getState().contextCollapsed).toBe(false);
  });

  it("expands collapsed context from the keyboard", () => {
    const app = mountBoundApp(sampleAppState({ contextCollapsed: true }));
    const summary = app.root.querySelector<HTMLElement>('[data-action="expand-context"]')!;
    summary.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(app.getState().contextCollapsed).toBe(false);
  });

  it("updates the event label on input", () => {
    const app = mountBoundApp(sampleAppState());
    const label = app.root.querySelector<HTMLInputElement>("#event-label")!;
    label.value = "Mens 1V Heat 2";
    label.dispatchEvent(new InputEvent("input", { bubbles: true }));
    expect(app.getState().race.eventLabel).toBe("Mens 1V Heat 2");
  });

  it("announces validation errors on change", () => {
    const app = mountBoundApp(sampleAppState());
    const start = app.root.querySelector<HTMLInputElement>("#start-ts")!;
    start.value = "bad";
    start.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.getElementById("toast")?.textContent).toMatch(/HH:MM:SS/i);
  });

  it("copies a lane timestamp and marks it copied", async () => {
    const app = mountBoundApp(sampleAppState({ showResults: true }));
    applyRenderScope(app.root, app.getState(), { type: "results" });

    app.root.querySelector<HTMLButtonElement>('[data-copy-lane="2"]')?.click();
    await vi.waitFor(() => expect(app.getState().copiedLanes.has(2)).toBe(true));
    expect(clipboard.copyText).toHaveBeenCalled();
    expect(
      app.root.querySelector('[data-result-lane="2"]')?.classList.contains("copied"),
    ).toBe(true);
    expect(app.renderNow).toHaveBeenCalledWith({ type: "copied-lane", lane: 2 });
  });

  it("does not mark a lane copied when clipboard write fails", async () => {
    vi.mocked(clipboard.copyText).mockResolvedValue(false);
    const app = mountBoundApp(sampleAppState({ showResults: true }));
    applyRenderScope(app.root, app.getState(), { type: "results" });

    app.root.querySelector<HTMLButtonElement>('[data-copy-lane="2"]')?.click();
    await vi.waitFor(() =>
      expect(document.getElementById("toast")?.textContent).toBe("Select and copy manually"),
    );

    expect(app.getState().copiedLanes.has(2)).toBe(false);
    expect(
      app.root.querySelector('[data-result-lane="2"]')?.classList.contains("copied"),
    ).toBe(false);
    expect(app.renderNow).not.toHaveBeenCalledWith({ type: "copied-lane", lane: 2 });
  });

  describe("copied lane checklist", () => {
    async function copyLane(app: ReturnType<typeof mountBoundApp>, lane: number): Promise<void> {
      applyRenderScope(app.root, app.getState(), { type: "results" });
      app.root.querySelector<HTMLButtonElement>(`[data-copy-lane="${lane}"]`)?.click();
      await vi.waitFor(() => expect(app.getState().copiedLanes.has(lane)).toBe(true));
    }

    it("unmarks a copied lane on second tap without copying again", async () => {
      const app = mountBoundApp(sampleAppState({ showResults: true }));
      await copyLane(app, 2);
      vi.mocked(clipboard.copyText).mockClear();

      app.root.querySelector<HTMLButtonElement>('[data-copy-lane="2"]')?.click();
      await vi.waitFor(() => expect(app.getState().copiedLanes.has(2)).toBe(false));

      expect(clipboard.copyText).not.toHaveBeenCalled();
      expect(
        app.root.querySelector('[data-result-lane="2"]')?.classList.contains("copied"),
      ).toBe(false);
      expect(app.root.querySelector('[data-copy-lane="2"]')?.textContent).toBe("Copy timestamp");
    });

    it("keeps other copied lanes when one lane is unmarked", async () => {
      const app = mountBoundApp(sampleAppState({ showResults: true }));
      await copyLane(app, 2);
      await copyLane(app, 3);

      app.root.querySelector<HTMLButtonElement>('[data-copy-lane="2"]')?.click();
      await vi.waitFor(() => expect(app.getState().copiedLanes.has(2)).toBe(false));

      expect(app.getState().copiedLanes.has(3)).toBe(true);
      expect(
        app.root.querySelector('[data-result-lane="3"]')?.classList.contains("copied"),
      ).toBe(true);
    });

    it("clears all copied marks when Calculate runs", async () => {
      const app = mountBoundApp(sampleAppState({ showResults: true }));
      await copyLane(app, 2);

      fillTimeInput(app.root, "#start-ts", "10:05:03.111");
      fillTimeInput(app.root, "#ref-elapsed", "01:23.450");
      app.root.querySelector<HTMLElement>('[data-action="calculate"]')?.click();

      expect(app.getState().copiedLanes.size).toBe(0);
      expect(
        app.root.querySelector('[data-result-lane="2"]')?.classList.contains("copied"),
      ).toBe(false);
    });

    it("preserves copied marks when results are re-sorted", async () => {
      const app = mountBoundApp(sampleAppState({ showResults: true }));
      await copyLane(app, 2);

      app.root.querySelector<HTMLButtonElement>('[data-results-sort="lane"]')?.click();

      expect(app.getState().copiedLanes.has(2)).toBe(true);
      expect(
        app.root.querySelector('[data-result-lane="2"]')?.classList.contains("copied"),
      ).toBe(true);
    });
  });

  it("copies all results when valid", async () => {
    const app = mountBoundApp(sampleAppState({ showResults: true }));
    applyRenderScope(app.root, app.getState(), { type: "results" });

    app.root.querySelector<HTMLElement>('[data-action="copy-all"]')?.click();
    await vi.waitFor(() =>
      expect(document.getElementById("toast")?.textContent).toBe("Copied all results"),
    );
  });

  it("re-sorts visible results", () => {
    const app = mountBoundApp(sampleAppState({ showResults: true }));
    applyRenderScope(app.root, app.getState(), { type: "results" });

    app.root.querySelector<HTMLButtonElement>('[data-results-sort="lane"]')?.click();
    expect(app.getState().resultsSort).toBe("lane");
    expect(app.scheduleRender).toHaveBeenCalledWith({ type: "results" });
  });

  it("opens and confirms next race from footer actions", () => {
    renderFooter(true);
    const app = mountBoundApp(sampleAppState());

    document.querySelector<HTMLElement>('[data-action="next-race"]')?.click();
    expect(app.getState().confirmAction).toBe("nextRace");

    app.root.querySelector<HTMLElement>('[data-action="confirm-ok"]')?.click();
    expect(app.getState().confirmAction).toBeNull();
    expect(app.getState().race.eventLabel).toBe("");
    expect(app.getState().undoSnapshot).not.toBeNull();
  });

  it("opens and confirms clear judge from footer actions", () => {
    renderFooter(true);
    const app = mountBoundApp(sampleAppState());

    document.querySelector<HTMLElement>('[data-action="clear-judge"]')?.click();
    expect(app.getState().confirmAction).toBe("clearJudge");

    app.root.querySelector<HTMLElement>('[data-action="confirm-ok"]')?.click();
    expect(app.getState().race.referenceElapsedMs).toBeNull();
    expect(app.getState().showResults).toBe(false);
  });

  it("prompts before changing reference lane when gaps would reset", () => {
    const app = mountBoundApp(sampleAppState());
    const refLane = app.root.querySelector<HTMLSelectElement>("#ref-lane")!;
    refLane.value = "4";
    refLane.dispatchEvent(new Event("change", { bubbles: true }));

    expect(app.getState().confirmAction).toBe("changeRef");
    expect(app.getState().pendingReferenceLane).toBe(4);
  });

  it("prompts before removing the reference lane when judge data exists", () => {
    const app = mountBoundApp(sampleAppState({ race: sampleRaceWithReferenceLane10() }));

    app.root.querySelector<HTMLElement>('[data-action="remove-lane"]')?.click();
    expect(app.getState().confirmAction).toBe("removeLane");
  });

  it("clears judge data when confirming reference-lane removal", () => {
    const app = mountBoundApp(sampleAppState({ race: sampleRaceWithReferenceLane10() }));

    app.root.querySelector<HTMLElement>('[data-action="remove-lane"]')?.click();
    app.root.querySelector<HTMLElement>('[data-action="confirm-ok"]')?.click();

    expect(app.getState().confirmAction).toBeNull();
    expect(app.getState().race.lanes).toHaveLength(9);
    expect(app.getState().race.referenceLane).toBe(1);
    expect(app.getState().race.referenceElapsedMs).toBeNull();
    expect(app.getState().race.lanes.find((lane) => lane.lane === 2)?.gapMs).toBeNull();
  });

  it("expires the undo banner after 30 seconds", () => {
    vi.useFakeTimers();
    renderFooter(true);
    const app = mountBoundApp(sampleAppState());

    document.querySelector<HTMLElement>('[data-action="next-race"]')?.click();
    app.root.querySelector<HTMLElement>('[data-action="confirm-ok"]')?.click();
    expect(app.getState().undoSnapshot).not.toBeNull();
    expect(document.querySelector('[data-action="undo"]')).not.toBeNull();

    vi.advanceTimersByTime(30_000);
    expect(app.getState().undoSnapshot).toBeNull();
    expect(document.querySelector('[data-action="undo"]')).toBeNull();

    vi.useRealTimers();
  });

  it("restores the undo snapshot from the banner action", () => {
    renderFooter(true);
    const app = mountBoundApp(sampleAppState());
    const beforeLabel = app.getState().race.eventLabel;

    document.querySelector<HTMLElement>('[data-action="next-race"]')?.click();
    app.root.querySelector<HTMLElement>('[data-action="confirm-ok"]')?.click();
    expect(app.getState().race.eventLabel).toBe("");

    document.querySelector<HTMLElement>('[data-action="undo"]')?.click();
    expect(app.getState().race.eventLabel).toBe(beforeLabel);
    expect(app.getState().undoSnapshot).toBeNull();
  });

  it("cancels a pending confirmation dialog", () => {
    renderFooter(true);
    const app = mountBoundApp(sampleAppState());

    document.querySelector<HTMLElement>('[data-action="next-race"]')?.click();
    app.root.querySelector<HTMLElement>('[data-action="confirm-cancel"]')?.click();
    expect(app.getState().confirmAction).toBeNull();
  });

  it("switches reference lane immediately when the target lane already has a gap", () => {
    const app = mountBoundApp(sampleAppState());
    const refLane = app.root.querySelector<HTMLSelectElement>("#ref-lane")!;
    refLane.value = "2";
    refLane.dispatchEvent(new Event("change", { bubbles: true }));

    expect(app.getState().confirmAction).toBeNull();
    expect(app.getState().race.referenceLane).toBe(2);
  });

  it("confirms a pending reference-lane change", () => {
    const app = mountBoundApp(sampleAppState());
    const refLane = app.root.querySelector<HTMLSelectElement>("#ref-lane")!;
    refLane.value = "4";
    refLane.dispatchEvent(new Event("change", { bubbles: true }));

    app.root.querySelector<HTMLElement>('[data-action="confirm-ok"]')?.click();
    expect(app.getState().race.referenceLane).toBe(4);
    expect(app.getState().confirmAction).toBeNull();
  });

  it("persists start confirmation and gap blur updates", () => {
    const app = mountBoundApp(
      sampleAppState({
        race: touchRace({
          ...sampleAppState().race,
          startDate: "2020-01-01",
          startConfirmed: false,
        }),
      }),
    );

    const confirmed = app.root.querySelector<HTMLInputElement>("#start-confirmed")!;
    confirmed.checked = true;
    confirmed.dispatchEvent(new Event("change", { bubbles: true }));
    expect(app.getState().race.startConfirmed).toBe(true);

    const lane2 = app.root.querySelector<HTMLInputElement>('[data-gap-input="2"]')!;
    lane2.value = "3.000";
    lane2.dispatchEvent(new Event("blur", { bubbles: true }));
    expect(app.getState().race.lanes.find((lane) => lane.lane === 2)?.gapMs).toBe(3_000);
  });

  it("commits reference elapsed on blur", () => {
    const app = mountBoundApp(sampleAppState());
    const ref = app.root.querySelector<HTMLInputElement>("#ref-elapsed")!;
    ref.value = "02:00.000";
    ref.dispatchEvent(new Event("blur", { bubbles: true }));
    expect(app.getState().race.referenceElapsedMs).toBe(120_000);
  });

  it("ignores invalid reference elapsed on blur", () => {
    const app = mountBoundApp(sampleAppState());
    const before = app.getState().race.referenceElapsedMs;
    const ref = app.root.querySelector<HTMLInputElement>("#ref-elapsed")!;
    ref.value = "bad";
    ref.dispatchEvent(new Event("blur", { bubbles: true }));
    expect(app.getState().race.referenceElapsedMs).toBe(before);
    expect(document.getElementById("ref-elapsed-hint")?.textContent).toBeTruthy();
    expect(ref.getAttribute("aria-invalid")).toBe("true");
  });

  it("ignores invalid lane gap on blur", () => {
    const app = mountBoundApp(sampleAppState());
    const before = app.getState().race.lanes.find((lane) => lane.lane === 2)?.gapMs;
    const lane2 = app.root.querySelector<HTMLInputElement>('[data-gap-input="2"]')!;
    lane2.value = "not-a-gap";
    lane2.dispatchEvent(new Event("blur", { bubbles: true }));
    expect(app.getState().race.lanes.find((lane) => lane.lane === 2)?.gapMs).toBe(before);
    expect(document.getElementById("gap-2-hint")?.textContent).toBeTruthy();
  });

  it("does not commit reference elapsed on input alone", () => {
    const app = mountBoundApp(sampleAppState());
    const before = app.getState().race.referenceElapsedMs;
    const ref = app.root.querySelector<HTMLInputElement>("#ref-elapsed")!;
    ref.value = "7";
    ref.dispatchEvent(new InputEvent("input", { bubbles: true }));
    expect(app.getState().race.referenceElapsedMs).toBe(before);

    ref.value = "07:23.450";
    ref.dispatchEvent(new Event("blur", { bubbles: true }));
    expect(app.getState().race.referenceElapsedMs).toBe(443_450);
  });

  it("does not commit lane gap on input alone", () => {
    const app = mountBoundApp(sampleAppState());
    const before = app.getState().race.lanes.find((lane) => lane.lane === 2)?.gapMs;
    const lane2 = app.root.querySelector<HTMLInputElement>('[data-gap-input="2"]')!;
    lane2.value = "7";
    lane2.dispatchEvent(new InputEvent("input", { bubbles: true }));
    expect(app.getState().race.lanes.find((lane) => lane.lane === 2)?.gapMs).toBe(before);

    lane2.value = "2.511";
    lane2.dispatchEvent(new Event("blur", { bubbles: true }));
    expect(app.getState().race.lanes.find((lane) => lane.lane === 2)?.gapMs).toBe(2_511);
  });

  it("shows inline validation while typing invalid reference elapsed", () => {
    const app = mountBoundApp(sampleAppState());
    const ref = app.root.querySelector<HTMLInputElement>("#ref-elapsed")!;
    ref.value = "0:99.000";
    ref.dispatchEvent(new InputEvent("input", { bubbles: true }));
    expect(document.getElementById("ref-elapsed-hint")?.textContent).toContain("59");
  });

  it("does not copy all when results are stale", async () => {
    const app = mountBoundApp(sampleAppState({ showResults: true }));
    applyRenderScope(app.root, app.getState(), { type: "results" });
    vi.mocked(clipboard.copyText).mockClear();

    app.setState((state) => ({ ...state, resultsStale: true }));
    app.root.querySelector<HTMLElement>('[data-action="copy-all"]')?.click();
    await Promise.resolve();

    expect(clipboard.copyText).not.toHaveBeenCalled();
  });

  it("does not copy a lane when results are stale", async () => {
    const app = mountBoundApp(sampleAppState({ showResults: true }));
    applyRenderScope(app.root, app.getState(), { type: "results" });
    vi.mocked(clipboard.copyText).mockClear();

    app.setState((state) => ({ ...state, resultsStale: true }));
    app.root.querySelector<HTMLButtonElement>('[data-result-lane="2"] button')?.click();
    await Promise.resolve();

    expect(clipboard.copyText).not.toHaveBeenCalled();
  });

  it("announces manual copy when copy all fails", async () => {
    vi.mocked(clipboard.copyText).mockResolvedValue(false);
    const app = mountBoundApp(sampleAppState({ showResults: true }));
    applyRenderScope(app.root, app.getState(), { type: "results" });

    app.root.querySelector<HTMLElement>('[data-action="copy-all"]')?.click();
    await vi.waitFor(() =>
      expect(document.getElementById("toast")?.textContent).toBe("Select and copy manually"),
    );
  });

  it("does not mark results stale when calculate fails before any prior snapshot", () => {
    const app = mountBoundApp({ ...createInitialState(), race: createEmptyRace() });
    app.root.querySelector<HTMLElement>('[data-action="calculate"]')?.click();
    expect(app.getState().resultsStale).toBe(false);
    expect(app.getState().calculationSnapshot).toBeNull();
  });

  it("ignores context collapse when start and reference elapsed are missing", () => {
    const app = mountBoundApp(
      sampleAppState({
        race: touchRace(createEmptyRace()),
      }),
    );
    expect(app.root.querySelector('[data-action="toggle-context"]')).toBeNull();
  });

  it("clears an orphaned reference-lane confirmation through confirm ok", () => {
    const app = mountBoundApp(
      sampleAppState({ confirmAction: "changeRef", pendingReferenceLane: null }),
    );
    applyRenderScope(app.root, app.getState(), { type: "dialog" });

    app.root.querySelector<HTMLElement>('[data-action="confirm-ok"]')?.click();

    expect(app.getState().confirmAction).toBeNull();
    expect(app.scheduleRender).toHaveBeenCalledWith({ type: "dialog" });
  });

  it("marks results stale when compute rejects missing reference elapsed", () => {
    const app = mountBoundApp(sampleAppState({ showResults: true }));

    const ref = app.root.querySelector<HTMLInputElement>("#ref-elapsed")!;
    ref.value = "";
    ref.dispatchEvent(new InputEvent("input", { bubbles: true }));

    app.root.querySelector<HTMLElement>('[data-action="calculate"]')?.click();

    expect(app.getState().resultsStale).toBe(true);
    expect(document.getElementById("toast")?.textContent).toContain("reference elapsed");
  });

  it("expires undo after clear judge", () => {
    vi.useFakeTimers();
    renderFooter(true);
    const app = mountBoundApp(sampleAppState());

    document.querySelector<HTMLElement>('[data-action="clear-judge"]')?.click();
    app.root.querySelector<HTMLElement>('[data-action="confirm-ok"]')?.click();
    expect(app.getState().undoSnapshot).not.toBeNull();

    vi.advanceTimersByTime(30_000);
    expect(app.getState().undoSnapshot).toBeNull();

    vi.useRealTimers();
  });
});
