import { computeRace, hasRaceData, isStaleDraft, MIN_LANE_COUNT, type ComputedRace } from "../lib/race-state";
import { sortResults } from "../lib/ui-helpers";
import type { AppState } from "../app/types";
import type { RenderScope } from "../app/render-scope";
import { captureFocus, restoreFocus } from "./focus";
import {
  renderContextSection,
  renderRestoredBanner,
  renderUndoBanner,
} from "./render-context";
import { renderConfirmDialog, renderFooter, renderAppMeta } from "./render-dialog";
import { renderLaneRowHtml, renderLanesSection } from "./render-lanes";
import {
  renderResultsSection,
} from "./render-results";

const EMPTY_COMPUTED: ComputedRace = { valid: false, results: [], errors: [] };

let computedCache: { stamp: string; computed: ComputedRace } | null = null;

export function getComputedRace(state: AppState): ComputedRace {
  if (!state.showResults) {
    return EMPTY_COMPUTED;
  }

  const stamp = state.race.updatedAt;
  if (computedCache?.stamp === stamp) {
    return computedCache.computed;
  }

  const computed = computeRace(state.race);
  computedCache = { stamp, computed };
  return computed;
}

export function invalidateComputedRace(): void {
  computedCache = null;
}

function getDisplayedResults(state: AppState, computed: ComputedRace) {
  return computed.valid ? sortResults(computed.results, state.resultsSort) : [];
}

export function patchBanners(root: HTMLElement, state: AppState, stale: boolean): void {
  const host = root.querySelector("#app-banners");
  if (!host) return;
  host.innerHTML = `${renderRestoredBanner(state, stale)}${renderUndoBanner(state)}`;
}

export function patchContext(root: HTMLElement, state: AppState, stale: boolean): void {
  const card = root.querySelector("#context-card");
  if (!card) return;
  const focus = captureFocus();
  card.outerHTML = renderContextSection(state, stale).trim();
  restoreFocus(focus);
}

export function patchLanes(root: HTMLElement, state: AppState): void {
  const section = root.querySelector("#lanes-section");
  if (!section) return;
  const focus = captureFocus();
  section.outerHTML = renderLanesSection(state).trim();
  restoreFocus(focus);
}

export function patchLaneRow(root: HTMLElement, state: AppState, laneNum: number): void {
  const lane = state.race.lanes.find((entry) => entry.lane === laneNum);
  const row = root.querySelector<HTMLElement>(`.lane-row[data-lane="${laneNum}"]`);
  if (!lane || !row) return;

  const gapInput = row.querySelector<HTMLInputElement>("[data-gap-input]");
  const hadGapFocus = gapInput && document.activeElement === gapInput;
  const selectionStart = hadGapFocus ? gapInput.selectionStart : null;
  const selectionEnd = hadGapFocus ? gapInput.selectionEnd : null;

  row.outerHTML = renderLaneRowHtml(state, lane).trim();

  if (hadGapFocus) {
    const nextInput = root.querySelector<HTMLInputElement>(`[data-gap-input="${laneNum}"]`);
    nextInput?.focus();
    if (nextInput && selectionStart !== null && selectionEnd !== null) {
      nextInput.setSelectionRange(selectionStart, selectionEnd);
    }
  }
}

export function patchLaneCountControls(root: HTMLElement, state: AppState): void {
  const count = root.querySelector(".lane-count");
  const removeBtn = root.querySelector<HTMLButtonElement>('[data-action="remove-lane"]');
  if (count) count.textContent = String(state.race.lanes.length);
  if (removeBtn) {
    removeBtn.disabled = state.race.lanes.length <= MIN_LANE_COUNT;
  }
}

export function patchResults(root: HTMLElement, state: AppState, computed: ComputedRace): void {
  const card = root.querySelector("#results-card");
  if (!card) return;
  const displayedResults = getDisplayedResults(state, computed);
  const focus = captureFocus();
  card.outerHTML = renderResultsSection(state, computed, displayedResults).trim();
  restoreFocus(focus);
}

export function patchCopiedLane(root: HTMLElement, lane: number): void {
  root.querySelector(`[data-result-lane="${lane}"]`)?.classList.add("copied");
}

export function patchDialog(root: HTMLElement, state: AppState): void {
  const host = root.querySelector("#confirm-host");
  if (!host) return;
  host.innerHTML = renderConfirmDialog(state);
}

export function patchFooter(state: AppState): void {
  renderFooter(hasRaceData(state.race));
  renderAppMeta();
}

export function renderFullApp(root: HTMLElement, state: AppState): ComputedRace {
  const focus = captureFocus();
  const stale = isStaleDraft(state.race);
  const computed = getComputedRace(state);
  const displayedResults = getDisplayedResults(state, computed);

  root.innerHTML = `
    <header>
      <h1>Race Timing Calculator</h1>
      <p class="subtitle">Official finish time sheet -> CrewTimer</p>
    </header>

    <div id="app-banners">${renderRestoredBanner(state, stale)}${renderUndoBanner(state)}</div>
    ${renderContextSection(state, stale)}
    ${renderLanesSection(state)}
    ${renderResultsSection(state, computed, displayedResults)}
    <div id="confirm-host">${renderConfirmDialog(state)}</div>
  `;

  patchFooter(state);
  renderAppMeta();
  restoreFocus(focus);
  return computed;
}

export function applyRenderScope(
  root: HTMLElement,
  state: AppState,
  scope: RenderScope,
): ComputedRace {
  const stale = isStaleDraft(state.race);

  switch (scope.type) {
    case "none":
      return getComputedRace(state);
    case "copied-lane":
      patchCopiedLane(root, scope.lane);
      return getComputedRace(state);
    case "banners":
      patchBanners(root, state, stale);
      return getComputedRace(state);
    case "dialog":
      patchDialog(root, state);
      return getComputedRace(state);
    case "footer":
      patchFooter(state);
      return getComputedRace(state);
    case "context":
      patchContext(root, state, stale);
      return getComputedRace(state);
    case "lane-row":
      patchLaneRow(root, state, scope.lane);
      patchLaneCountControls(root, state);
      return getComputedRace(state);
    case "lanes":
      patchLanes(root, state);
      return getComputedRace(state);
    case "results": {
      invalidateComputedRace();
      const computed = getComputedRace(state);
      patchResults(root, state, computed);
      return computed;
    }
    case "full":
    default:
      invalidateComputedRace();
      return renderFullApp(root, state);
  }
}
