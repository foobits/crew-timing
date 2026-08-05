import { formatElapsed } from "../lib/time";
import { escapeAttr, formatGapInput } from "../lib/ui-helpers";
import type { AppState } from "../app/types";
import { DEFAULT_ELAPSED, DEFAULT_GAP } from "../app/constants";
import { MIN_LANE_COUNT, type LaneDraft } from "../lib/race-state";
import { renderButton, renderSectionHeader, renderToggleGroup } from "./components";

function renderLaneStatusToggle(lane: LaneDraft, isRef: boolean): string {
  return renderToggleGroup({
    ariaLabel: `Lane ${lane.lane} status`,
    locked: isRef,
    options: [
      {
        label: "Active",
        selected: lane.status === "active",
        ariaPressed: lane.status === "active",
        disabled: isRef,
        dataAttrs: { status: String(lane.lane), "status-value": "active" },
      },
      {
        label: "Empty",
        selected: lane.status === "empty",
        ariaPressed: lane.status === "empty",
        disabled: isRef,
        dataAttrs: { status: String(lane.lane), "status-value": "empty" },
      },
    ],
  });
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
      ${renderButton({
        label: "Clear",
        variant: "small",
        tabindex: "-1",
        disabled: isRef,
        ariaLabel: `Clear lane ${lane.lane}`,
        data: { "clear-lane": lane.lane },
      })}
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
  const laneControls = `
    <div class="lane-count-controls">
      ${renderButton({
        label: "−",
        variant: "small",
        action: "remove-lane",
        tabindex: "-1",
        ariaLabel: "Remove lane",
        disabled: state.race.lanes.length <= MIN_LANE_COUNT,
      })}
      <span class="lane-count">${state.race.lanes.length}</span>
      ${renderButton({
        label: "+",
        variant: "small",
        action: "add-lane",
        tabindex: "-1",
        ariaLabel: "Add lane",
      })}
    </div>
  `;

  return `
    <section class="card" id="lanes-section">
      ${renderSectionHeader('Lanes (splits) <span class="label-format">± sec.sss or MM:SS.SSS</span>', laneControls)}
      <div class="lane-grid" id="lane-grid">${renderLaneGridHtml(state)}</div>
      ${renderButton({ label: "Calculate", variant: "primary", action: "calculate", className: "lane-calculate" })}
    </section>
  `;
}
