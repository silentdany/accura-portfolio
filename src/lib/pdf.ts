import { chromium, type Browser } from "playwright-core";

/**
 * Headless PDF rendering of a print page.
 * - On Vercel: @sparticuz/chromium (serverless build of Chromium).
 * - Locally: CHROMIUM_PATH, or a Playwright-managed browser.
 */
async function launch(): Promise<Browser> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const serverless = (await import("@sparticuz/chromium")).default;
    return chromium.launch({ args: serverless.args, executablePath: await serverless.executablePath(), headless: true });
  }
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true });
}

export async function renderPdf(url: string): Promise<Buffer> {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 2 });
    await page.emulateMedia({ media: "print" });
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
