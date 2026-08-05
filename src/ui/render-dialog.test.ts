// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createInitialState } from "../app/state";
import { renderConfirmDialog, renderFooter, renderAppMeta } from "./render-dialog";

describe("renderConfirmDialog", () => {
  it("returns empty output when no action is pending", () => {
    expect(renderConfirmDialog(createInitialState())).toBe("");
  });

  it("renders the next-race confirmation copy", () => {
    const html = renderConfirmDialog({
      ...createInitialState(),
      confirmAction: "nextRace",
    });

    expect(html).toContain('role="dialog"');
    expect(html).toContain("Clear this race and start the next one?");
    expect(html).toContain('data-action="confirm-cancel"');
    expect(html).toContain('data-action="confirm-ok"');
  });
});

describe("renderFooter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("appends footer actions when enabled", () => {
    renderFooter(true);

    const footer = document.getElementById("footer-actions");
    expect(footer).not.toBeNull();
    expect(footer?.textContent).toContain("Next race");
    expect(footer?.textContent).toContain("Clear judge data");
  });

  it("removes an existing footer when hidden", () => {
    renderFooter(true);
    renderFooter(false);

    expect(document.getElementById("footer-actions")).toBeNull();
  });
});

describe("renderAppMeta", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows the build label in a fixed footer meta element", () => {
    renderAppMeta();

    const meta = document.getElementById("app-meta");
    expect(meta).not.toBeNull();
    expect(meta?.textContent).toMatch(/^v\d+\.\d+\.\d+ · \d{4}-\d{2}-\d{2}$/);
  });
});
