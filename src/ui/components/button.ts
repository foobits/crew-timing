import { joinClasses, optionalAttr, optionalBoolAttr, renderDataAttrs } from "./attrs";

export type ButtonVariant = "primary" | "secondary" | "small" | "copy";

export interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  action?: string;
  disabled?: boolean;
  tabindex?: string;
  ariaLabel?: string;
  className?: string;
  data?: Record<string, string | number>;
}

export function renderButton({
  label,
  variant,
  action,
  disabled,
  tabindex,
  ariaLabel,
  className,
  data = {},
}: ButtonProps): string {
  const variantClass =
    variant === "primary"
      ? "btn-primary"
      : variant === "secondary"
        ? "btn-secondary"
        : variant === "small"
          ? "btn-small"
          : variant === "copy"
            ? "btn-copy"
            : "";

  const dataAttrString = renderDataAttrs(data);

  return `<button type="button" class="${joinClasses("btn", variantClass, className)}"${optionalAttr("data-action", action)}${dataAttrString ? ` ${dataAttrString}` : ""}${optionalBoolAttr("disabled", disabled)}${optionalAttr("tabindex", tabindex)}${optionalAttr("aria-label", ariaLabel)}>${label}</button>`;
}
