import type { AppState, ConfirmAction } from "../app/types";
import { formatBuildLabel } from "../app/build-info";
import { renderButton } from "./components";

const CONFIRM_MESSAGES: Record<ConfirmAction, string> = {
  nextRace: "Clear this race and start the next one?",
  clearJudge: "Clear judge data and keep the start timestamp?",
  changeRef: "Changing reference lane will reset lane gaps. Continue?",
  removeLane: "Removing the reference lane will clear judge data. Continue?",
};

export function renderConfirmDialog(state: AppState): string {
  if (!state.confirmAction) return "";

  return `
    <div class="confirm-overlay" role="dialog" aria-modal="true">
      <div class="confirm-dialog">
        <p>${CONFIRM_MESSAGES[state.confirmAction]}</p>
        <div class="confirm-actions">
          ${renderButton({ label: "Cancel", variant: "small", action: "confirm-cancel" })}
          ${renderButton({ label: "Confirm", variant: "primary", action: "confirm-ok" })}
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
    ${renderButton({ label: "Next race", variant: "primary", action: "next-race" })}
    ${renderButton({ label: "Clear judge data", variant: "secondary", action: "clear-judge" })}
  `;
  document.body.appendChild(footerEl);
}

export function renderAppMeta(): void {
  let meta = document.getElementById("app-meta");
  if (!meta) {
    meta = document.createElement("footer");
    meta.id = "app-meta";
    meta.className = "app-meta";
    meta.setAttribute("aria-label", "App version");
    document.body.appendChild(meta);
  }
  meta.textContent = formatBuildLabel();
}
