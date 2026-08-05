import type { RaceDraft } from "../lib/race-state";
import type { AppState } from "./types";
import { updateRaceDraft } from "./form-sync";
import { createInitialState, loadPersistedState } from "./state";
import { bindEvents } from "../ui/bind-events";
import { renderApp } from "../ui/render-app";
import { initToast } from "../ui/toast";

export function createApp(root: HTMLElement, toast: HTMLElement): { init(): void } {
  let state: AppState = createInitialState();

  const render = (): void => {
    const computed = renderApp(root, state);
    bindEvents(root, actions, computed);
  };

  const actions = {
    getState: (): AppState => state,
    setState: (updater: (prev: AppState) => AppState): void => {
      state = updater(state);
    },
    updateRace: (updater: (race: RaceDraft) => RaceDraft): void => {
      state = updateRaceDraft(state, updater);
      render();
    },
    render,
  };

  return {
    init(): void {
      initToast(toast);
      state = loadPersistedState(state);
      render();
    },
  };
}
