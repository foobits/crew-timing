import { escapeAttr } from "../../lib/ui-helpers";
import { optionalAttr } from "./attrs";

export interface TextFieldProps {
  id: string;
  label: string;
  formatHint?: string;
  value?: string;
  placeholder?: string;
  inputmode?: string;
  autocomplete?: string;
}

export function renderTextField({
  id,
  label,
  formatHint,
  value = "",
  placeholder,
  inputmode,
  autocomplete = "off",
}: TextFieldProps): string {
  const format = formatHint ? `<span class="label-format">${formatHint}</span>` : "";

  return `
    <div class="field">
      <label for="${id}">
        ${label}
        ${format}
      </label>
      <input id="${id}" type="text"${optionalAttr("inputmode", inputmode)} value="${escapeAttr(value)}"${optionalAttr("placeholder", placeholder)} autocomplete="${autocomplete}" />
    </div>
  `;
}

export interface SelectFieldProps {
  id: string;
  label: string;
  value: number;
  options: Array<{ value: number; label: string }>;
}

export function renderSelectField({ id, label, value, options }: SelectFieldProps): string {
  return `
    <div class="field">
      <label for="${id}">${label}</label>
      <select id="${id}">${options
        .map(
          (option) =>
            `<option value="${option.value}" ${option.value === value ? "selected" : ""}>${option.label}</option>`,
        )
        .join("")}</select>
    </div>
  `;
}

export interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
}

export function renderCheckboxField({ id, label, checked }: CheckboxFieldProps): string {
  return `
    <div class="field">
      <label><input type="checkbox" id="${id}" ${checked ? "checked" : ""} /> ${label}</label>
    </div>
  `;
}
