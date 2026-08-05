import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import {
  calculate,
  expectResultsVisible,
  fillLaneGap,
  fillTimeInput,
  gotoApp,
} from "./helpers";

interface WeekendRaceFixture {
  startTimestamp: string;
  referenceLane: number;
  referenceElapsed: string;
  lanes: Array<{ lane: number; status: string; gap: string | null }>;
  expectedResults: Array<{ lane: number; finish: string; elapsed: string }>;
}

const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/weekend-race.json", import.meta.url), "utf-8"),
) as WeekendRaceFixture;

test.describe("weekend race fixture", () => {
  test("matches expected CrewTimer timestamps from fixtures/weekend-race.json", async ({ page }) => {
    await gotoApp(page);

    await fillTimeInput(page, "#start-ts", fixture.startTimestamp.replace(/[:.]/g, ""));
    await fillTimeInput(page, "#ref-elapsed", fixture.referenceElapsed.replace(/[:.]/g, ""));

    await page.locator("#ref-lane").selectOption(String(fixture.referenceLane));

    for (const lane of fixture.lanes) {
      if (lane.lane === fixture.referenceLane) continue;

      if (lane.status === "empty") {
        await page.locator(`[data-status="${lane.lane}"][data-status-value="empty"]`).click();
        continue;
      }

      if (lane.gap && lane.lane !== fixture.referenceLane) {
        await fillLaneGap(page, lane.lane, lane.gap);
      }
    }

    await calculate(page);
    await expectResultsVisible(page, fixture.expectedResults.length);

    for (const expected of fixture.expectedResults) {
      const card = page.locator(`[data-result-lane="${expected.lane}"]`);
      await expect(card.locator(".timestamp-value")).toHaveText(expected.finish);
      await expect(card.locator(".elapsed-check")).toContainText(expected.elapsed);
    }
  });
});
