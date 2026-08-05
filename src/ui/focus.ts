export interface FocusSnapshot {
  id: string;
  selectionStart: number | null;
  selectionEnd: number | null;
}

export function captureFocus(): FocusSnapshot | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) {
    return null;
  }
  if (!active.id) {
    return null;
  }
  return {
    id: active.id,
    selectionStart: active.selectionStart,
    selectionEnd: active.selectionEnd,
  };
}

export function restoreFocus(focus: FocusSnapshot | null): void {
  if (!focus) return;
  const el = document.getElementById(focus.id);
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
    return;
  }
  el.focus();
  if (focus.selectionStart !== null && focus.selectionEnd !== null) {
    el.setSelectionRange(focus.selectionStart, focus.selectionEnd);
  }
}
