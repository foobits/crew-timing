import { escapeAttr } from "../../lib/ui-helpers";

export function joinClasses(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function renderDataAttrs(attrs: Record<string, string | number | undefined>): string {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `data-${key}="${escapeAttr(String(value))}"`)
    .join(" ");
}

export function optionalAttr(name: string, value: string | undefined): string {
  return value ? ` ${name}="${escapeAttr(value)}"` : "";
}

export function optionalBoolAttr(name: string, enabled: boolean | undefined): string {
  return enabled ? ` ${name}` : "";
}
