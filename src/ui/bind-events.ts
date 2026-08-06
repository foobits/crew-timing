import {
  addLane,
  clearJudgeData,
  computeRace,
  formatCopyAll,
  nextRace,
  removeLane,
  removeLaneClearingJudgeData,
  setReferenceLane,
  wouldRemoveReferenceLaneWithJudgeData,
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
import { flushPersistRace } from "../app/persist-scheduler";
import type { RenderScope } from "../app/render-scope";
import { isInstantScrollPreferred } from "../app/render-scope";
import {
  applyInputFormat,
  applyLaneGap,
  applyReferenceElapsed,
  applyStartTimestamp,
  commitAllFormFields,
  updateRaceDraft,
} from "../app/form-sync";
import { applyLaneGapToRace, isFieldApplyFailure } from "../lib/form-commit";
import {
  validateLaneGapInput,
  validateReferenceElapsedInput,
  validateStartTimestampInput,
} from "../lib/field-validation";
import { clearUndoSnapshot, saveUndoSnapshot } from "../app/state";
import type { AppState, ResultsSort } from "../app/types";
import { setInputValidationHint, syncTimeInputValidationHints } from "./input-hints";
import { announce } from "./toast";

export interface AppActions {
  getState(): AppState;
  setState(updater: (state: AppState) => AppState): void;
  updateRace(updater: (race: RaceDraft) => RaceDraft, scope?: RenderScope): void;
  scheduleRender(scope: RenderScope): void;
  renderNow(scope: RenderScope): void;
  getComputed(): ReturnType<typeof computeRace>;
}

export function bindEventsOnce(root: HTMLElement, actions: AppActions): void {
  const { getState, setState, updateRace, scheduleRender, renderNow } = actions;

  function commitReferenceElapsedInput(target: HTMLInputElement, announceError: boolean): boolean {
    const { state, error } = applyReferenceElapsed(getState(), target.value);
    if (error) {
      setInputValidationHint(target, error);
      if (announceError) announce(error);
      return false;
    }
    setInputValidationHint(target, null);
    setState(() => state);
    return true;
  }

  function commitLaneGapInput(target: HTMLInputElement, laneNum: number, announceError: boolean): boolean {
    const { state, error } = applyLaneGap(getState(), laneNum, target.value);
    if (error) {
      setInputValidationHint(target, error);
      if (announceError) announce(error);
      return false;
    }
    setInputValidationHint(target, null);
    setState(() => state);
    return true;
  }

  function toggleGapSign(laneNum: number): void {
    const gapInput = root.querySelector<HTMLInputElement>(`[data-gap-input="${laneNum}"]`);

    updateRace((race) => {
      let nextRace = race;
      if (gapInput && !gapInput.readOnly) {
        const result = applyLaneGapToRace(race, laneNum, gapInput.value);
        if (!isFieldApplyFailure(result)) {
          nextRace = result.race;
        }
      }

      return {
        ...nextRace,
        lanes: nextRace.lanes.map((lane) =>
          lane.lane === laneNum ? { ...lane, gapNegative: !lane.gapNegative } : lane,
        ),
      };
    }, { type: "lane-row", lane: laneNum });
  }

  // Mobile Safari blurs a focused gap input on the first tap outside; click never fires.
  root.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const gapSign = target.closest<HTMLElement>("[data-gap-sign]");
      if (!gapSign?.dataset.gapSign) return;

      event.preventDefault();
      toggleGapSign(Number(gapSign.dataset.gapSign));
    },
    true,
  );

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const actionEl = target.closest<HTMLElement>("[data-action]");
    if (actionEl?.dataset.action) {
      handleAction(actionEl.dataset.action, actionEl);
      return;
    }

    const statusBtn = target.closest<HTMLButtonElement>("[data-status-value]");
    if (statusBtn && !statusBtn.disabled) {
      const laneNum = Number(statusBtn.dataset.status);
      const status = statusBtn.dataset.statusValue as "active" | "empty";
      updateRace(
        (race) => ({
          ...race,
          lanes: race.lanes.map((lane) => {
            if (lane.lane !== laneNum) return lane;
            if (status === "empty") {
              return { ...lane, status, gapMs: null, gapNegative: false };
            }
            return { ...lane, status };
          }),
        }),
        { type: "lane-row", lane: laneNum },
      );
      return;
    }

    const clearLaneBtn = target.closest<HTMLElement>("[data-clear-lane]");
    if (clearLaneBtn?.dataset.clearLane) {
      const laneNum = Number(clearLaneBtn.dataset.clearLane);
      updateRace(
        (race) => ({
          ...race,
          lanes: race.lanes.map((lane) =>
            lane.lane === laneNum
              ? { ...lane, gapMs: null, gapNegative: false, status: "active" }
              : lane,
          ),
        }),
        { type: "lane-row", lane: laneNum },
      );
      return;
    }

    const copyBtn = target.closest<HTMLButtonElement>("[data-copy-lane]");
    if (copyBtn?.dataset.copyLane) {
      void handleCopyLane(copyBtn);
      return;
    }

    const sortBtn = target.closest<HTMLButtonElement>("[data-results-sort]");
    if (sortBtn?.dataset.resultsSort) {
      const sort = sortBtn.dataset.resultsSort as ResultsSort;
      const state = getState();
      if (sort === state.resultsSort) return;
      setState((s) => ({ ...s, resultsSort: sort }));
      scheduleRender({ type: "results" });
    }
  });

  root.addEventListener("keydown", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest('[data-action="expand-context"]')) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setState((s) => ({ ...s, contextCollapsed: false }));
    scheduleRender({ type: "context" });
  });

  root.addEventListener(
    "input",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;

      if (target.id === "event-label") {
        setState((s) =>
          updateRaceDraft(s, (race) => ({ ...race, eventLabel: target.value }), {
            persist: "debounced",
          }),
        );
        return;
      }

      if (target.id === "start-ts") {
        applyInputFormat(target, formatTimestampWhileTyping);
        const validationError = validateStartTimestampInput(target.value);
        if (validationError) {
          setInputValidationHint(target, validationError);
          return;
        }
        setInputValidationHint(target, null);
        const { state, error } = applyStartTimestamp(getState(), target.value);
        if (error) return;
        setState(() => state);
        return;
      }

      if (target.id === "ref-elapsed") {
        const value = applyInputFormat(target, formatElapsedWhileTyping);
        syncReferenceLaneGapInput(root, getState().race.referenceLane, value);
        setInputValidationHint(target, validateReferenceElapsedInput(value));
        return;
      }

      if (target.dataset.gapInput && !target.readOnly) {
        applyInputFormat(target, formatGapWhileTyping);
        setInputValidationHint(target, validateLaneGapInput(target.value));
      }
    },
    true,
  );

  root.addEventListener(
    "change",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) {
        return;
      }

      if (target.id === "start-ts" && target instanceof HTMLInputElement) {
        const validationError = validateStartTimestampInput(target.value);
        if (validationError) {
          setInputValidationHint(target, validationError);
          announce(validationError);
          return;
        }
        const { state, error } = applyStartTimestamp(getState(), target.value);
        if (error) {
          setInputValidationHint(target, error);
          announce(error);
          return;
        }
        setInputValidationHint(target, null);
        setState(() => state);
        scheduleRender({ type: "context" });
        return;
      }

      if (target.id === "start-confirmed" && target instanceof HTMLInputElement) {
        updateRace((race) => ({ ...race, startConfirmed: target.checked }), { type: "context" });
        return;
      }

      if (target.id === "ref-elapsed" && target instanceof HTMLInputElement) {
        if (commitReferenceElapsedInput(target, true)) {
          scheduleRender({ type: "lane-row", lane: getState().race.referenceLane });
        }
        return;
      }

      if (target.id === "ref-lane") {
        handleReferenceLaneChange(Number(target.value));
        return;
      }

      if (target instanceof HTMLInputElement && target.dataset.gapInput) {
        const laneNum = Number(target.dataset.gapInput);
        if (commitLaneGapInput(target, laneNum, true)) {
          scheduleRender({ type: "lane-row", lane: laneNum });
        }
      }
    },
    true,
  );

  root.addEventListener(
    "blur",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;

      if (target.id === "ref-elapsed") {
        commitReferenceElapsedInput(target, false);
        return;
      }

      if (target.dataset.gapInput && !target.readOnly) {
        commitLaneGapInput(target, Number(target.dataset.gapInput), false);
      }
    },
    true,
  );

  document.body.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const actionEl = target.closest<HTMLElement>("[data-action]");
    const action = actionEl?.dataset.action;
    if (!action) return;

    if (action === "next-race" || action === "clear-judge") {
      setState((s) => ({
        ...s,
        confirmAction: action === "next-race" ? "nextRace" : "clearJudge",
      }));
      scheduleRender({ type: "dialog" });
      return;
    }

    if (action === "undo") {
      handleUndo();
    }
  });

  function handleAction(action: string, _el: HTMLElement): void {
    switch (action) {
      case "calculate":
        (document.activeElement as HTMLElement | null)?.blur();
        {
          const previous = getState();
          const { state, errors } = commitAllFormFields(previous, root);
          if (errors.length > 0) {
            announce(errors.join(" "));
            syncTimeInputValidationHints(root);
            if (previous.calculationSnapshot?.computed.valid) {
              setState((s) => ({ ...s, resultsStale: true }));
              renderNow({ type: "results" });
            }
            return;
          }
          const computed = computeRace(state.race);
          if (!computed.valid) {
            announce(computed.errors.join(" "));
            if (previous.calculationSnapshot?.computed.valid) {
              setState((s) => ({ ...s, resultsStale: true }));
              renderNow({ type: "results" });
            }
            return;
          }
          setState(() => ({
            ...state,
            showResults: true,
            calculationSnapshot: {
              race: structuredClone(state.race),
              computed,
            },
            resultsStale: false,
            copiedLanes: new Set(),
          }));
          renderNow({ type: "results" });
          document.getElementById("results-card")?.scrollIntoView({
            behavior: isInstantScrollPreferred() ? "auto" : "smooth",
            block: "start",
          });
        }
        break;
      case "add-lane":
        updateRace((race) => addLane(race), { type: "lanes" });
        break;
      case "remove-lane":
        if (wouldRemoveReferenceLaneWithJudgeData(getState().race)) {
          setState((s) => ({ ...s, confirmAction: "removeLane" }));
          scheduleRender({ type: "dialog" });
          break;
        }
        updateRace((race) => removeLane(race), { type: "lanes" });
        break;
      case "toggle-context":
        {
          const state = getState();
          if (!canCollapseContext(state.race)) return;
          setState((s) => ({ ...s, contextCollapsed: !s.contextCollapsed }));
          scheduleRender({ type: "context" });
        }
        break;
      case "expand-context":
        setState((s) => ({ ...s, contextCollapsed: false }));
        scheduleRender({ type: "context" });
        break;
      case "copy-all":
        void handleCopyAll();
        break;
      case "confirm-cancel":
        setState((s) => ({ ...s, confirmAction: null, pendingReferenceLane: null }));
        scheduleRender({ type: "dialog" });
        break;
      case "confirm-ok":
        handleConfirmOk();
        break;
    }
  }

  function handleReferenceLaneChange(lane: number): void {
    const state = getState();
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
      scheduleRender({ type: "dialog" });
      return;
    }

    updateRace((race) => setReferenceLane(race, lane, false), { type: "lanes" });
  }

  async function handleCopyLane(btn: HTMLButtonElement): Promise<void> {
    const lane = Number(btn.dataset.copyLane);
    const state = getState();
    if (state.resultsStale) return;

    if (state.copiedLanes.has(lane)) {
      setState((s) => {
        const copiedLanes = new Set(s.copiedLanes);
        copiedLanes.delete(lane);
        return { ...s, copiedLanes };
      });
      renderNow({ type: "copied-lane", lane });
      return;
    }

    const value = btn.dataset.copyValue ?? "";
    const ok = await copyText(value);
    if (ok) {
      setState((s) => {
        const copiedLanes = new Set(s.copiedLanes);
        copiedLanes.add(lane);
        return { ...s, copiedLanes };
      });
      announce(`Copied ${value}`);
      renderNow({ type: "copied-lane", lane });
    } else {
      announce("Select and copy manually");
    }
  }

  async function handleCopyAll(): Promise<void> {
    const state = getState();
    const snapshot = state.calculationSnapshot;
    if (!snapshot?.computed.valid || state.resultsStale) return;
    const text = formatCopyAll(
      snapshot.race,
      sortResults(snapshot.computed.results, state.resultsSort),
    );
    const ok = await copyText(text);
    announce(ok ? "Copied all results" : "Select and copy manually");
  }

  function handleConfirmOk(): void {
    const state = getState();

    if (state.confirmAction === "nextRace") {
      const undo = saveUndoSnapshot(state, () => {
        setState((s) => ({ ...s, ...clearUndoSnapshot(s) }));
        scheduleRender({ type: "banners" });
      });
      setState((s) => ({
        ...s,
        ...undo,
        race: nextRace(),
        restoredBanner: false,
        copiedLanes: new Set(),
        contextCollapsed: false,
        showResults: false,
        calculationSnapshot: null,
        resultsStale: false,
        confirmAction: null,
        pendingReferenceLane: null,
      }));
      flushPersistRace(getState().race);
      renderNow({ type: "full" });
    } else if (state.confirmAction === "clearJudge") {
      const undo = saveUndoSnapshot(state, () => {
        setState((s) => ({ ...s, ...clearUndoSnapshot(s) }));
        scheduleRender({ type: "banners" });
      });
      const race = clearJudgeData(state.race);
      flushPersistRace(race);
      setState((s) => ({
        ...s,
        ...undo,
        race,
        copiedLanes: new Set(),
        showResults: false,
        calculationSnapshot: null,
        resultsStale: false,
        confirmAction: null,
        pendingReferenceLane: null,
      }));
      renderNow({ type: "full" });
    } else if (state.confirmAction === "removeLane") {
      setState((s) => ({
        ...s,
        ...updateRaceDraft(s, (race) => removeLaneClearingJudgeData(race)),
        confirmAction: null,
      }));
      renderNow({ type: "full" });
    } else if (state.confirmAction === "changeRef" && state.pendingReferenceLane !== null) {
      const pendingLane = state.pendingReferenceLane;
      setState((s) => ({
        ...updateRaceDraft(s, (race) => setReferenceLane(race, pendingLane, true)),
        confirmAction: null,
        pendingReferenceLane: null,
      }));
      renderNow({ type: "full" });
    } else {
      setState((s) => ({ ...s, confirmAction: null, pendingReferenceLane: null }));
      scheduleRender({ type: "dialog" });
    }

    root.querySelector<HTMLElement>("#event-label, #start-ts")?.focus();
  }

  function handleUndo(): void {
    const state = getState();
    if (!state.undoSnapshot) return;

    const race = state.undoSnapshot;
    flushPersistRace(race);
    setState((s) => ({
      ...s,
      race,
      ...clearUndoSnapshot(s),
    }));
    renderNow({ type: "full" });
  }
}

function syncReferenceLaneGapInput(
  root: HTMLElement,
  referenceLane: number,
  value: string,
): void {
  const refInput = root.querySelector<HTMLInputElement>(`[data-gap-input="${referenceLane}"]`);
  if (refInput) {
    refInput.value = value || DEFAULT_ELAPSED;
  }
}
