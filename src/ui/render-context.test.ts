import { describe, expect, it } from "vitest";
import { sampleAppState } from "../test/fixtures";
import {
  renderContextCaret,
  renderContextFields,
  renderContextSection,
  renderContextSummary,
  renderRestoredBanner,
  renderUndoBanner,
} from "./render-context";

describe("renderContextCaret", () => {
  it("reflects expanded and collapsed aria state", () => {
    expect(renderContextCaret(false)).toContain('aria-expanded="true"');
    expect(renderContextCaret(true)).toContain('aria-expanded="false"');
  });
});

describe("renderContextSummary", () => {
  it("shows formatted start, reference lane, and elapsed values", () => {
    const html = renderContextSummary(sampleAppState().race);

    expect(html).toContain("Start of Race:");
    expect(html).toContain("Reference Lane:");
    expect(html).toContain("Time on water:");
    expect(html).toContain("3");
  });
});

describe("renderContextFields", () => {
  it("shows the stale-start confirmation checkbox when needed", () => {
    const fresh = renderContextFields(sampleAppState(), false);
    expect(fresh).not.toContain('id="start-confirmed"');

    const stale = renderContextFields(sampleAppState(), true);
    expect(stale).toContain('id="start-confirmed"');
    expect(stale).toContain("Confirm start timestamp is correct");
  });
});

describe("renderContextSection", () => {
  it("renders collapsed summary markup when context is collapsed", () => {
    const html = renderContextSection(sampleAppState({ contextCollapsed: true }), false);

    expect(html).toContain('class="card collapsed"');
    expect(html).toContain('data-action="expand-context"');
    expect(html).toContain('class="context-fields"');
  });
});

describe("renderRestoredBanner", () => {
  it("returns empty output when the banner is hidden", () => {
    expect(renderRestoredBanner(sampleAppState(), false)).toBe("");
  });

  it("includes stale-draft guidance when needed", () => {
    const html = renderRestoredBanner(sampleAppState({ restoredBanner: true }), true);

    expect(html).toContain("Restored race draft from");
    expect(html).toContain("different date");
  });
});

describe("renderUndoBanner", () => {
  it("renders only when an undo snapshot exists", () => {
    expect(renderUndoBanner(sampleAppState())).toBe("");
    expect(renderUndoBanner(sampleAppState({ undoSnapshot: sampleAppState().race }))).toContain(
      'data-action="undo"',
    );
  });
});
