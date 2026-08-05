import {
  createEmptyRace,
  hasRaceData,
  isStaleDraft,
  loadPersistedRace,
  persistRace,
  touchRace,
  type RaceDraft,
} from "../lib/race-state";
import type { AppState } from "./types";

export function createInitialState(): AppState {
  return {
    race: createEmptyRace(),
    contextCollapsed: false,
    restoredBanner: false,
    copiedLanes: new Set(),
    undoSnapshot: null,
    undoTimer: null,
    confirmAction: null,
    pendingReferenceLane: null,
    showResults: false,
    resultsSort: "place",
  };
}

export function loadPersistedState(state: AppState): AppState {
  const persisted = loadPersistedRace();
  if (!persisted || !hasRaceData(persisted)) {
    return state;
  }

  return {
    ...state,
    race: {
      ...persisted,
      startConfirmed: isStaleDraft(persisted) ? false : persisted.startConfirmed,
    },
    restoredBanner: true,
    contextCollapsed: Boolean(
      persisted.startTimestampMs !== null && persisted.referenceElapsedMs !== null,
    ),
  };
}

export function syncRaceState(state: AppState, updater: (race: RaceDraft) => RaceDraft): AppState {
  const race = touchRace(updater(state.race));
  if (hasRaceData(race)) {
    persistRace(race);
  }
  return { ...state, race };
}

export function saveUndoSnapshot(
  state: AppState,
  onExpire: () => void,
): Pick<AppState, "undoSnapshot" | "undoTimer"> {
  if (state.undoTimer !== null) {
    window.clearTimeout(state.undoTimer);
  }

  return {
    undoSnapshot: structuredClone(state.race),
    undoTimer: window.setTimeout(() => {
      onExpire();
    }, 30_000),
  };
}

export function clearUndoSnapshot(state: AppState): Pick<AppState, "undoSnapshot" | "undoTimer"> {
  if (state.undoTimer !== null) {
    window.clearTimeout(state.undoTimer);
  }
  return { undoSnapshot: null, undoTimer: null };
}
