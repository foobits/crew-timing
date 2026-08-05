// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest";
import { captureFocus, restoreFocus } from "./focus";

describe("focus helpers", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="start-ts" value="10:05:03.111" />
      <textarea id="notes"></textarea>
      <button id="action">Go</button>
    `;
  });

  it("captures focus only for identified text inputs", () => {
    const button = document.getElementById("action")!;
    button.focus();
    expect(captureFocus()).toBeNull();

    const input = document.getElementById("start-ts") as HTMLInputElement;
    input.focus();
    input.setSelectionRange(2, 5);

    expect(captureFocus()).toEqual({
      id: "start-ts",
      selectionStart: 2,
      selectionEnd: 5,
    });
  });

  it("restores focus and text selection", () => {
    const input = document.getElementById("start-ts") as HTMLInputElement;
    restoreFocus({ id: "start-ts", selectionStart: 1, selectionEnd: 4 });

    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(4);
  });

  it("ignores restore requests for missing or non-text elements", () => {
    const button = document.getElementById("action")!;
    button.focus();
    restoreFocus({ id: "missing", selectionStart: 0, selectionEnd: 1 });
    expect(document.activeElement).toBe(button);
  });
});
