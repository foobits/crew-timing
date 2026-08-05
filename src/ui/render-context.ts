import { formatElapsed, formatRestoreTime, formatTimestamp } from "../lib/time";
import { canCollapseContext, escapeAttr, escapeHtml } from "../lib/ui-helpers";
import type { AppState } from "../app/types";
import { DEFAULT_ELAPSED, DEFAULT_TIMESTAMP } from "../app/constants";
import type { RaceDraft } from "../lib/race-state";

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
    <div class="field">
      <label for="event-label">Name (optional)</label>
      <input id="event-label" type="text" value="${escapeAttr(state.race.eventLabel)}" placeholder="Mens 1V 8+ Heat 1" autocomplete="off" />
    </div>
    <div class="field">
      <label for="start-ts">
        Start time
        <span class="label-format">HH:MM:SS.SSS</span>
      </label>
      <input id="start-ts" type="text" inputmode="decimal" value="${escapeAttr(startValue)}" placeholder="${DEFAULT_TIMESTAMP}" autocomplete="off" />
    </div>
    ${
      stale || !state.race.startConfirmed
        ? `<div class="field">
            <label><input type="checkbox" id="start-confirmed" ${state.race.startConfirmed ? "checked" : ""} /> Confirm start timestamp is correct</label>
          </div>`
        : ""
    }
    <div class="field">
      <label for="ref-lane">Reference lane</label>
      <select id="ref-lane">${state.race.lanes
        .map((lane) => {
          return `<option value="${lane.lane}" ${lane.lane === state.race.referenceLane ? "selected" : ""}>${lane.lane}</option>`;
        })
        .join("")}</select>
    </div>
    <div class="field">
      <label for="ref-elapsed">
        Reference lane time on water
        <span class="label-format">MM:SS.SSS</span>
      </label>
      <input id="ref-elapsed" type="text" inputmode="decimal" value="${escapeAttr(refValue)}" placeholder="${DEFAULT_ELAPSED}" autocomplete="off" />
    </div>
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
  return `<div class="banner" role="status">Restored race draft from ${formatRestoreTime(state.race.updatedAt)}${stale ? " (different date — confirm start time)" : ""}</div>`;
}

export function renderUndoBanner(state: AppState): string {
  if (!state.undoSnapshot) return "";
  return `<div class="banner"><button type="button" class="btn btn-secondary" data-action="undo">Undo last clear</button></div>`;
}
