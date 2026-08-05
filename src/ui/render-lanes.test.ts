import { describe, expect, it } from "vitest";
import { sampleAppState } from "../test/fixtures";
import { createEmptyRace, touchRace } from "../lib/race-state";
import { renderLaneGridHtml, renderLaneRowHtml, renderLanesSection } from "./render-lanes";

describe("renderLaneRowHtml", () => {
  it("marks the reference lane as locked and shows the sign toggle for active lanes", () => {
    const state = sampleAppState();
    const refLane = state.race.lanes.find((lane) => lane.lane === 3)!;
    const activeLane = state.race.lanes.find((lane) => lane.lane === 2)!;

    const refHtml = renderLaneRowHtml(state, refLane);
    expect(refHtml).toContain("lane-ref-badge");
    expect(refHtml).toContain("lane-gap-input--locked");
    expect(refHtml).not.toContain('data-gap-sign="3"');

    const activeHtml = renderLaneRowHtml(state, activeLane);
    expect(activeHtml).toContain('data-gap-sign="2"');
    expect(activeHtml).toContain('data-gap-input="2"');
  });

  it("shows negative styling when gapNegative is true", () => {
    const state = sampleAppState();
    const lane = {
      ...state.race.lanes.find((entry) => entry.lane === 2)!,
      gapNegative: true,
    };

    expect(renderLaneRowHtml(state, lane)).toContain("gap-sign-btn--negative");
  });
});

describe("renderLaneGridHtml", () => {
  it("renders one row per lane", () => {
    const html = renderLaneGridHtml(sampleAppState());
    expect(html.match(/class="lane-row/g)?.length).toBe(sampleAppState().race.lanes.length);
  });
});

describe("renderLanesSection", () => {
  it("includes lane controls, grid, and calculate action", () => {
    const html = renderLanesSection(sampleAppState());

    expect(html).toContain('id="lanes-section"');
    expect(html).toContain('data-action="calculate"');
    expect(html).toContain('data-action="add-lane"');
    expect(html).toContain('data-action="remove-lane"');
  });

  it("disables remove lane at the minimum lane count", () => {
    const state = sampleAppState({
      race: touchRace({
        ...createEmptyRace(),
        lanes: createEmptyRace().lanes.slice(0, 1),
      }),
    });

    expect(renderLanesSection(state)).toContain('data-action="remove-lane" disabled');
  });
});
