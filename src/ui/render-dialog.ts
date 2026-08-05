import type { AppState, ConfirmAction } from "../app/types";

const CONFIRM_MESSAGES: Record<ConfirmAction, string> = {
  nextRace: "Clear this race and start the next one?",
  clearJudge: "Clear judge data and keep the start timestamp?",
  changeRef: "Changing reference lane will reset lane gaps. Continue?",
};

export function renderConfirmDialog(state: AppState): string {
  if (!state.confirmAction) return "";

  return `
    <div class="confirm-overlay" role="dialog" aria-modal="true">
      <div class="confirm-dialog">
        <p>${CONFIRM_MESSAGES[state.confirmAction]}</p>
        <div class="confirm-actions">
          <button type="button" class="btn btn-small" data-action="confirm-cancel">Cancel</button>
          <button type="button" class="btn btn-primary" data-action="confirm-ok">Confirm</button>
        </div>
      </div>
    </div>
  `;
}

export function renderFooter(showFooter: boolean): void {
  const existing = document.getElementById("footer-actions");
  if (existing) existing.remove();

  if (!showFooter) return;

  const footerEl = document.createElement("div");
  footerEl.id = "footer-actions";
  footerEl.className = "footer-actions";
  footerEl.innerHTML = `
    <button type="button" class="btn btn-primary" data-action="next-race">Next race</button>
    <button type="button" class="btn btn-secondary" data-action="clear-judge">Clear judge data</button>
  `;
  document.body.appendChild(footerEl);
}
