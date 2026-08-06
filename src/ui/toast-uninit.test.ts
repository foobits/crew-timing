// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("toast before initialization", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
  });

  it("does nothing when toast has not been initialized", async () => {
    const { showToast, announce } = await import("./toast");
    expect(() => showToast("Ignored")).not.toThrow();
    expect(() => announce("Also ignored")).not.toThrow();
  });
});
