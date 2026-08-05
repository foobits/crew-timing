import { formatElapsed } from "../lib/time";
import { escapeAttr, formatGapInput } from "../lib/ui-helpers";
import type { AppState } from "../app/types";
import { DEFAULT_ELAPSED, DEFAULT_GAP } from "../app/constants";
import { MIN_LANE_COUNT, type LaneDraft } from "../lib/race-state";

function renderLaneStatusToggle(lane: LaneDraft, isRef: boolean): string {
  const activeSelected = lane.status === "active" ? " selected" : "";
  const emptySelected = lane.status === "empty" ? " selected" : "";
  const disabled = isRef ? " disabled" : "";
  const toggleClass = isRef ? " lane-status-toggle--locked" : "";

  return `
    <div class="lane-status-toggle${toggleClass}" role="group" aria-label="Lane ${lane.lane} status"${isRef ? ' aria-disabled="true"' : ""}>
      <button
        type="button"
        class="lane-status-btn${activeSelected}"
        data-status="${lane.lane}"
        data-status-value="active"
        aria-pressed="${lane.status === "active"}"
        tabindex="-1"
        ${disabled}
      >Active</button>
      <button
        type="button"
        class="lane-status-btn${emptySelected}"
        data-status="${lane.lane}"
        data-status-value="empty"
        aria-pressed="${lane.status === "empty"}"
        tabindex="-1"
        ${disabled}
      >Empty</button>
    </div>
  `;
}

function renderLaneRow(state: AppState, lane: LaneDraft): string {
  const isRef = lane.lane === state.race.referenceLane;
  const refElapsedValue =
    state.race.referenceElapsedMs !== null
      ? formatElapsed(state.race.referenceElapsedMs)
      : DEFAULT_ELAPSED;
  const gapValue = isRef
    ? refElapsedValue
    : lane.gapMs !== null
      ? formatGapInput(lane)
      : "";
  const gapPlaceholder = isRef ? DEFAULT_ELAPSED : DEFAULT_GAP;
  const gapAriaLabel = isRef
    ? "Reference lane time on water"
    : `Lane ${lane.lane} gap from reference`;
  const skipGapTab = isRef || lane.status === "empty";
  const showGapSign = !isRef && lane.status !== "empty";

  return `
    <div class="lane-row ${isRef ? "reference" : ""} ${lane.status === "empty" ? "empty-lane" : ""}" data-lane="${lane.lane}">
      <div class="lane-label">
        <div class="lane-num">${lane.lane}</div>
        ${isRef ? `<div class="lane-ref-badge">REF</div>` : ""}
      </div>
      <div class="gap-input-wrap">
        ${
          showGapSign
            ? `<button
                type="button"
                class="gap-sign-btn${lane.gapNegative ? " gap-sign-btn--negative" : ""}"
                data-gap-sign="${lane.lane}"
                aria-label="Toggle gap sign for lane ${lane.lane}"
                aria-pressed="${lane.gapNegative}"
                tabindex="-1"
              >${lane.gapNegative ? "−" : "+"}</button>`
            : ""
        }
        <input
          type="text"
          class="lane-gap-input${isRef ? " lane-gap-input--locked" : ""}"
          inputmode="decimal"
          aria-label="${gapAriaLabel}"
          data-gap-input="${lane.lane}"
          value="${escapeAttr(gapValue)}"
          placeholder="${gapPlaceholder}"
          ${skipGapTab ? 'tabindex="-1"' : ""}
          ${isRef ? 'readonly aria-disabled="true"' : lane.status === "empty" ? "readonly" : ""}
        />
      </div>
      ${renderLaneStatusToggle(lane, isRef)}
      <button type="button" class="btn btn-small" data-clear-lane="${lane.lane}" tabindex="-1" ${isRef ? "disabled" : ""} aria-label="Clear lane ${lane.lane}">Clear</button>
    </div>
  `;
}

export function renderLaneRowHtml(state: AppState, lane: LaneDraft): string {
  return renderLaneRow(state, lane);
}

export function renderLaneGridHtml(state: AppState): string {
  return state.race.lanes.map((lane) => renderLaneRow(state, lane)).join("");
}

export function renderLanesSection(state: AppState): string {
  return `
    <section class="card" id="lanes-section">
      <div class="section-header">
        <h2>Lanes (splits) <span class="label-format">± sec.sss or MM:SS.SSS</span></h2>
        <div class="lane-count-controls">
          <button type="button" class="btn btn-small" data-action="remove-lane" aria-label="Remove lane" tabindex="-1" ${state.race.lanes.length <= MIN_LANE_COUNT ? "disabled" : ""}>−</button>
          <span class="lane-count">${state.race.lanes.length}</span>
          <button type="button" class="btn btn-small" data-action="add-lane" aria-label="Add lane" tabindex="-1">+</button>
        </div>
      </div>
      <div class="lane-grid" id="lane-grid">${renderLaneGridHtml(state)}</div>
      <button type="button" class="btn btn-primary lane-calculate" data-action="calculate">Calculate</button>
    </section>
  `;
}
