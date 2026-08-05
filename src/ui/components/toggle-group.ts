import { joinClasses } from "./attrs";

export interface ToggleOption {
  label: string;
  selected: boolean;
  ariaPressed: boolean;
  dataAttrs: Record<string, string>;
  disabled?: boolean;
}

export interface ToggleGroupProps {
  ariaLabel: string;
  options: ToggleOption[];
  className?: string;
  locked?: boolean;
  tabindex?: string;
}

export function renderToggleGroup({
  ariaLabel,
  options,
  className,
  locked,
  tabindex = "-1",
}: ToggleGroupProps): string {
  const buttons = options
    .map((option) => {
      const dataAttrs = Object.entries(option.dataAttrs)
        .map(([key, value]) => `data-${key}="${value}"`)
        .join(" ");

      return `<button
        type="button"
        class="lane-status-btn${option.selected ? " selected" : ""}"
        ${dataAttrs}
        aria-pressed="${option.ariaPressed}"
        tabindex="${tabindex}"
        ${option.disabled ? "disabled" : ""}
      >${option.label}</button>`;
    })
    .join("");

  return `
    <div class="${joinClasses("lane-status-toggle", locked && "lane-status-toggle--locked", className)}" role="group" aria-label="${ariaLabel}"${locked ? ' aria-disabled="true"' : ""}>
      ${buttons}
    </div>
  `;
}
