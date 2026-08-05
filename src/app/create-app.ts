import type { RaceDraft } from "../lib/race-state";
import type { AppState } from "./types";
import { updateRaceDraft } from "./form-sync";
import { createInitialState, loadPersistedState } from "./state";
import { bindEventsOnce } from "../ui/bind-events";
import { invalidateComputedRace, getComputedRace, applyRenderScope } from "../ui/patch-dom";
import { initToast } from "../ui/toast";
import { flushPendingPersist } from "./persist-scheduler";
import { mergeRenderScope, type RenderScope } from "./render-scope";

export function createApp(root: HTMLElement, toast: HTMLElement): { init(): void } {
  let state: AppState = createInitialState();
  let pendingScope: RenderScope = { type: "none" };
  let rafId: number | null = null;
  let mounted = false;

  const executeRender = (scope: RenderScope): void => {
    const effectiveScope = mounted ? scope : { type: "full" as const };
    applyRenderScope(root, state, effectiveScope);
    mounted = true;
  };

  const scheduleRender = (scope: RenderScope): void => {
    pendingScope = mergeRenderScope(pendingScope, scope);
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      const scopeToApply = pendingScope;
      pendingScope = { type: "none" };
      executeRender(scopeToApply);
    });
  };

  const renderNow = (scope: RenderScope): void => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    pendingScope = { type: "none" };
    executeRender(scope);
  };

  const actions = {
    getState: (): AppState => state,
    setState: (updater: (prev: AppState) => AppState): void => {
      state = updater(state);
    },
    updateRace: (
      updater: (race: RaceDraft) => RaceDraft,
      scope: RenderScope = { type: "lanes" },
    ): void => {
      state = updateRaceDraft(state, updater);
      invalidateComputedRace();
      scheduleRender(scope);
    },
    scheduleRender,
    renderNow,
    getComputed: () => getComputedRace(state),
  };

  bindEventsOnce(root, actions);

  window.addEventListener("beforeunload", flushPendingPersist);
  window.addEventListener("pagehide", flushPendingPersist);

  return {
    init(): void {
      initToast(toast);
      state = loadPersistedState(state);
      renderNow({ type: "full" });
    },
  };
}
