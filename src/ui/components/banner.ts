import { renderButton } from "./button";

export function renderBanner(message: string, role = "status"): string {
  return `<div class="banner" role="${role}">${message}</div>`;
}

export function renderActionBanner(action: string, label: string): string {
  return `<div class="banner">${renderButton({ label, variant: "secondary", action })}</div>`;
}
