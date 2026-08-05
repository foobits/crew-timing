// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./create-app";
import { loadPersistedRace, touchRace, createEmptyRace } from "../lib/race-state";
import { flushPendingPersist } from "./persist-scheduler";

function fillTimeInput(root: ParentNode, selector: string, digits: string): void {
  const input = root.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`Missing input: ${selector}`);
  input.focus();
  input.value = "";
  for (const digit of digits) {
    input.dispatchEvent(new InputEvent("input", { data: digit, bubbles: true, inputType: "insertText" }));
    input.value = `${input.value}${digit}`;
  }
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.blur();
}

describe("createApp", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <div id="app"></div>
      <div id="toast" hidden></div>
    `;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("renders the full app on init and restores persisted drafts", () => {
    const race = touchRace({
      ...createEmptyRace(),
      eventLabel: "Mens 1V",
      startTimestampMs: 47_281_491,
      referenceElapsedMs: 143_450,
    });
    localStorage.setItem("crew-timing-race-draft", JSON.stringify(race));

    const root = document.getElementById("app")!;
    const toast = document.getElementById("toast")!;
    createApp(root, toast).init();

    expect(root.querySelector("#context-card")).not.toBeNull();
    expect(root.querySelector("#lanes-section")).not.toBeNull();
    expect(root.querySelector("#results-card")).not.toBeNull();
    expect(root.querySelector<HTMLInputElement>("#event-label")?.value).toBe("Mens 1V");
    expect(loadPersistedRace()?.eventLabel).toBe("Mens 1V");
  });

  it("schedules batched renders through requestAnimationFrame", () => {
    vi.useFakeTimers();
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });

    const root = document.getElementById("app")!;
    const toast = document.getElementById("toast")!;
    createApp(root, toast).init();
    rafCallbacks.length = 0;

    root.querySelector<HTMLElement>('[data-action="add-lane"]')?.click();
    expect(rafCallbacks.length).toBe(1);

    rafCallbacks[0]?.(0);
    expect(root.querySelectorAll(".lane-row").length).toBe(9);
  });

  it("computes results through the bound calculate action", () => {
    const root = document.getElementById("app")!;
    const toast = document.getElementById("toast")!;
    createApp(root, toast).init();

    fillTimeInput(root, "#start-ts", "100503111");
    fillTimeInput(root, "#ref-elapsed", "0123450");

    const lane2 = root.querySelector<HTMLInputElement>('[data-gap-input="2"]');
    lane2!.focus();
    lane2!.value = "2.511";
    lane2!.dispatchEvent(new InputEvent("input", { bubbles: true }));
    lane2!.dispatchEvent(new Event("change", { bubbles: true }));

    root.querySelector<HTMLElement>('[data-action="calculate"]')?.click();

    expect(root.querySelector(".result-card")).not.toBeNull();
    expect(root.querySelector(".errors li")).toBeNull();
  });

  it("cancels a pending animation frame when rendering immediately", () => {
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });

    const root = document.getElementById("app")!;
    const toast = document.getElementById("toast")!;
    createApp(root, toast).init();

    fillTimeInput(root, "#start-ts", "100503111");
    fillTimeInput(root, "#ref-elapsed", "0123450");

    root.querySelector<HTMLElement>('[data-action="add-lane"]')?.click();
    expect(rafCallbacks.length).toBe(1);

    root.querySelector<HTMLElement>('[data-action="calculate"]')?.click();
    expect(cancelSpy).toHaveBeenCalled();
  });

  it("flushes debounced persistence on beforeunload", () => {
    vi.useFakeTimers();
    const root = document.getElementById("app")!;
    const toast = document.getElementById("toast")!;
    createApp(root, toast).init();

    const eventLabel = root.querySelector<HTMLInputElement>("#event-label");
    eventLabel!.value = "Flush on exit";
    eventLabel!.dispatchEvent(new InputEvent("input", { bubbles: true }));

    expect(loadPersistedRace()).toBeNull();
    window.dispatchEvent(new Event("beforeunload"));
    expect(loadPersistedRace()?.eventLabel).toBe("Flush on exit");
  });

  it("registers pagehide with the same flush handler", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const root = document.getElementById("app")!;
    const toast = document.getElementById("toast")!;

    createApp(root, toast);

    expect(addSpy).toHaveBeenCalledWith("beforeunload", flushPendingPersist);
    expect(addSpy).toHaveBeenCalledWith("pagehide", flushPendingPersist);
  });
});
