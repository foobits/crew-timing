import { test, expect } from "@playwright/test";
import {
  expectGapInputWrapUsesGrid,
  expectGapSignAndInputSameRow,
  expectLaneRowHeightsSimilar,
  expectVisibleAboveFooter,
  fillRaceContext,
  gotoApp,
} from "./helpers";
import { canWebKitNavigate } from "./webkit-probe";

test.describe("lane layout", () => {
  test.beforeAll(async ({ baseURL }, testInfo) => {
    if (testInfo.project.name !== "mobile-safari") return;
    if (!baseURL || !(await canWebKitNavigate(baseURL))) {
      test.skip(
        true,
        "Playwright WebKit cannot reach the preview server in this environment (known on macOS 26+ locally; CI on Ubuntu is the source of truth)",
      );
    }
  });

  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
  });

  test("uses grid layout for split-lane gap controls", async ({ page }) => {
    await expectGapInputWrapUsesGrid(page, 2);
  });

  test("keeps gap sign button and input on one row", async ({ page }) => {
    await expectGapSignAndInputSameRow(page, 2);
    await expectGapSignAndInputSameRow(page, 8);
  });

  test("keeps reference and split lane rows the same height", async ({ page }) => {
    await expectLaneRowHeightsSimilar(page, 1, 2);
    await expectLaneRowHeightsSimilar(page, 1, 8);
  });

  test("keeps last lane and calculate button above the fixed footer", async ({ page }) => {
    await fillRaceContext(page);
    await expect(page.locator("#footer-actions")).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expectVisibleAboveFooter(page, '[data-gap-input="8"]');
    await expectVisibleAboveFooter(page, '[data-action="calculate"]');
  });
});
