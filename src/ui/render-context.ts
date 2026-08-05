import { formatElapsed, formatRestoreTime, formatTimestamp } from "../lib/time";
import { canCollapseContext, escapeHtml } from "../lib/ui-helpers";
import type { AppState } from "../app/types";
import { DEFAULT_ELAPSED, DEFAULT_TIMESTAMP } from "../app/constants";
import type { RaceDraft } from "../lib/race-state";
import {
  renderActionBanner,
  renderBanner,
  renderCheckboxField,
  renderSelectField,
  renderTextField,
} from "./components";

export function renderContextCaret(contextCollapsed: boolean): string {
  const expanded = !contextCollapsed;
  return `
    <button
      type="button"
      class="context-toggle"
      data-action="toggle-context"
      aria-label="${expanded ? "Collapse race section" : "Expand race section"}"
      aria-expanded="${expanded}"
    >
      <span class="context-toggle-icon context-toggle-icon--${expanded ? "down" : "up"}" aria-hidden="true"></span>
    </button>
  `;
}

export function renderContextSummary(race: RaceDraft): string {
  const start =
    race.startTimestampMs !== null ? formatTimestamp(race.startTimestampMs) : DEFAULT_TIMESTAMP;
  const refElapsed =
    race.referenceElapsedMs !== null ? formatElapsed(race.referenceElapsedMs) : DEFAULT_ELAPSED;

  return `
    <div class="context-summary-line">Start of Race: <span class="context-summary-value">${escapeHtml(start)}</span></div>
    <div class="context-summary-line">Reference Lane: <span class="context-summary-value">${race.referenceLane}</span></div>
    <div class="context-summary-line">Time on water: <span class="context-summary-value">${escapeHtml(refElapsed)}</span></div>
  `;
}

export function renderContextFields(state: AppState, stale: boolean): string {
  const startValue =
    state.race.startTimestampMs !== null ? formatTimestamp(state.race.startTimestampMs) : "";
  const refValue =
    state.race.referenceElapsedMs !== null ? formatElapsed(state.race.referenceElapsedMs) : "";

  return `
    ${renderTextField({
      id: "event-label",
      label: "Name (optional)",
      value: state.race.eventLabel,
      placeholder: "Mens 1V 8+ Heat 1",
    })}
    ${renderTextField({
      id: "start-ts",
      label: "Start time",
      formatHint: "HH:MM:SS.SSS",
      value: startValue,
      placeholder: DEFAULT_TIMESTAMP,
      inputmode: "decimal",
    })}
    ${
      stale || !state.race.startConfirmed
        ? renderCheckboxField({
            id: "start-confirmed",
            label: "Confirm start timestamp is correct",
            checked: state.race.startConfirmed,
          })
        : ""
    }
    ${renderSelectField({
      id: "ref-lane",
      label: "Reference lane",
      value: state.race.referenceLane,
      options: state.race.lanes.map((lane) => ({ value: lane.lane, label: String(lane.lane) })),
    })}
    ${renderTextField({
      id: "ref-elapsed",
      label: "Reference lane time on water",
      formatHint: "MM:SS.SSS",
      value: refValue,
      placeholder: DEFAULT_ELAPSED,
      inputmode: "decimal",
    })}
  `;
}

export function renderContextSection(state: AppState, stale: boolean): string {
  return `
    <section class="card ${state.contextCollapsed ? "collapsed" : ""}" id="context-card">
      ${canCollapseContext(state.race) ? renderContextCaret(state.contextCollapsed) : ""}
      ${
        state.contextCollapsed
          ? `<div class="context-summary" tabindex="0" role="button" aria-expanded="false" data-action="expand-context">
              ${renderContextSummary(state.race)}
            </div>`
          : ""
      }
      <div class="context-fields">
        <h2>Race</h2>
        ${renderContextFields(state, stale)}
      </div>
    </section>
  `;
}

export function renderRestoredBanner(state: AppState, stale: boolean): string {
  if (!state.restoredBanner) return "";
  return renderBanner(
    `Restored race draft from ${formatRestoreTime(state.race.updatedAt)}${stale ? " (different date — confirm start time)" : ""}`,
  );
}

export function renderUndoBanner(state: AppState): string {
  if (!state.undoSnapshot) return "";
  return renderActionBanner("undo", "Undo last clear");
}
