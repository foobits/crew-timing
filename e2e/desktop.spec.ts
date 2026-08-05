import { test, expect } from "@playwright/test";
import {
  calculate,
  copyLaneTimestamp,
  expectGapSignNegative,
  expectLaneCopied,
  expectLaneNotCopied,
  expectNoReferenceElapsedError,
  expectResultsVisible,
  fillLaneGap,
  fillRaceContext,
  gotoApp,
  tapGapSign,
  unmarkLaneCopy,
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

  test("toggles gap sign on first tap while gap input is focused", async ({ page }) => {
    await gotoApp(page);
    await fillRaceContext(page);

    const lane2 = page.locator('[data-gap-input="2"]');
    await lane2.click();
    await lane2.pressSequentially("2.511");
    await page.locator('[data-gap-sign="2"]').click();

    await expectGapSignNegative(page, 2);
  });

  test("shows green copied styling after copy timestamp", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await gotoApp(page);
    await fillRaceContext(page);
    await fillLaneGap(page, 2, "2.511");
    await calculate(page);

    await copyLaneTimestamp(page, 2);
    await expectLaneCopied(page, 2);
  });
});

test.describe("copied lane checklist", () => {
  test("unmarks one lane while keeping others copied", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await gotoApp(page);
    await fillRaceContext(page);
    await fillLaneGap(page, 2, "2.511");
    await fillLaneGap(page, 3, "1:23.450");
    await calculate(page);

    await copyLaneTimestamp(page, 2);
    await copyLaneTimestamp(page, 3);
    await unmarkLaneCopy(page, 2);

    await expectLaneNotCopied(page, 2);
    await expectLaneCopied(page, 3);
  });

  test("clears copied styling after Calculate", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await gotoApp(page);
    await fillRaceContext(page);
    await fillLaneGap(page, 2, "2.511");
    await calculate(page);

    await copyLaneTimestamp(page, 2);
    await expectLaneCopied(page, 2);

    await calculate(page);
    await expectLaneNotCopied(page, 2);
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
