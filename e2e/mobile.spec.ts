import { test, expect } from "@playwright/test";
import {
  calculate,
  expectNoReferenceElapsedError,
  expectResultsVisible,
  fillTimeInput,
  gotoApp,
  setInputWithoutCommit,
} from "./helpers";
import { canWebKitNavigate } from "./webkit-probe";

test.describe("mobile race flow", () => {
  test.beforeAll(async ({ baseURL }) => {
    if (!baseURL || !(await canWebKitNavigate(baseURL))) {
      test.skip(
        true,
        "Playwright WebKit cannot reach the preview server in this environment (known on macOS 26+ locally; CI on Ubuntu is the source of truth)",
      );
    }
  });

  test("calculates without blurring reference elapsed or splits", async ({ page }) => {
    await gotoApp(page);

    await setInputWithoutCommit(page, "#start-ts", "10:05:03.111");
    await setInputWithoutCommit(page, "#ref-elapsed", "01:23.450");
    await setInputWithoutCommit(page, '[data-gap-input="2"]', "2.511");
    await setInputWithoutCommit(page, '[data-gap-input="3"]', "123450");

    await calculate(page);

    await expectNoReferenceElapsedError(page);
    await expectResultsVisible(page, 3);
  });

  test("supports sign toggle and decimal entry on narrow viewport", async ({ page }) => {
    await gotoApp(page);

    await setInputWithoutCommit(page, "#start-ts", "10:05:03.111");
    await setInputWithoutCommit(page, "#ref-elapsed", "01:23.450");

    await page.locator('[data-gap-sign="2"]').click();
    await setInputWithoutCommit(page, '[data-gap-input="2"]', "2.511");

    await calculate(page);

    await expectResultsVisible(page, 2);
    await expect(page.locator('[data-result-lane="2"] .elapsed-check')).toContainText(
      "01:20.939",
    );
  });

  test("auto-formats sheet-style MM:SS digits in split fields", async ({ page }) => {
    await gotoApp(page);

    await fillTimeInput(page, "#start-ts", "100503111");
    await fillTimeInput(page, "#ref-elapsed", "0123450");

    const lane3 = page.locator('[data-gap-input="3"]');
    await lane3.click();
    await lane3.pressSequentially("123450");
    await lane3.blur();

    await calculate(page);
    await expectResultsVisible(page, 2);
    await expect(lane3).toHaveValue("1:23.450");
  });
});
