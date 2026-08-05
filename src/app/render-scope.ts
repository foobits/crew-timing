export type RenderScope =
  | { type: "full" }
  | { type: "context" }
  | { type: "lanes" }
  | { type: "lane-row"; lane: number }
  | { type: "results" }
  | { type: "banners" }
  | { type: "dialog" }
  | { type: "footer" }
  | { type: "copied-lane"; lane: number }
  | { type: "none" };

const SCOPE_PRIORITY: Record<RenderScope["type"], number> = {
  full: 100,
  lanes: 80,
  context: 60,
  results: 50,
  banners: 40,
  dialog: 30,
  footer: 25,
  "lane-row": 20,
  "copied-lane": 10,
  none: 0,
};

export function mergeRenderScope(current: RenderScope, next: RenderScope): RenderScope {
  if (SCOPE_PRIORITY[next.type] > SCOPE_PRIORITY[current.type]) {
    return next;
  }
  if (next.type === "lane-row" && current.type === "lane-row" && current.lane !== next.lane) {
    return { type: "lanes" };
  }
  return current;
}

export function isInstantScrollPreferred(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return true;
  }
  return "ontouchstart" in window || window.innerWidth < 768;
}
