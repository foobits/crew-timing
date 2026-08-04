import "./styles.css";
import {
  clearJudgeData,
  computeRace,
  createEmptyRace,
  formatCopyAll,
  formatElapsed,
  formatTimestamp,
  hasRaceData,
  isStaleDraft,
  loadPersistedRace,
  nextRace,
  persistRace,
  setReferenceLane,
  touchRace,
  type LaneDraft,
  type RaceDraft,
} from "./lib/race-state";
import {
  formatRestoreTime,
  parseElapsed,
  parseGap,
  parseTimestamp,
  todayDateString,
} from "./lib/time";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

interface AppState {
  race: RaceDraft;
  contextCollapsed: boolean;
  restoredBanner: boolean;
  lastCopiedLane: number | null;
  undoSnapshot: RaceDraft | null;
  undoTimer: number | null;
  confirmAction: "nextRace" | "clearJudge" | "changeRef" | null;
  pendingReferenceLane: number | null;
}

const PLACE_LABELS = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

let state: AppState = {
  race: createEmptyRace(),
  contextCollapsed: false,
  restoredBanner: false,
  lastCopiedLane: null,
  undoSnapshot: null,
  undoTimer: null,
  confirmAction: null,
  pendingReferenceLane: null,
};

const app = document.getElementById("app")!;
const toastEl = document.getElementById("toast")!;

function init(): void {
  const persisted = loadPersistedRace();
  if (persisted && hasRaceData(persisted)) {
    state.race = {
      ...persisted,
      startConfirmed: isStaleDraft(persisted) ? false : persisted.startConfirmed,
    };
    state.restoredBanner = true;
    state.contextCollapsed = Boolean(
      state.race.startTimestampMs !== null && state.race.referenceElapsedMs !== null,
    );
  }
  render();
}

function updateRace(updater: (race: RaceDraft) => RaceDraft): void {
  state.race = touchRace(updater(state.race));
  if (hasRaceData(state.race)) {
    persistRace(state.race);
  }
  render();
}

function showToast(message: string): void {
  toastEl.textContent = message;
  toastEl.hidden = false;
  window.setTimeout(() => {
    toastEl.hidden = true;
  }, 2200);
}

function announce(message: string): void {
  showToast(message);
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.className = "sr-only";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(area);
  return ok;
}

function saveUndo(): void {
  state.undoSnapshot = structuredClone(state.race);
  if (state.undoTimer !== null) {
    window.clearTimeout(state.undoTimer);
  }
  state.undoTimer = window.setTimeout(() => {
    state.undoSnapshot = null;
    state.undoTimer = null;
    render();
  }, 30_000);
}

function render(): void {
  const computed = computeRace(state.race);
  const stale = isStaleDraft(state.race);
  const showFooter = hasRaceData(state.race);

  app.innerHTML = `
    <header>
      <h1>Crew Timing Calculator</h1>
      <p class="subtitle">Finish-judge gaps → CrewTimer timestamps</p>
    </header>

    ${state.restoredBanner ? `<div class="banner" role="status">Restored race draft from ${formatRestoreTime(state.race.updatedAt)}${stale ? " (different date — confirm start time)" : ""}</div>` : ""}

    ${state.undoSnapshot ? `<div class="banner"><button type="button" class="btn btn-secondary" data-action="undo">Undo last clear</button></div>` : ""}

    <section class="card ${state.contextCollapsed ? "collapsed" : ""}" id="context-card">
      ${
        state.contextCollapsed
          ? `<div class="context-summary" tabindex="0" role="button" aria-expanded="false" data-action="expand-context">
              Start ${state.race.startTimestampMs !== null ? formatTimestamp(state.race.startTimestampMs) : "—"} · Ref L${state.race.referenceLane} ${state.race.referenceElapsedMs !== null ? formatElapsed(state.race.referenceElapsedMs) : "—"}
            </div>`
          : ""
      }
      <div class="context-fields">
        <h2>Race context</h2>
        ${renderContextFields(stale)}
      </div>
    </section>

    <section class="card">
      <h2>Lane gaps from reference</h2>
      <div class="lane-grid">${state.race.lanes.map(renderLaneRow).join("")}</div>
    </section>

    <section class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px;">
        <h2 style="margin:0">Results</h2>
        ${
          computed.valid
            ? `<button type="button" class="btn btn-small" data-action="copy-all">Copy all</button>`
            : ""
        }
      </div>
      ${
        computed.errors.length
          ? `<ul class="errors">${computed.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`
          : ""
      }
      ${computed.valid ? computed.results.map((r) => renderResultCard(r)).join("") : `<p class="elapsed-check">Enter start time, reference elapsed, and lane gaps to see timestamps.</p>`}
    </section>

    ${renderConfirmDialog()}
  `;

  const footer = document.getElementById("footer-actions");
  if (footer) footer.remove();
  if (showFooter) {
    const footerEl = document.createElement("div");
    footerEl.id = "footer-actions";
    footerEl.className = "footer-actions";
    footerEl.innerHTML = `
      <button type="button" class="btn btn-primary" data-action="next-race">Next race</button>
      <button type="button" class="btn btn-secondary" data-action="clear-judge">Clear judge data</button>
    `;
    document.body.appendChild(footerEl);
  }

  bindEvents(computed);
}

function renderContextFields(stale: boolean): string {
  const startValue =
    state.race.startTimestampMs !== null
      ? formatTimestamp(state.race.startTimestampMs)
      : "";
  const refValue =
    state.race.referenceElapsedMs !== null
      ? formatElapsed(state.race.referenceElapsedMs)
      : "";

  return `
    <div class="field">
      <label for="event-label">Event label (optional)</label>
      <input id="event-label" type="text" value="${escapeAttr(state.race.eventLabel)}" placeholder="Mens 1V Heat 2" autocomplete="off" />
    </div>
    <div class="field">
      <label for="start-ts">Race start timestamp (from CrewTimer)</label>
      <input id="start-ts" type="text" inputmode="decimal" value="${escapeAttr(startValue)}" placeholder="13:08:01.491" autocomplete="off" />
    </div>
    ${
      stale || !state.race.startConfirmed
        ? `<div class="field">
            <label><input type="checkbox" id="start-confirmed" ${state.race.startConfirmed ? "checked" : ""} /> Confirm start timestamp is correct</label>
          </div>`
        : ""
    }
    <div class="field">
      <label for="ref-elapsed">Reference elapsed</label>
      <input id="ref-elapsed" type="text" inputmode="decimal" value="${escapeAttr(refValue)}" placeholder="7:23.45" autocomplete="off" />
    </div>
    <div class="field">
      <label for="ref-lane">Reference lane</label>
      <select id="ref-lane">${Array.from({ length: 8 }, (_, i) => {
        const lane = i + 1;
        return `<option value="${lane}" ${lane === state.race.referenceLane ? "selected" : ""}>Lane ${lane}</option>`;
      }).join("")}</select>
    </div>
    ${
      state.race.startTimestampMs !== null && state.race.referenceElapsedMs !== null
        ? `<button type="button" class="btn btn-small" data-action="collapse-context">Collapse</button>`
        : ""
    }
  `;
}

function renderLaneRow(lane: LaneDraft): string {
  const isRef = lane.lane === state.race.referenceLane;
  const gapValue = isRef
    ? "0:00.000"
    : lane.gapMs !== null
      ? `${lane.gapNegative ? "-" : ""}${formatGapInput(lane)}`
      : "";

  return `
    <div class="lane-row ${isRef ? "reference" : ""} ${lane.status === "empty" ? "empty-lane" : ""}" data-lane="${lane.lane}">
      <div>
        <div class="lane-num">L${lane.lane}</div>
        ${isRef ? `<div class="lane-ref-badge">REF</div>` : ""}
      </div>
      <input
        type="text"
        inputmode="decimal"
        aria-label="Lane ${lane.lane} gap from reference"
        data-gap-input="${lane.lane}"
        value="${escapeAttr(gapValue)}"
        placeholder="+0:02.34"
        ${isRef || lane.status === "empty" ? "readonly" : ""}
      />
      <select data-status="${lane.lane}" aria-label="Lane ${lane.lane} status" ${isRef ? "disabled" : ""}>
        <option value="active" ${lane.status === "active" ? "selected" : ""}>Active</option>
        <option value="empty" ${lane.status === "empty" ? "selected" : ""}>Empty</option>
      </select>
      <button type="button" class="btn btn-small" data-clear-lane="${lane.lane}" ${isRef ? "disabled" : ""} aria-label="Clear lane ${lane.lane}">Clear</button>
    </div>
  `;
}

function formatGapInput(lane: LaneDraft): string {
  if (lane.gapMs === null) return "";
  const mins = Math.floor(lane.gapMs / 60_000);
  const secs = Math.floor((lane.gapMs % 60_000) / 1_000);
  const ms = lane.gapMs % 1_000;
  if (mins > 0) {
    return `${mins}:${String(secs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  }
  if (ms > 0 || secs > 0) {
    return `${secs}.${String(ms).padStart(3, "0").replace(/0+$/, "").replace(/\.$/, "") || "0"}`;
  }
  return "0";
}

function renderResultCard(result: {
  lane: number;
  place: number;
  tied: boolean;
  finishFormatted: string;
  elapsedFormatted: string;
}): string {
  const place = PLACE_LABELS[result.place] ?? `${result.place}th`;
  const tied = result.tied ? " (tie)" : "";
  const copied = state.lastCopiedLane === result.lane ? " copied" : "";

  return `
    <article class="result-card${copied}" data-result-lane="${result.lane}">
      <div class="result-place">${place} · Lane ${result.lane}${tied}</div>
      <div class="timestamp-label">CrewTimer finish timestamp</div>
      <div class="timestamp-value">${result.finishFormatted}</div>
      <button type="button" class="btn btn-copy" data-copy-lane="${result.lane}" data-copy-value="${result.finishFormatted}">Copy timestamp</button>
      <div class="elapsed-check">Calculated elapsed: ${result.elapsedFormatted}</div>
    </article>
  `;
}

function renderConfirmDialog(): string {
  if (!state.confirmAction) return "";

  const messages: Record<NonNullable<AppState["confirmAction"]>, string> = {
    nextRace: "Clear this race and start the next one?",
    clearJudge: "Clear judge data and keep the start timestamp?",
    changeRef: "Changing reference lane will reset lane gaps. Continue?",
  };

  return `
    <div class="confirm-overlay" role="dialog" aria-modal="true">
      <div class="confirm-dialog">
        <p>${messages[state.confirmAction]}</p>
        <div class="confirm-actions">
          <button type="button" class="btn btn-small" data-action="confirm-cancel">Cancel</button>
          <button type="button" class="btn btn-primary" data-action="confirm-ok">Confirm</button>
        </div>
      </div>
    </div>
  `;
}

function bindEvents(computed: ReturnType<typeof computeRace>): void {
  app.querySelector("#event-label")?.addEventListener("input", (e) => {
    const value = (e.target as HTMLInputElement).value;
    updateRace((race) => ({ ...race, eventLabel: value }));
  });

  app.querySelector("#start-ts")?.addEventListener("change", (e) => {
    const value = (e.target as HTMLInputElement).value.trim();
    if (!value) {
      updateRace((race) => ({
        ...race,
        startTimestampMs: null,
        startDate: todayDateString(),
        startConfirmed: true,
      }));
      return;
    }
    const parsed = parseTimestamp(value);
    if (!parsed.ok) {
      announce(parsed.error);
      render();
      return;
    }
    updateRace((race) => ({
      ...race,
      startTimestampMs: parsed.value,
      startDate: todayDateString(),
      startConfirmed: true,
    }));
    state.restoredBanner = false;
  });

  app.querySelector("#start-confirmed")?.addEventListener("change", (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    updateRace((race) => ({ ...race, startConfirmed: checked }));
  });

  app.querySelector("#ref-elapsed")?.addEventListener("change", (e) => {
    const value = (e.target as HTMLInputElement).value.trim();
    if (!value) {
      updateRace((race) => ({ ...race, referenceElapsedMs: null }));
      return;
    }
    const parsed = parseElapsed(value);
    if (!parsed.ok) {
      announce(parsed.error);
      render();
      return;
    }
    updateRace((race) => ({ ...race, referenceElapsedMs: parsed.value }));
  });

  app.querySelector("#ref-lane")?.addEventListener("change", (e) => {
    const lane = Number((e.target as HTMLSelectElement).value);
    if (lane === state.race.referenceLane) return;

    const hasGaps = state.race.lanes.some(
      (l) => l.lane !== state.race.referenceLane && l.gapMs !== null,
    );
    const newRefLane = state.race.lanes.find((l) => l.lane === lane);

    if (
      hasGaps &&
      (!newRefLane || newRefLane.status !== "active" || newRefLane.gapMs === null)
    ) {
      state.pendingReferenceLane = lane;
      state.confirmAction = "changeRef";
      render();
      return;
    }

    updateRace((race) => setReferenceLane(race, lane, false));
  });

  app.querySelector('[data-action="collapse-context"]')?.addEventListener("click", () => {
    state.contextCollapsed = true;
    render();
  });

  app.querySelector('[data-action="expand-context"]')?.addEventListener("click", () => {
    state.contextCollapsed = false;
    render();
  });

  app.querySelector('[data-action="expand-context"]')?.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter" || (e as KeyboardEvent).key === " ") {
      e.preventDefault();
      state.contextCollapsed = false;
      render();
    }
  });

  app.querySelectorAll("[data-gap-input]").forEach((el) => {
    el.addEventListener("change", (e) => {
      const laneNum = Number((e.target as HTMLInputElement).dataset.gapInput);
      const value = (e.target as HTMLInputElement).value.trim();
      updateRace((race) => ({
        ...race,
        lanes: race.lanes.map((lane) => {
          if (lane.lane !== laneNum) return lane;
          if (!value) return { ...lane, gapMs: null, gapNegative: false };
          const parsed = parseGap(value);
          if (!parsed.ok) {
            announce(parsed.error);
            return lane;
          }
          if (!parsed.signed) {
            return lane;
          }
          return {
            ...lane,
            gapMs: parsed.signed.ms,
            gapNegative: parsed.signed.negative,
            status: "active",
          };
        }),
      }));
    });
  });

  app.querySelectorAll("[data-status]").forEach((el) => {
    el.addEventListener("change", (e) => {
      const laneNum = Number((e.target as HTMLSelectElement).dataset.status);
      const status = (e.target as HTMLSelectElement).value as "active" | "empty";
      updateRace((race) => ({
        ...race,
        lanes: race.lanes.map((lane) => {
          if (lane.lane !== laneNum) return lane;
          if (status === "empty") {
            return { ...lane, status, gapMs: null, gapNegative: false };
          }
          return { ...lane, status };
        }),
      }));
    });
  });

  app.querySelectorAll("[data-clear-lane]").forEach((el) => {
    el.addEventListener("click", (e) => {
      const laneNum = Number((e.target as HTMLButtonElement).dataset.clearLane);
      updateRace((race) => ({
        ...race,
        lanes: race.lanes.map((lane) =>
          lane.lane === laneNum
            ? { ...lane, gapMs: null, gapNegative: false, status: "active" }
            : lane,
        ),
      }));
    });
  });

  app.querySelectorAll("[data-copy-lane]").forEach((el) => {
    el.addEventListener("click", async (e) => {
      const btn = e.target as HTMLButtonElement;
      const lane = Number(btn.dataset.copyLane);
      const value = btn.dataset.copyValue ?? "";
      const ok = await copyText(value);
      if (ok) {
        state.lastCopiedLane = lane;
        announce(`Copied ${value}`);
        render();
      } else {
        announce("Select and copy manually");
      }
    });
  });

  app.querySelector('[data-action="copy-all"]')?.addEventListener("click", async () => {
    if (!computed.valid) return;
    const text = formatCopyAll(state.race, computed.results);
    const ok = await copyText(text);
    announce(ok ? "Copied all results" : "Select and copy manually");
  });

  document.querySelector('[data-action="next-race"]')?.addEventListener("click", () => {
    state.confirmAction = "nextRace";
    render();
  });

  document.querySelector('[data-action="clear-judge"]')?.addEventListener("click", () => {
    state.confirmAction = "clearJudge";
    render();
  });

  document.querySelector('[data-action="confirm-cancel"]')?.addEventListener("click", () => {
    state.confirmAction = null;
    state.pendingReferenceLane = null;
    render();
  });

  document.querySelector('[data-action="confirm-ok"]')?.addEventListener("click", () => {
    if (state.confirmAction === "nextRace") {
      saveUndo();
      state.race = nextRace();
      state.restoredBanner = false;
      state.lastCopiedLane = null;
      state.contextCollapsed = false;
    } else if (state.confirmAction === "clearJudge") {
      saveUndo();
      state.race = clearJudgeData(state.race);
      persistRace(state.race);
      state.lastCopiedLane = null;
    } else if (state.confirmAction === "changeRef" && state.pendingReferenceLane !== null) {
      updateRace((race) => setReferenceLane(race, state.pendingReferenceLane!, true));
    }
    state.confirmAction = null;
    state.pendingReferenceLane = null;
    render();
    app.querySelector<HTMLElement>("#event-label, #start-ts")?.focus();
  });

  document.querySelector('[data-action="undo"]')?.addEventListener("click", () => {
    if (state.undoSnapshot) {
      state.race = state.undoSnapshot;
      persistRace(state.race);
      state.undoSnapshot = null;
      if (state.undoTimer !== null) {
        window.clearTimeout(state.undoTimer);
        state.undoTimer = null;
      }
      render();
    }
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, "&#39;");
}

init();
