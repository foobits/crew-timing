import type { ComputedRace, RaceDraft } from "../lib/race-state";

export type ConfirmAction = "nextRace" | "clearJudge" | "changeRef" | "removeLane";

export type ResultsSort = "place" | "lane";

export interface CalculationSnapshot {
  race: RaceDraft;
  computed: ComputedRace;
}

export interface AppState {
  race: RaceDraft;
  contextCollapsed: boolean;
  restoredBanner: boolean;
  copiedLanes: Set<number>;
  undoSnapshot: RaceDraft | null;
  undoTimer: number | null;
  confirmAction: ConfirmAction | null;
  pendingReferenceLane: number | null;
  showResults: boolean;
  calculationSnapshot: CalculationSnapshot | null;
  resultsStale: boolean;
  resultsSort: ResultsSort;
}
