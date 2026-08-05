import { computeRace, hasRaceData, isStaleDraft } from "../lib/race-state";
import { sortResults } from "../lib/ui-helpers";
import type { AppState } from "../app/types";
import { captureFocus, restoreFocus } from "./focus";
import { renderConfirmDialog, renderFooter } from "./render-dialog";
import { renderContextSection, renderRestoredBanner, renderUndoBanner } from "./render-context";
import { renderLanesSection } from "./render-lanes";
import { renderResultsSection } from "./render-results";

export function renderApp(root: HTMLElement, state: AppState): ReturnType<typeof computeRace> {
  const focus = captureFocus();
  const computed = computeRace(state.race);
  const displayedResults = computed.valid ? sortResults(computed.results, state.resultsSort) : [];
  const stale = isStaleDraft(state.race);
  const showFooter = hasRaceData(state.race);

  root.innerHTML = `
    <header>
      <h1>Race Timing Calculator</h1>
      <p class="subtitle">Official finish time sheet -> CrewTimer</p>
    </header>

    ${renderRestoredBanner(state, stale)}
    ${renderUndoBanner(state)}
    ${renderContextSection(state, stale)}
    ${renderLanesSection(state)}
    ${renderResultsSection(state, computed, displayedResults)}
    ${renderConfirmDialog(state)}
  `;

  renderFooter(showFooter);
  restoreFocus(focus);

  return computed;
}
