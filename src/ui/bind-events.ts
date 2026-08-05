import {
  addLane,
  clearJudgeData,
  formatCopyAll,
  nextRace,
  persistRace,
  removeLane,
  setReferenceLane,
  type ComputedRace,
  type RaceDraft,
} from "../lib/race-state";
import { canCollapseContext, sortResults } from "../lib/ui-helpers";
import {
  formatElapsedWhileTyping,
  formatGapWhileTyping,
  formatTimestampWhileTyping,
} from "../lib/time";
import { copyText } from "../app/clipboard";
import { DEFAULT_ELAPSED } from "../app/constants";
import {
  applyInputFormat,
  applyLaneGap,
  applyReferenceElapsed,
  applyStartTimestamp,
  commitAllFormFields,
  updateRaceDraft,
} from "../app/form-sync";
import { clearUndoSnapshot, saveUndoSnapshot } from "../app/state";
import type { AppState, ResultsSort } from "../app/types";
import { announce } from "./toast";

export interface AppActions {
  getState(): AppState;
  setState(updater: (state: AppState) => AppState): void;
  updateRace(updater: (race: RaceDraft) => RaceDraft): void;
  render(): void;
}

export function bindEvents(
  root: HTMLElement,
  actions: AppActions,
  computed: ComputedRace,
): void {
  const { getState, setState, updateRace, render } = actions;

  root.querySelector('[data-action="calculate"]')?.addEventListener("click", () => {
    (document.activeElement as HTMLElement | null)?.blur();
    const { state } = commitAllFormFields(getState(), root);
    setState(() => ({ ...state, showResults: true }));
    render();
    document.getElementById("results-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  root.querySelector("#event-label")?.addEventListener("input", (e) => {
    const value = (e.target as HTMLInputElement).value;
    updateRace((race) => ({ ...race, eventLabel: value }));
  });

  root.querySelector("#start-ts")?.addEventListener("input", (e) => {
    const input = e.target as HTMLInputElement;
    applyInputFormat(input, formatTimestampWhileTyping);
    const { state, error } = applyStartTimestamp(getState(), input.value);
    if (error) return;
    setState(() => state);
  });

  root.querySelector("#start-ts")?.addEventListener("change", (e) => {
    const { state, error } = applyStartTimestamp(getState(), (e.target as HTMLInputElement).value);
    if (error) {
      announce(error);
      return;
    }
    setState(() => state);
    render();
  });

  root.querySelector("#start-confirmed")?.addEventListener("change", (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    updateRace((race) => ({ ...race, startConfirmed: checked }));
  });

  root.querySelector("#ref-elapsed")?.addEventListener("input", (e) => {
    const input = e.target as HTMLInputElement;
    const value = applyInputFormat(input, formatElapsedWhileTyping);
    const refInput = root.querySelector<HTMLInputElement>(
      `[data-gap-input="${getState().race.referenceLane}"]`,
    );
    if (refInput) {
      refInput.value = value || DEFAULT_ELAPSED;
    }
    const { state, error } = applyReferenceElapsed(getState(), value);
    if (error) return;
    setState(() => state);
  });

  root.querySelector("#ref-elapsed")?.addEventListener("change", (e) => {
    const { state, error } = applyReferenceElapsed(getState(), (e.target as HTMLInputElement).value);
    if (error) {
      announce(error);
      return;
    }
    setState(() => state);
    render();
  });

  root.querySelector("#ref-elapsed")?.addEventListener("blur", (e) => {
    const { state, error } = applyReferenceElapsed(getState(), (e.target as HTMLInputElement).value);
    if (error) return;
    setState(() => state);
  });

  root.querySelector('[data-action="add-lane"]')?.addEventListener("click", () => {
    updateRace((race) => addLane(race));
  });

  root.querySelector('[data-action="remove-lane"]')?.addEventListener("click", () => {
    updateRace((race) => removeLane(race));
  });

  root.querySelector("#ref-lane")?.addEventListener("change", (e) => {
    const state = getState();
    const lane = Number((e.target as HTMLSelectElement).value);
    if (lane === state.race.referenceLane) return;

    const hasGaps = state.race.lanes.some(
      (l) => l.lane !== state.race.referenceLane && l.gapMs !== null,
    );
    const newRefLane = state.race.lanes.find((l) => l.lane === lane);

    if (
      hasGaps &&
      (!newRefLane || newRefLane.status !== "active" || newRefLane.gapMs === null)
    ) {
      setState((s) => ({
        ...s,
        pendingReferenceLane: lane,
        confirmAction: "changeRef",
      }));
      render();
      return;
    }

    updateRace((race) => setReferenceLane(race, lane, false));
  });

  root.querySelector('[data-action="toggle-context"]')?.addEventListener("click", (e) => {
    e.stopPropagation();
    const state = getState();
    if (!canCollapseContext(state.race)) return;
    setState((s) => ({ ...s, contextCollapsed: !s.contextCollapsed }));
    render();
  });

  root.querySelector('[data-action="expand-context"]')?.addEventListener("click", () => {
    setState((s) => ({ ...s, contextCollapsed: false }));
    render();
  });

  root.querySelector('[data-action="expand-context"]')?.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter" || (e as KeyboardEvent).key === " ") {
      e.preventDefault();
      setState((s) => ({ ...s, contextCollapsed: false }));
      render();
    }
  });

  root.querySelectorAll("[data-gap-sign]").forEach((el) => {
    el.addEventListener("click", (e) => {
      const laneNum = Number((e.target as HTMLButtonElement).dataset.gapSign);
      updateRace((race) => ({
        ...race,
        lanes: race.lanes.map((lane) =>
          lane.lane === laneNum ? { ...lane, gapNegative: !lane.gapNegative } : lane,
        ),
      }));
    });
  });

  root.querySelectorAll("[data-gap-input]").forEach((el) => {
    el.addEventListener("input", (e) => {
      const input = e.target as HTMLInputElement;
      if (input.readOnly) return;
      applyInputFormat(input, formatGapWhileTyping);
      const { state, error } = applyLaneGap(getState(), Number(input.dataset.gapInput), input.value);
      if (error) return;
      setState(() => state);
    });

    el.addEventListener("change", (e) => {
      const input = e.target as HTMLInputElement;
      const { state, error } = applyLaneGap(getState(), Number(input.dataset.gapInput), input.value);
      if (error) {
        announce(error);
        return;
      }
      setState(() => state);
      render();
    });

    el.addEventListener("blur", (e) => {
      const input = e.target as HTMLInputElement;
      if (input.readOnly) return;
      const { state, error } = applyLaneGap(getState(), Number(input.dataset.gapInput), input.value);
      if (error) return;
      setState(() => state);
    });
  });

  root.querySelectorAll("[data-status-value]").forEach((el) => {
    el.addEventListener("click", (e) => {
      const btn = e.target as HTMLButtonElement;
      if (btn.disabled) return;

      const laneNum = Number(btn.dataset.status);
      const status = btn.dataset.statusValue as "active" | "empty";
      updateRace((race) => ({
        ...race,
        lanes: race.lanes.map((lane) => {
          if (lane.lane !== laneNum) return lane;
          if (status === "empty") {
            return { ...lane, status, gapMs: null, gapNegative: false };
          }
          return { ...lane, status };
        }),
      }));
    });
  });

  root.querySelectorAll("[data-clear-lane]").forEach((el) => {
    el.addEventListener("click", (e) => {
      const laneNum = Number((e.target as HTMLButtonElement).dataset.clearLane);
      updateRace((race) => ({
        ...race,
        lanes: race.lanes.map((lane) =>
          lane.lane === laneNum
            ? { ...lane, gapMs: null, gapNegative: false, status: "active" }
            : lane,
        ),
      }));
    });
  });

  root.querySelectorAll("[data-results-sort]").forEach((el) => {
    el.addEventListener("click", (e) => {
      const sort = (e.target as HTMLButtonElement).dataset.resultsSort as ResultsSort;
      const state = getState();
      if (sort === state.resultsSort) return;
      setState((s) => ({ ...s, resultsSort: sort }));
      render();
    });
  });

  root.querySelectorAll("[data-copy-lane]").forEach((el) => {
    el.addEventListener("click", async (e) => {
      const btn = e.target as HTMLButtonElement;
      const lane = Number(btn.dataset.copyLane);
      const value = btn.dataset.copyValue ?? "";
      const ok = await copyText(value);
      if (ok) {
        setState((s) => {
          const copiedLanes = new Set(s.copiedLanes);
          copiedLanes.add(lane);
          return { ...s, copiedLanes };
        });
        announce(`Copied ${value}`);
        render();
      } else {
        announce("Select and copy manually");
      }
    });
  });

  root.querySelector('[data-action="copy-all"]')?.addEventListener("click", async () => {
    if (!computed.valid) return;
    const state = getState();
    const text = formatCopyAll(state.race, sortResults(computed.results, state.resultsSort));
    const ok = await copyText(text);
    announce(ok ? "Copied all results" : "Select and copy manually");
  });

  document.querySelector('[data-action="next-race"]')?.addEventListener("click", () => {
    setState((s) => ({ ...s, confirmAction: "nextRace" }));
    render();
  });

  document.querySelector('[data-action="clear-judge"]')?.addEventListener("click", () => {
    setState((s) => ({ ...s, confirmAction: "clearJudge" }));
    render();
  });

  document.querySelector('[data-action="confirm-cancel"]')?.addEventListener("click", () => {
    setState((s) => ({ ...s, confirmAction: null, pendingReferenceLane: null }));
    render();
  });

  document.querySelector('[data-action="confirm-ok"]')?.addEventListener("click", () => {
    const state = getState();

    if (state.confirmAction === "nextRace") {
      const undo = saveUndoSnapshot(state, render);
      setState((s) => ({
        ...s,
        ...undo,
        race: nextRace(),
        restoredBanner: false,
        copiedLanes: new Set(),
        contextCollapsed: false,
        showResults: false,
        confirmAction: null,
        pendingReferenceLane: null,
      }));
    } else if (state.confirmAction === "clearJudge") {
      const undo = saveUndoSnapshot(state, render);
      const race = clearJudgeData(state.race);
      persistRace(race);
      setState((s) => ({
        ...s,
        ...undo,
        race,
        copiedLanes: new Set(),
        showResults: false,
        confirmAction: null,
        pendingReferenceLane: null,
      }));
    } else if (state.confirmAction === "changeRef" && state.pendingReferenceLane !== null) {
      const pendingLane = state.pendingReferenceLane;
      setState((s) => ({
        ...updateRaceDraft(s, (race) => setReferenceLane(race, pendingLane, true)),
        confirmAction: null,
        pendingReferenceLane: null,
      }));
    } else {
      setState((s) => ({ ...s, confirmAction: null, pendingReferenceLane: null }));
    }

    render();
    root.querySelector<HTMLElement>("#event-label, #start-ts")?.focus();
  });

  document.querySelector('[data-action="undo"]')?.addEventListener("click", () => {
    const state = getState();
    if (!state.undoSnapshot) return;

    const race = state.undoSnapshot;
    persistRace(race);
    setState((s) => ({
      ...s,
      race,
      ...clearUndoSnapshot(s),
    }));
    render();
  });
}
