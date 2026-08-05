// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyRace, loadPersistedRace, touchRace } from "../lib/race-state";

describe("schedulePersistRace", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces localStorage writes until the delay elapses", async () => {
    const { schedulePersistRace } = await import("./persist-scheduler");
    const race = touchRace(createEmptyRace());

    schedulePersistRace(race);
    expect(loadPersistedRace()).toBeNull();

    await vi.advanceTimersByTimeAsync(399);
    expect(loadPersistedRace()).toBeNull();

    await vi.advanceTimersByTimeAsync(1);
    expect(loadPersistedRace()?.updatedAt).toBe(race.updatedAt);
  });

  it("resets the timer when called repeatedly and persists the latest race", async () => {
    const { schedulePersistRace } = await import("./persist-scheduler");
    const first = touchRace(createEmptyRace());
    const second = touchRace({ ...first, eventLabel: "Updated heat" });

    schedulePersistRace(first);
    await vi.advanceTimersByTimeAsync(200);
    schedulePersistRace(second);
    await vi.advanceTimersByTimeAsync(399);
    expect(loadPersistedRace()).toBeNull();

    await vi.advanceTimersByTimeAsync(1);
    const persisted = loadPersistedRace();
    expect(persisted?.eventLabel).toBe("Updated heat");
    expect(persisted?.updatedAt).toBe(second.updatedAt);
  });
});

describe("flushPersistRace", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes immediately and cancels a pending debounced persist", async () => {
    const { schedulePersistRace, flushPersistRace } = await import("./persist-scheduler");
    const debounced = touchRace(createEmptyRace());
    const immediate = touchRace({ ...debounced, eventLabel: "Flush now" });

    schedulePersistRace(debounced);
    flushPersistRace(immediate);

    expect(loadPersistedRace()?.eventLabel).toBe("Flush now");

    await vi.advanceTimersByTimeAsync(500);
    expect(loadPersistedRace()?.eventLabel).toBe("Flush now");
  });
});
