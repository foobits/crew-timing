// @vitest-environment happy-dom

import { vi } from "vitest";
import { updateRaceDraft } from "../app/form-sync";
import type { AppState } from "../app/types";
import type { RaceDraft } from "../lib/race-state";
import type { RenderScope } from "../app/render-scope";
import { bindEventsOnce, type AppActions } from "../ui/bind-events";
import {
  applyRenderScope,
  getComputedRace,
  invalidateComputedRace,
  renderFullApp,
} from "../ui/patch-dom";
import { initToast } from "../ui/toast";

export interface BoundApp {
  root: HTMLElement;
  getState: () => AppState;
  setState: (updater: (state: AppState) => AppState) => void;
  scheduleRender: ReturnType<typeof vi.fn>;
  renderNow: ReturnType<typeof vi.fn>;
}

export function bindTestApp(root: HTMLElement, initialState: AppState): BoundApp {
  let state = initialState;
  const scheduleRender = vi.fn((scope: RenderScope) => {
    applyRenderScope(root, state, scope);
  });
  const renderNow = vi.fn((scope: RenderScope) => {
    applyRenderScope(root, state, scope);
  });

  const actions: AppActions = {
    getState: () => state,
    setState: (updater) => {
      state = updater(state);
    },
    updateRace: (updater: (race: RaceDraft) => RaceDraft, scope: RenderScope = { type: "lanes" }) => {
      state = updateRaceDraft(state, updater);
      invalidateComputedRace();
      scheduleRender(scope);
    },
    scheduleRender,
    renderNow,
    getComputed: () => getComputedRace(state),
  };

  bindEventsOnce(root, actions);
  renderFullApp(root, state);

  return {
    root,
    getState: () => state,
    setState: (updater) => {
      state = updater(state);
    },
    scheduleRender,
    renderNow,
  };
}

export function mountBoundApp(initialState: AppState): BoundApp {
  document.body.innerHTML = '<div id="toast" hidden></div>';
  initToast(document.getElementById("toast")!);
  const root = document.createElement("div");
  document.body.appendChild(root);
  return bindTestApp(root, initialState);
}
