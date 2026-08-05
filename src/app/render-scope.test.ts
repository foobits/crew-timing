import { afterEach, describe, expect, it, vi } from "vitest";
import { isInstantScrollPreferred, mergeRenderScope } from "./render-scope";

describe("mergeRenderScope", () => {
  it("keeps the higher-priority scope", () => {
    expect(mergeRenderScope({ type: "none" }, { type: "full" })).toEqual({ type: "full" });
    expect(mergeRenderScope({ type: "context" }, { type: "lanes" })).toEqual({ type: "lanes" });
    expect(mergeRenderScope({ type: "lanes" }, { type: "results" })).toEqual({ type: "lanes" });
  });

  it("keeps the current scope when it already has higher priority", () => {
    expect(mergeRenderScope({ type: "full" }, { type: "context" })).toEqual({ type: "full" });
    expect(mergeRenderScope({ type: "results" }, { type: "lane-row", lane: 2 })).toEqual({
      type: "results",
    });
  });

  it("promotes different lane-row updates to a full lanes refresh", () => {
    expect(
      mergeRenderScope({ type: "lane-row", lane: 2 }, { type: "lane-row", lane: 3 }),
    ).toEqual({ type: "lanes" });
  });

  it("keeps the same lane-row scope when the lane matches", () => {
    expect(
      mergeRenderScope({ type: "lane-row", lane: 2 }, { type: "lane-row", lane: 2 }),
    ).toEqual({ type: "lane-row", lane: 2 });
  });
});

describe("isInstantScrollPreferred", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when reduced motion is preferred", () => {
    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({ matches: true })),
      innerWidth: 1280,
    });

    expect(isInstantScrollPreferred()).toBe(true);
  });

  it("returns true on touch devices even without reduced motion", () => {
    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({ matches: false })),
      innerWidth: 1280,
      ontouchstart: () => {},
    });

    expect(isInstantScrollPreferred()).toBe(true);
  });

  it("returns true on narrow viewports", () => {
    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({ matches: false })),
      innerWidth: 390,
    });

    expect(isInstantScrollPreferred()).toBe(true);
  });

  it("returns false on desktop-width non-touch viewports", () => {
    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({ matches: false })),
      innerWidth: 1280,
    });

    expect(isInstantScrollPreferred()).toBe(false);
  });
});
