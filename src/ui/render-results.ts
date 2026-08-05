import { escapeHtml } from "../lib/ui-helpers";
import type { AppState } from "../app/types";
import { PLACE_LABELS } from "../app/constants";
import type { ComputedRace, LaneResult } from "../lib/race-state";

function renderResultsSortToggle(resultsSort: AppState["resultsSort"]): string {
  const placeSelected = resultsSort === "place" ? " selected" : "";
  const laneSelected = resultsSort === "lane" ? " selected" : "";

  return `
    <div class="results-sort-toggle lane-status-toggle" role="group" aria-label="Sort results">
      <button
        type="button"
        class="lane-status-btn${placeSelected}"
        data-results-sort="place"
        aria-pressed="${resultsSort === "place"}"
      >Place</button>
      <button
        type="button"
        class="lane-status-btn${laneSelected}"
        data-results-sort="lane"
        aria-pressed="${resultsSort === "lane"}"
      >Lane</button>
    </div>
  `;
}

function renderResultCard(state: AppState, result: LaneResult): string {
  const place = PLACE_LABELS[result.place] ?? `${result.place}th`;
  const tied = result.tied ? " (tie)" : "";
  const copied = state.copiedLanes.has(result.lane) ? " copied" : "";

  return `
    <article class="result-card${copied}" data-result-lane="${result.lane}">
      <div class="result-place">${place} · Lane ${result.lane}${tied}</div>
      <div class="timestamp-label">CrewTimer finish timestamp</div>
      <div class="timestamp-value">${result.finishFormatted}</div>
      <button type="button" class="btn btn-copy" data-copy-lane="${result.lane}" data-copy-value="${result.finishFormatted}">Copy timestamp</button>
      <div class="elapsed-check">Calculated elapsed time: ${result.elapsedFormatted}</div>
    </article>
  `;
}

export function renderResultsBody(
  state: AppState,
  computed: ComputedRace,
  displayedResults: LaneResult[],
): string {
  return `
      ${
        state.showResults && computed.errors.length
          ? `<ul class="errors">${computed.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`
          : ""
      }
      <div id="results-body">
      ${
        state.showResults && computed.valid
          ? displayedResults.map((r) => renderResultCard(state, r)).join("")
          : `<p class="elapsed-check">${state.showResults ? "Fix the errors above and calculate again." : "Enter race data and lane splits, then tap Calculate."}</p>`
      }
      </div>
  `;
}

function renderResultsHeaderActions(state: AppState, computed: ComputedRace): string {
  if (!state.showResults || !computed.valid) return "";
  return `<div class="results-header-actions">
                ${renderResultsSortToggle(state.resultsSort)}
                <button type="button" class="btn btn-small" data-action="copy-all">Copy all</button>
              </div>`;
}

export function renderResultsSection(
  state: AppState,
  computed: ComputedRace,
  displayedResults: LaneResult[],
): string {
  return `
    <section class="card" id="results-card">
      <div class="results-header">
        <h2>Results</h2>
        ${
          state.showResults && computed.valid
            ? renderResultsHeaderActions(state, computed)
            : ""
        }
      </div>
      ${renderResultsBody(state, computed, displayedResults)}
    </section>
  `;
}
