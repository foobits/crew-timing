import type { LaneDraft, LaneResult, RaceDraft } from "./race-state";

export function canCollapseContext(race: RaceDraft): boolean {
  return race.startTimestampMs !== null && race.referenceElapsedMs !== null;
}

export function sortResults(
  results: LaneResult[],
  sort: "place" | "lane",
): LaneResult[] {
  if (sort === "lane") {
    return [...results].sort((a, b) => a.lane - b.lane);
  }
  return results;
}

export function formatGapInput(lane: LaneDraft): string {
  if (lane.gapMs === null) return "";
  const mins = Math.floor(lane.gapMs / 60_000);
  const secs = Math.floor((lane.gapMs % 60_000) / 1_000);
  const ms = lane.gapMs % 1_000;
  if (mins > 0) {
    return `${mins}:${String(secs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  }
  if (ms > 0 || secs > 0) {
    return `${secs}.${String(ms).padStart(3, "0").replace(/0+$/, "").replace(/\.$/, "") || "0"}`;
  }
  return "0";
}

export function applyInputFormatValue(
  value: string,
  format: (raw: string) => string,
): string {
  return format(value);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, "&#39;");
}
