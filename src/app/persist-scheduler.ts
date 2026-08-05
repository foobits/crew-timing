import { persistRace, type RaceDraft } from "../lib/race-state";

const PERSIST_DELAY_MS = 400;

let timer: ReturnType<typeof window.setTimeout> | null = null;
let pendingRace: RaceDraft | null = null;

export function schedulePersistRace(race: RaceDraft): void {
  pendingRace = race;
  if (timer !== null) {
    window.clearTimeout(timer);
  }
  timer = window.setTimeout(() => {
    timer = null;
    if (pendingRace) {
      persistRace(pendingRace);
      pendingRace = null;
    }
  }, PERSIST_DELAY_MS);
}

export function flushPersistRace(race: RaceDraft): void {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
  pendingRace = null;
  persistRace(race);
}
