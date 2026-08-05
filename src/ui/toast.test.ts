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
    expect(() => announce("Also ignored")).not.toThrow();
  });

  it("replaces the visible message when called again before hide", () => {
    showToast("First");
    showToast("Second");
    expect(document.getElementById("toast")?.textContent).toBe("Second");
  });

  it("can show a new message after the previous toast hides", () => {
    showToast("First");
    vi.advanceTimersByTime(2200);
    showToast("Second");
    expect(document.getElementById("toast")?.hidden).toBe(false);
    expect(document.getElementById("toast")?.textContent).toBe("Second");
  });

  it("keeps the captured toast visible through hide even after re-init", () => {
    const first = document.getElementById("toast")!;
    showToast("Persist on first element");

    const replacement = document.createElement("div");
    replacement.id = "toast";
    replacement.hidden = true;
    document.body.appendChild(replacement);
    initToast(replacement);

    vi.advanceTimersByTime(2200);
    expect(first.hidden).toBe(true);
    expect(replacement.hidden).toBe(true);
  });
});
