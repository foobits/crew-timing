import { expect, type Page } from "@playwright/test";

export async function fillRaceContext(page: Page): Promise<void> {
  await fillTimeInput(page, "#start-ts", "100503111");
  await fillTimeInput(page, "#ref-elapsed", "0123450");
}

export async function fillTimeInput(
  page: Page,
  selector: string,
  digits: string,
): Promise<void> {
  const input = page.locator(selector);
  await input.click();
  await input.fill("");
  await input.pressSequentially(digits);
  await input.blur();
}

/** Simulate mobile typing where change/blur may not fire before Calculate. */
export async function setInputWithoutCommit(
  page: Page,
  selector: string,
  value: string,
): Promise<void> {
  await page.evaluate(
    ({ sel, val }) => {
      const input = document.querySelector(sel) as HTMLInputElement | null;
      if (!input) throw new Error(`Missing input: ${sel}`);
      input.value = val;
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    },
    { sel: selector, val: value },
  );
}

export async function fillLaneGap(page: Page, lane: number, value: string): Promise<void> {
  const input = page.locator(`[data-gap-input="${lane}"]`);
  await input.click();
  await input.fill(value);
  await input.blur();
}

export async function calculate(page: Page): Promise<void> {
  await page.locator('[data-action="calculate"]').click();
  await page.locator("#results-card").scrollIntoViewIfNeeded();
}

export async function expectResultsVisible(page: Page, count?: number): Promise<void> {
  const errors = page.locator(".errors li");
  if (await errors.count()) {
    const messages = await errors.allTextContents();
    expect(messages, `unexpected errors: ${messages.join(", ")}`).toEqual([]);
  }

  const cards = page.locator(".result-card");
  await expect(cards.first()).toBeVisible();
  if (count !== undefined) {
    await expect(cards).toHaveCount(count);
  }
}

export async function expectNoReferenceElapsedError(page: Page): Promise<void> {
  const errors = page.locator(".errors li");
  if (await errors.count()) {
    const messages = await errors.allTextContents();
    expect(messages.join(" ")).not.toMatch(/Enter reference elapsed time/i);
  }
}
