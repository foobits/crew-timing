import { webkit, type Browser } from "@playwright/test";

let webKitCanNavigate: boolean | undefined;

/** Probe whether Playwright WebKit can reach the preview server (fails on some local macOS versions). */
export async function canWebKitNavigate(baseURL: string): Promise<boolean> {
  if (webKitCanNavigate !== undefined) return webKitCanNavigate;

  let browser: Browser | undefined;
  try {
    browser = await webkit.launch();
    const page = await browser.newPage();
    await page.goto(baseURL, { waitUntil: "commit", timeout: 8_000 });
    webKitCanNavigate = true;
  } catch {
    webKitCanNavigate = false;
  } finally {
    await browser?.close();
  }

  return webKitCanNavigate;
}
