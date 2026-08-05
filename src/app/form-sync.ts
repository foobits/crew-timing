import {
  applyLaneGapToRace,
  applyReferenceElapsedToRace,
  applyStartTimestampToRace,
  commitPendingFormFields,
  isFieldApplyFailure,
} from "../lib/form-commit";
import { applyInputFormatValue } from "../lib/ui-helpers";
import { hasRaceData, persistRace, type RaceDraft } from "../lib/race-state";
import type { AppState } from "./types";

export function applyInputFormat(
  input: HTMLInputElement,
  format: (value: string) => string,
): string {
  const formatted = applyInputFormatValue(input.value, format);
  if (formatted !== input.value) {
    input.value = formatted;
  }
  return formatted;
}

export function applyStartTimestamp(
  state: AppState,
  value: string,
): { state: AppState; error?: string; clearRestoredBanner?: boolean } {
  const result = applyStartTimestampToRace(state.race, value);
  if (isFieldApplyFailure(result)) {
    return { state, error: result.error };
  }

  let next = { ...state, race: result.race };
  if (hasRaceData(next.race)) {
    persistRace(next.race);
  }
  if (value.trim()) {
    next = { ...next, restoredBanner: false };
  }
  return { state: next, clearRestoredBanner: Boolean(value.trim()) };
}

export function applyReferenceElapsed(
  state: AppState,
  value: string,
): { state: AppState; error?: string } {
  const result = applyReferenceElapsedToRace(state.race, value);
  if (isFieldApplyFailure(result)) {
    return { state, error: result.error };
  }

  const next = { ...state, race: result.race };
  if (hasRaceData(next.race)) {
    persistRace(next.race);
  }
  return { state: next };
}

export function applyLaneGap(
  state: AppState,
  laneNum: number,
  value: string,
): { state: AppState; error?: string } {
  const result = applyLaneGapToRace(state.race, laneNum, value);
  if (isFieldApplyFailure(result)) {
    return { state, error: result.error };
  }

  const next = { ...state, race: result.race };
  if (hasRaceData(next.race)) {
    persistRace(next.race);
  }
  return { state: next };
}

/** Read live DOM values into state. Mobile often skips change until blur. */
export function commitAllFormFields(
  state: AppState,
  root: ParentNode,
): { state: AppState; errors: string[] } {
  const startInput = root.querySelector<HTMLInputElement>("#start-ts");
  const refInput = root.querySelector<HTMLInputElement>("#ref-elapsed");
  const laneGaps = Array.from(root.querySelectorAll<HTMLInputElement>("[data-gap-input]")).map(
    (input) => ({
      lane: Number(input.dataset.gapInput),
      value: input.value,
      readOnly: input.readOnly,
    }),
  );

  const { race, errors } = commitPendingFormFields(state.race, {
    startTimestamp: startInput?.value,
    referenceElapsed: refInput?.value,
    laneGaps,
  });

  const next = { ...state, race };
  if (hasRaceData(next.race)) {
    persistRace(next.race);
  }
  return { state: next, errors };
}

export function updateRaceDraft(
  state: AppState,
  updater: (race: RaceDraft) => RaceDraft,
): AppState {
  const race = updater(state.race);
  const next = { ...state, race, showResults: false };
  if (hasRaceData(next.race)) {
    persistRace(next.race);
  }
  return next;
}
