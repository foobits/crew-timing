import {
  validateLaneGapInput,
  validateReferenceElapsedInput,
  validateStartTimestampInput,
} from "../lib/field-validation";

const HINT_CLASS = "field-hint field-hint--error";

function hintElementId(input: HTMLInputElement): string {
  const key = input.id || `gap-${input.dataset.gapInput ?? "unknown"}`;
  return `${key}-hint`;
}

export function setInputValidationHint(input: HTMLInputElement, error: string | null): void {
  const hintId = hintElementId(input);
  const existing = document.getElementById(hintId);

  if (!error) {
    input.removeAttribute("aria-invalid");
    const describedBy = input.getAttribute("aria-describedby");
    if (describedBy === hintId) {
      input.removeAttribute("aria-describedby");
    }
    existing?.remove();
    return;
  }

  input.setAttribute("aria-invalid", "true");

  const hint = existing ?? document.createElement("p");
  if (!existing) {
    hint.id = hintId;
    hint.className = input.dataset.gapInput
      ? `${HINT_CLASS} gap-field-hint`
      : HINT_CLASS;
    hint.setAttribute("role", "status");
    if (input.dataset.gapInput && input.parentElement) {
      input.parentElement.appendChild(hint);
    } else {
      input.insertAdjacentElement("afterend", hint);
    }
  }

  input.setAttribute("aria-describedby", hintId);
  hint.textContent = error;
}

export function syncTimeInputValidationHints(root: ParentNode): void {
  const start = root.querySelector<HTMLInputElement>("#start-ts");
  if (start) {
    setInputValidationHint(start, validateStartTimestampInput(start.value));
  }

  const ref = root.querySelector<HTMLInputElement>("#ref-elapsed");
  if (ref) {
    setInputValidationHint(ref, validateReferenceElapsedInput(ref.value));
  }

  for (const gap of root.querySelectorAll<HTMLInputElement>("[data-gap-input]:not([readonly])")) {
    setInputValidationHint(gap, validateLaneGapInput(gap.value));
  }
}
