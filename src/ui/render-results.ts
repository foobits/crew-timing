import { escapeHtml } from "../lib/ui-helpers";
import type { AppState } from "../app/types";
import { PLACE_LABELS } from "../app/constants";
import type { ComputedRace, LaneResult } from "../lib/race-state";
import { renderButton, renderToggleGroup } from "./components";

export const COPY_TIMESTAMP_LABEL = "Copy timestamp";
export const COPIED_UNMARK_LABEL = "Copied — tap to unmark";
export const STALE_RESULTS_MESSAGE =
  "Calculation failed — results below are from the previous calculation.";

function renderResultsSortToggle(resultsSort: AppState["resultsSort"]): string {
  return renderToggleGroup({
    ariaLabel: "Sort results",
    className: "results-sort-toggle",
    tabindex: "0",
    options: [
      {
        label: "Place",
        selected: resultsSort === "place",
        ariaPressed: resultsSort === "place",
        dataAttrs: { "results-sort": "place" },
      },
      {
        label: "Lane",
        selected: resultsSort === "lane",
        ariaPressed: resultsSort === "lane",
        dataAttrs: { "results-sort": "lane" },
      },
    ],
  });
}

function renderResultCard(state: AppState, result: LaneResult): string {
  const place = PLACE_LABELS[result.place] ?? `${result.place}th`;
  const tied = result.tied ? " (tie)" : "";
  const copied = state.copiedLanes.has(result.lane);
  const copiedClass = copied ? " copied" : "";
  const copyLabel = copied ? COPIED_UNMARK_LABEL : COPY_TIMESTAMP_LABEL;
  const copyDisabled = state.resultsStale;

  return `
    <article class="result-card${copiedClass}" data-result-lane="${result.lane}">
      <div class="result-place">${place} · Lane ${result.lane}${tied}</div>
      <div class="timestamp-label">CrewTimer finish timestamp</div>
      <div class="timestamp-value">${result.finishFormatted}</div>
      ${
        copyDisabled
          ? renderButton({ label: copyLabel, variant: "copy", disabled: true })
          : renderButton({
              label: copyLabel,
              variant: "copy",
              data: { "copy-lane": result.lane, "copy-value": result.finishFormatted },
            })
      }
      <div class="elapsed-check">Calculated elapsed time: ${result.elapsedFormatted}</div>
    </article>
  `;
}

export function renderResultCardHtml(state: AppState, result: LaneResult): string {
  return renderResultCard(state, result);
}

function renderResultsStaleBanner(state: AppState): string {
  if (!state.showResults || !state.resultsStale) return "";
  return `<p class="results-stale-banner" role="status">${escapeHtml(STALE_RESULTS_MESSAGE)}</p>`;
}

export function renderResultsBody(
  state: AppState,
  computed: ComputedRace,
  displayedResults: LaneResult[],
): string {
  return `
      ${renderResultsStaleBanner(state)}
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
                ${
                  state.resultsStale
                    ? renderButton({ label: "Copy all", variant: "small", disabled: true })
                    : renderButton({ label: "Copy all", variant: "small", action: "copy-all" })
                }
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
