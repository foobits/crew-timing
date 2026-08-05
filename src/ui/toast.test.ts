// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { announce, initToast, showToast } from "./toast";

describe("toast helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="toast" hidden></div>';
    initToast(document.getElementById("toast")!);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("shows a message and hides it after the timeout", () => {
    showToast("Copied timestamp");

    const toast = document.getElementById("toast")!;
    expect(toast.textContent).toBe("Copied timestamp");
    expect(toast.hidden).toBe(false);

    vi.advanceTimersByTime(2200);
    expect(toast.hidden).toBe(true);
  });

  it("routes announce through showToast", () => {
    announce("Undo available");
    expect(document.getElementById("toast")?.textContent).toBe("Undo available");
  });

  it("does nothing when toast has not been initialized", () => {
    document.body.innerHTML = "";
    expect(() => showToast("Ignored")).not.toThrow();
  });
});
