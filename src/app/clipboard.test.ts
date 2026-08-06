// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./clipboard";

describe("copyText", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("prefers the sync textarea copy before the async clipboard API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    await expect(copyText("10:05:03.111")).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to the async clipboard API when execCommand fails", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const execCommand = vi.fn().mockReturnValue(false);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    await expect(copyText("lane 2")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("lane 2");
  });

  it("returns false when every copy strategy fails", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
      },
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });

    await expect(copyText("fallback")).resolves.toBe(false);
  });

  it("returns false when execCommand throws and clipboard is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => {
        throw new Error("blocked");
      }),
    });

    await expect(copyText("blocked")).resolves.toBe(false);
  });

  it("returns false when execCommand fails and clipboard API is missing", async () => {
    vi.stubGlobal("navigator", {});
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });

    await expect(copyText("fallback")).resolves.toBe(false);
  });

  it("uses a viewport-positioned textarea for sync copy (not sr-only)", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn() } });
    const created: HTMLTextAreaElement[] = [];
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === "textarea") created.push(el as HTMLTextAreaElement);
      return el;
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(true),
    });

    await copyText("10:05:03.111");

    expect(created).toHaveLength(1);
    expect(created[0].className).not.toContain("sr-only");
    expect(created[0].style.position).toBe("fixed");
  });
});
