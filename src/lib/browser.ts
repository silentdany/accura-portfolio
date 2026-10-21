import { chromium, type Browser } from "playwright-core";

/**
 * Headless Chromium for PDF export and live captures.
 * - On Vercel: @sparticuz/chromium (serverless build of Chromium).
 * - Locally: CHROMIUM_PATH, or a Playwright-managed browser.
 */
export async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const serverless = (await import("@sparticuz/chromium")).default;
    return chromium.launch({ args: serverless.args, executablePath: await serverless.executablePath(), headless: true });
  }
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true });
}
