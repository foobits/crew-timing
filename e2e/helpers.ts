import { expect, type Page } from "@playwright/test";

export async function gotoApp(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("#start-ts").waitFor();
}

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

export async function tapGapSign(page: Page, lane: number): Promise<void> {
  await page.locator(`[data-gap-sign="${lane}"]`).tap();
}

export async function copyLaneTimestamp(page: Page, lane: number): Promise<void> {
  await page.locator(`[data-copy-lane="${lane}"]`).click();
}

export async function expectLaneCopied(page: Page, lane: number): Promise<void> {
  await expect(page.locator(`[data-result-lane="${lane}"]`)).toHaveClass(/copied/);
}

export async function expectLaneNotCopied(page: Page, lane: number): Promise<void> {
  await expect(page.locator(`[data-result-lane="${lane}"]`)).not.toHaveClass(/copied/);
}

export async function unmarkLaneCopy(page: Page, lane: number): Promise<void> {
  await page.locator(`[data-copy-lane="${lane}"]`).click();
}

export async function expectGapSignNegative(page: Page, lane: number): Promise<void> {
  await expect(page.locator(`[data-gap-sign="${lane}"]`)).toHaveClass(/gap-sign-btn--negative/);
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

export async function expectGapInputWrapUsesGrid(page: Page, lane: number): Promise<void> {
  const display = await page
    .locator(`.lane-row[data-lane="${lane}"] .gap-input-wrap`)
    .evaluate((el) => getComputedStyle(el).display);
  expect(display).toBe("grid");
}

export async function expectGapSignAndInputSameRow(
  page: Page,
  lane: number,
  maxTopDeltaPx = 4,
): Promise<void> {
  const sign = page.locator(`[data-gap-sign="${lane}"]`);
  const input = page.locator(`[data-gap-input="${lane}"]`);
  await expect(sign).toBeVisible();
  await expect(input).toBeVisible();

  const tops = await page.evaluate((laneNum) => {
    const signEl = document.querySelector(`[data-gap-sign="${laneNum}"]`);
    const inputEl = document.querySelector(`[data-gap-input="${laneNum}"]`);
    if (!signEl || !inputEl) return null;
    return {
      signTop: signEl.getBoundingClientRect().top,
      inputTop: inputEl.getBoundingClientRect().top,
    };
  }, lane);

  expect(tops).not.toBeNull();
  expect(Math.abs(tops!.signTop - tops!.inputTop)).toBeLessThanOrEqual(maxTopDeltaPx);
}

export async function expectLaneRowHeightsSimilar(
  page: Page,
  laneA: number,
  laneB: number,
  maxHeightDeltaPx = 8,
): Promise<void> {
  const heights = await page.evaluate(
    ({ a, b }) => {
      const rowA = document.querySelector(`.lane-row[data-lane="${a}"]`);
      const rowB = document.querySelector(`.lane-row[data-lane="${b}"]`);
      if (!rowA || !rowB) return null;
      return {
        a: rowA.getBoundingClientRect().height,
        b: rowB.getBoundingClientRect().height,
      };
    },
    { a: laneA, b: laneB },
  );

  expect(heights).not.toBeNull();
  expect(Math.abs(heights!.a - heights!.b)).toBeLessThanOrEqual(maxHeightDeltaPx);
}

export async function expectVisibleAboveFooter(page: Page, selector: string): Promise<void> {
  await page.locator(selector).scrollIntoViewIfNeeded();

  const result = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const footer = document.getElementById("footer-actions");
    if (!el || !footer) {
      return { ok: false, gap: Number.NaN };
    }

    const elementRect = el.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    const gap = footerRect.top - elementRect.bottom;
    return { ok: gap >= -2, gap };
  }, selector);

  expect(
    result.ok,
    `expected ${selector} above #footer-actions (gap=${result.gap}px)`,
  ).toBe(true);
}
