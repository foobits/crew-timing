import { describe, expect, it } from "vitest";
import {
  addDurationToTimestamp,
  formatElapsed,
  formatGap,
  formatTimestamp,
  parseElapsed,
  parseGap,
  parseTimestamp,
} from "./time";

describe("parseTimestamp", () => {
  it("parses whole seconds and fractional digits", () => {
    expect(parseTimestamp("13:08:01")).toEqual({ ok: true, value: 47_281_000 });
    expect(parseTimestamp("13:08:01.491")).toEqual({ ok: true, value: 47_281_491 });
    expect(parseTimestamp("13:08:01.4")).toEqual({ ok: true, value: 47_281_400 });
  });

  it("rejects invalid values", () => {
    expect(parseTimestamp("").ok).toBe(false);
    expect(parseTimestamp("25:00:00").ok).toBe(false);
    expect(parseTimestamp("12:60:00").ok).toBe(false);
    expect(parseTimestamp("12:00:00.1234").ok).toBe(false);
  });
});

describe("parseElapsed", () => {
  it("parses MM:SS and decimals", () => {
    expect(parseElapsed("7:23.45")).toEqual({ ok: true, value: 443_450 });
    expect(parseElapsed("07:23.450")).toEqual({ ok: true, value: 443_450 });
    expect(parseElapsed("143")).toEqual({ ok: true, value: 143_000 });
  });
});

describe("parseGap", () => {
  it("parses signed gaps", () => {
    expect(parseGap("+0:02.340")).toEqual({
      ok: true,
      value: 2_340,
      signed: { ms: 2_340, negative: false },
    });
    expect(parseGap("-0:01.200")).toEqual({
      ok: true,
      value: 1_200,
      signed: { ms: 1_200, negative: true },
    });
    expect(parseGap("2.34")).toEqual({
      ok: true,
      value: 2_340,
      signed: { ms: 2_340, negative: false },
    });
  });

  it("rejects space after sign", () => {
    expect(parseGap("+ 2.34").ok).toBe(false);
  });
});

describe("formatting", () => {
  it("formats timestamp with padding", () => {
    expect(formatTimestamp(47_281_491)).toBe("13:08:01.491");
  });

  it("formats elapsed", () => {
    expect(formatElapsed(443_450)).toBe("07:23.450");
    expect(formatElapsed(443_450 + 560)).toBe("07:24.010");
  });

  it("formats gap with sign", () => {
    expect(formatGap({ ms: 2_340, negative: false })).toBe("+00:02.340");
    expect(formatGap({ ms: 1_200, negative: true })).toBe("-00:01.200");
  });
});

describe("arithmetic", () => {
  it("adds duration to timestamp", () => {
    const start = parseTimestamp("13:08:01.491");
    expect(start.ok).toBe(true);
    if (!start.ok) return;

    const elapsed = 143_450 + 2_340;
    const finish = addDurationToTimestamp(start.value, elapsed);
    expect(formatTimestamp(finish.ms)).toBe("13:10:27.281");
    expect(finish.dayOffset).toBe(0);
  });

  it("handles midnight rollover", () => {
    const start = parseTimestamp("23:58:30.500");
    expect(start.ok).toBe(true);
    if (!start.ok) return;

    const elapsed = 3 * 60_000 + 15_250;
    const finish = addDurationToTimestamp(start.value, elapsed);
    expect(formatTimestamp(finish.ms)).toBe("00:01:45.750");
    expect(finish.dayOffset).toBe(1);
  });

  it("subtracts gap from reference elapsed", () => {
    const ref = 443_450;
    const gap = 1_200;
    expect(ref - gap).toBe(442_250);
    expect(formatElapsed(442_250)).toBe("07:22.250");
  });
});

describe("round trip", () => {
  it("parse then format elapsed", () => {
    const parsed = parseElapsed("07:23.450");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(formatElapsed(parsed.value)).toBe("07:23.450");
  });
});
