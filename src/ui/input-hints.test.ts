// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import { setInputValidationHint, syncTimeInputValidationHints } from "./input-hints";

describe("setInputValidationHint", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("creates an inline error hint linked to the input", () => {
    document.body.innerHTML = '<div class="field"><input id="ref-elapsed" type="text" /></div>';
    const input = document.getElementById("ref-elapsed") as HTMLInputElement;

    setInputValidationHint(input, "Enter reference elapsed time.");

    const hint = document.getElementById("ref-elapsed-hint");
    expect(hint?.textContent).toBe("Enter reference elapsed time.");
    expect(hint?.className).toContain("field-hint--error");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("ref-elapsed-hint");
  });

  it("clears hints and aria state when validation passes", () => {
    document.body.innerHTML = '<div class="field"><input id="ref-elapsed" type="text" /></div>';
    const input = document.getElementById("ref-elapsed") as HTMLInputElement;

    setInputValidationHint(input, "Bad value");
    setInputValidationHint(input, null);

    expect(document.getElementById("ref-elapsed-hint")).toBeNull();
    expect(input.hasAttribute("aria-invalid")).toBe(false);
    expect(input.hasAttribute("aria-describedby")).toBe(false);
  });

  it("supports gap inputs without an id", () => {
    document.body.innerHTML =
      '<div class="gap-input-wrap"><input class="lane-gap-input" data-gap-input="2" type="text" /></div>';
    const input = document.querySelector("[data-gap-input='2']") as HTMLInputElement;

    setInputValidationHint(input, "Use MM:SS.SSS or seconds with optional decimals.");

    expect(document.getElementById("gap-2-hint")?.textContent).toContain("MM:SS.SSS");
    expect(input.getAttribute("aria-describedby")).toBe("gap-2-hint");
  });

  it("syncs validation hints for all time inputs in a form root", () => {
    document.body.innerHTML = `
      <div id="form">
        <input id="start-ts" type="text" value="bad" />
        <input id="ref-elapsed" type="text" value="0:99.000" />
        <input data-gap-input="2" type="text" value="not-a-gap" />
      </div>
    `;
    const root = document.getElementById("form")!;

    syncTimeInputValidationHints(root);

    expect(document.getElementById("start-ts-hint")?.textContent).toBeTruthy();
    expect(document.getElementById("ref-elapsed-hint")?.textContent).toContain("59");
    expect(document.getElementById("gap-2-hint")?.textContent).toBeTruthy();
  });
});
