import type { Browser } from "playwright-core";

/**
 * Headless Chromium for PDF export and live captures, loaded lazily so that routes
 * that never launch a browser don't pay for (or depend on) playwright at import time.
 * - On Vercel: @sparticuz/chromium (serverless build of Chromium).
 * - Locally: CHROMIUM_PATH, or a Playwright-managed browser.
 */
export async function launchBrowser(): Promise<Browser> {
  const { chromium } = await import("playwright-core");
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const serverless = (await import("@sparticuz/chromium")).default;
    return chromium.launch({ args: serverless.args, executablePath: await serverless.executablePath(), headless: true });
  }
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true });
}
