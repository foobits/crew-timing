// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEmptyRace,
  loadPersistedRace,
  persistRace,
  touchRace,
} from "../lib/race-state";
import {
  clearUndoSnapshot,
  createInitialState,
  loadPersistedState,
  saveUndoSnapshot,
  syncRaceState,
} from "./state";

describe("createInitialState", () => {
  it("returns default app state", () => {
    const state = createInitialState();
    expect(state.showResults).toBe(false);
    expect(state.resultsSort).toBe("place");
    expect(state.race.eventLabel).toBe("");
    expect(state.copiedLanes.size).toBe(0);
    expect(state.confirmAction).toBeNull();
  });
});

describe("loadPersistedState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns unchanged state when nothing is persisted", () => {
    const initial = createInitialState();
    expect(loadPersistedState(initial)).toEqual(initial);
  });

  it("restores a persisted race and shows the restored banner", () => {
    const race = touchRace({
      ...createEmptyRace(),
      eventLabel: "Heat 1",
      startTimestampMs: 47_281_491,
      referenceElapsedMs: 143_450,
    });
    persistRace(race);

    const loaded = loadPersistedState(createInitialState());
    expect(loaded.race.eventLabel).toBe("Heat 1");
    expect(loaded.restoredBanner).toBe(true);
  });

  it("collapses context when start and reference elapsed are set", () => {
    const race = touchRace({
      ...createEmptyRace(),
      startTimestampMs: 47_281_491,
      referenceElapsedMs: 143_450,
    });
    persistRace(race);

    expect(loadPersistedState(createInitialState()).contextCollapsed).toBe(true);
  });

  it("requires start confirmation again for stale drafts", () => {
    const race = touchRace({
      ...createEmptyRace(),
      startTimestampMs: 47_281_491,
      referenceElapsedMs: 143_450,
      startDate: "2020-01-01",
      startConfirmed: true,
    });
    persistRace(race);

    expect(loadPersistedState(createInitialState()).race.startConfirmed).toBe(false);
  });
});

describe("syncRaceState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("updates race and persists when data exists", () => {
    const initial = createInitialState();
    const next = syncRaceState(initial, (race) =>
      touchRace({ ...race, eventLabel: "Updated" }),
    );

    expect(next.race.eventLabel).toBe("Updated");
    expect(loadPersistedRace()?.eventLabel).toBe("Updated");
  });
});

describe("undo snapshot helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores a cloned race and calls onExpire after 30 seconds", () => {
    const state = createInitialState();
    const onExpire = vi.fn();
    const snapshot = saveUndoSnapshot(state, onExpire);

    expect(snapshot.undoSnapshot?.eventLabel).toBe("");
    expect(snapshot.undoTimer).not.toBeNull();

    vi.advanceTimersByTime(30_000);
    expect(onExpire).toHaveBeenCalledOnce();
  });

  it("clears an existing timer when saving a new snapshot", () => {
    const clearSpy = vi.spyOn(window, "clearTimeout");
    const state = {
      ...createInitialState(),
      undoTimer: 42,
    };

    saveUndoSnapshot(state, vi.fn());
    expect(clearSpy).toHaveBeenCalledWith(42);
  });

  it("clears undo state and cancels the timer", () => {
    const clearSpy = vi.spyOn(window, "clearTimeout");
    const cleared = clearUndoSnapshot({
      ...createInitialState(),
      undoTimer: 99,
      undoSnapshot: touchRace(createEmptyRace()),
    });

    expect(clearSpy).toHaveBeenCalledWith(99);
    expect(cleared.undoSnapshot).toBeNull();
    expect(cleared.undoTimer).toBeNull();
  });
});
