import { describe, expect, it } from "vitest";
import { computeRace } from "../lib/race-state";
import { sampleAppState } from "../test/fixtures";
import { renderResultsBody, renderResultsSection } from "./render-results";

describe("renderResultsBody", () => {
  it("shows the idle prompt before calculation", () => {
    const html = renderResultsBody(
      sampleAppState({ showResults: false }),
      { valid: false, errors: [], results: [] },
      [],
    );

    expect(html).toContain("Enter race data and lane splits");
  });

  it("renders validation errors after calculate", () => {
    const html = renderResultsBody(
      sampleAppState({ showResults: true }),
      { valid: false, errors: ["Enter reference elapsed time."], results: [] },
      [],
    );

    expect(html).toContain("Enter reference elapsed time.");
    expect(html).toContain("Fix the errors above and calculate again.");
  });

  it("renders result cards when computed output is valid", () => {
    const state = sampleAppState({ showResults: true });
    const computed = computeRace(state.race);

    const html = renderResultsBody(state, computed, computed.results);
    expect(html).toContain('class="result-card"');
    expect(html).toContain('data-copy-lane="2"');
  });
});

describe("renderResultsSection", () => {
  it("includes sort controls and copy-all when results are visible", () => {
    const state = sampleAppState({ showResults: true });
    const computed = computeRace(state.race);
    const html = renderResultsSection(state, computed, computed.results);

    expect(html).toContain('id="results-card"');
    expect(html).toContain('data-results-sort="place"');
    expect(html).toContain('data-action="copy-all"');
  });

  it("marks copied lanes in the result card", () => {
    const state = sampleAppState({ showResults: true, copiedLanes: new Set([2]) });
    const computed = computeRace(state.race);
    const html = renderResultsSection(state, computed, computed.results);

    expect(html).toContain('class="result-card copied"');
  });
});
