import { describe, expect, it } from "vitest";
import { createEmptyRace } from "./race-state";
import {
  applyInputFormatValue,
  canCollapseContext,
  escapeAttr,
  escapeHtml,
  formatGapInput,
  sortResults,
} from "./ui-helpers";

describe("canCollapseContext", () => {
  it("is true when start and reference elapsed are set", () => {
    const race = {
      ...createEmptyRace(),
      startTimestampMs: 1,
      referenceElapsedMs: 2,
    };
    expect(canCollapseContext(race)).toBe(true);
  });

  it("is false when reference elapsed is missing", () => {
    const race = { ...createEmptyRace(), startTimestampMs: 1 };
    expect(canCollapseContext(race)).toBe(false);
  });
});

describe("sortResults", () => {
  const results = [
    {
      lane: 5,
      place: 2,
      tied: false,
      elapsedMs: 2,
      finishTimestampMs: 1,
      dayOffset: 0,
      finishFormatted: "a",
      elapsedFormatted: "b",
    },
    {
      lane: 2,
      place: 1,
      tied: false,
      elapsedMs: 1,
      finishTimestampMs: 1,
      dayOffset: 0,
      finishFormatted: "c",
      elapsedFormatted: "d",
    },
  ];

  it("keeps place order by default", () => {
    expect(sortResults(results, "place").map((r) => r.lane)).toEqual([5, 2]);
  });

  it("sorts by lane when requested", () => {
    expect(sortResults(results, "lane").map((r) => r.lane)).toEqual([2, 5]);
  });
});

describe("formatGapInput", () => {
  it("formats sub-minute gaps as decimal seconds", () => {
    expect(
      formatGapInput({
        lane: 2,
        status: "active",
        gapMs: 2_511,
        gapNegative: true,
      }),
    ).toBe("2.511");
  });

  it("formats whole-second gaps without fractional padding", () => {
    expect(
      formatGapInput({
        lane: 2,
        status: "active",
        gapMs: 5_000,
        gapNegative: false,
      }),
    ).toBe("5.0");
  });

  it("formats minute-or-longer gaps as MM:SS.SSS", () => {
    expect(
      formatGapInput({
        lane: 2,
        status: "active",
        gapMs: 83_450,
        gapNegative: false,
      }),
    ).toBe("1:23.450");
  });

  it("returns an empty string for unset gaps", () => {
    expect(
      formatGapInput({
        lane: 2,
        status: "active",
        gapMs: null,
        gapNegative: false,
      }),
    ).toBe("");
  });

  it("returns zero for an explicit zero gap", () => {
    expect(
      formatGapInput({
        lane: 2,
        status: "active",
        gapMs: 0,
        gapNegative: false,
      }),
    ).toBe("0");
  });
});

describe("escape helpers", () => {
  it("escapes HTML", () => {
    expect(escapeHtml(`Tom & Jerry <3 "quotes"`)).toBe(
      "Tom &amp; Jerry &lt;3 &quot;quotes&quot;",
    );
  });

  it("escapes attributes", () => {
    expect(escapeAttr("it's fine")).toBe("it&#39;s fine");
  });
});

describe("applyInputFormatValue", () => {
  it("returns formatted value", () => {
    expect(applyInputFormatValue("130801491", (v) => v.slice(0, 2))).toBe("13");
  });
});
