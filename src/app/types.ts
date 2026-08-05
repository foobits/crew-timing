import type { RaceDraft } from "../lib/race-state";

export type ConfirmAction = "nextRace" | "clearJudge" | "changeRef";

export type ResultsSort = "place" | "lane";

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
  resultsSort: ResultsSort;
}
