import { joinClasses } from "./attrs";

export interface CardProps {
  id?: string;
  className?: string;
  content: string;
}

export function renderCard({ id, className, content }: CardProps): string {
  return `<section class="${joinClasses("card", className)}"${id ? ` id="${id}"` : ""}>${content}</section>`;
}

export function renderSectionHeader(title: string, actions = ""): string {
  return `
    <div class="section-header">
      <h2>${title}</h2>
      ${actions}
    </div>
  `;
}
