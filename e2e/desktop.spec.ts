import { test, expect } from "@playwright/test";
import {
  calculate,
  expectNoReferenceElapsedError,
  expectResultsVisible,
  fillLaneGap,
  fillRaceContext,
  gotoApp,
} from "./helpers";

test.describe("desktop race flow", () => {
  test("calculates finish timestamps from reference and splits", async ({ page }) => {
    await gotoApp(page);
    await fillRaceContext(page);

    await fillLaneGap(page, 2, "2.511");
    await fillLaneGap(page, 3, "1:23.450");

    await calculate(page);
    await expectResultsVisible(page, 3);
    await expect(page.locator('[data-result-lane="2"] .timestamp-value')).toHaveText(
      "10:06:29.072",
    );
  });

  test("supports negative split via sign toggle", async ({ page }) => {
    await gotoApp(page);
    await fillRaceContext(page);

    await page.locator('[data-gap-sign="2"]').click();
    await fillLaneGap(page, 2, "2.511");
    await calculate(page);

    await expectResultsVisible(page, 2);
    await expect(page.locator('[data-result-lane="2"] .elapsed-check')).toContainText(
      "01:20.939",
    );
  });
});

test.describe("desktop form commit", () => {
  test("commits reference elapsed on blur via change handler", async ({ page }) => {
    await gotoApp(page);
    await fillRaceContext(page);
    await fillLaneGap(page, 2, "2.511");

    await calculate(page);
    await expectNoReferenceElapsedError(page);
    await expectResultsVisible(page, 2);
  });
});
