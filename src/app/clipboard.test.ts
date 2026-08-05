// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./clipboard";

describe("copyText", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the async clipboard API when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await expect(copyText("10:05:03.111")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("10:05:03.111");
  });

  it("falls back to execCommand when clipboard API fails", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
      },
    });
    const execCommand = vi.fn().mockReturnValue(true);
    vi.stubGlobal("document", {
      ...document,
      execCommand,
      body: document.body,
      createElement: document.createElement.bind(document),
      querySelector: document.querySelector.bind(document),
    });

    await expect(copyText("lane 2")).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("uses the textarea fallback when clipboard is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    await expect(copyText("fallback")).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
  });
});
