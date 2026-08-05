let toastEl: HTMLElement | null = null;

export function initToast(el: HTMLElement): void {
  toastEl = el;
}

export function showToast(message: string): void {
  if (!toastEl) return;
  const el = toastEl;
  el.textContent = message;
  el.hidden = false;
  window.setTimeout(() => {
    el.hidden = true;
  }, 2200);
}

export function announce(message: string): void {
  showToast(message);
}
