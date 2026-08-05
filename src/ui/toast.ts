let toastEl: HTMLElement | null = null;

export function initToast(el: HTMLElement): void {
  toastEl = el;
}

export function showToast(message: string): void {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.hidden = false;
  window.setTimeout(() => {
    if (toastEl) toastEl.hidden = true;
  }, 2200);
}

export function announce(message: string): void {
  showToast(message);
}
