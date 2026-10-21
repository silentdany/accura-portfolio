import { createHash } from "node:crypto";
import type { Browser } from "playwright-core";
import { prisma } from "@/lib/prisma";
import { launchBrowser } from "@/lib/browser";
import { errorMessage } from "@/lib/http";

/**
 * Live screenshots of each production URL (desktop 1440×900 and mobile 390×844),
 * taken in headless Chromium and stored in the Capture table.
 * Cookie/consent banners are hidden before the shot.
 */

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, quality: 78 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, quality: 72 },
} as const;

type Kind = keyof typeof VIEWPORTS;

const HIDE_BANNERS = `
  [id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i],
  [id*="gdpr" i], [class*="gdpr" i], #onetrust-banner-sdk, .cc-window, #CybotCookiebotDialog,
  [aria-label*="cookie" i], [data-nextjs-toast], nextjs-portal { display: none !important; }
  *, *::before, *::after { animation-play-state: paused !important; caret-color: transparent !important; }
`;

async function shoot(browser: Browser, url: string, kind: Kind): Promise<Buffer> {
  const v = VIEWPORTS[kind];
  const ctx = await browser.newContext({
    viewport: v.viewport,
    deviceScaleFactor: v.deviceScaleFactor,
    isMobile: v.isMobile,
    hasTouch: v.hasTouch,
    colorScheme: "light",
    locale: "fr-FR",
    reducedMotion: "reduce",
    userAgent:
      kind === "mobile"
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1 AccuraPortfolio"
        : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 AccuraPortfolio",
  });
  try {
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "load", timeout: 25000 });
    await page.waitForLoadState("networkidle", { timeout: 7000 }).catch(() => {});
    await page.addStyleTag({ content: HIDE_BANNERS }).catch(() => {});
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    await page.waitForTimeout(1200);
    return await page.screenshot({ type: "jpeg", quality: v.quality, fullPage: false });
  } finally {
    await ctx.close();
  }
}

export type CaptureTarget = { id: string; slug: string; url: string };
export type CaptureResult = { captured: number; errors: { project: string; error: string }[] };

/** Captures every target (one browser, sequential), within a time budget. */
export async function captureProjects(targets: CaptureTarget[], budgetMs = 200_000): Promise<CaptureResult> {
  const out: CaptureResult = { captured: 0, errors: [] };
  if (!targets.length) return out;
  const started = Date.now();
  let browser: Browser;
  try {
    browser = await launchBrowser();
  } catch (err) {
    out.errors.push({ project: "chromium", error: errorMessage(err) });
    return out;
  }
  try {
    for (const t of targets) {
      if (Date.now() - started > budgetMs) {
        out.errors.push({ project: t.slug, error: "Captures : budget de temps dépassé, reprise à la prochaine sync." });
        continue;
      }
      for (const kind of Object.keys(VIEWPORTS) as Kind[]) {
        try {
          const data = await shoot(browser, t.url, kind);
          const hash = createHash("sha1").update(data).digest("hex").slice(0, 12);
          const { width, height } = VIEWPORTS[kind].viewport;
          const dims = { width: width * VIEWPORTS[kind].deviceScaleFactor, height: height * VIEWPORTS[kind].deviceScaleFactor };
          await prisma.capture.upsert({
            where: { projectId_kind: { projectId: t.id, kind } },
            create: { projectId: t.id, kind, url: t.url, hash, ...dims, data: new Uint8Array(data) },
            update: { url: t.url, hash, ...dims, data: new Uint8Array(data), takenAt: new Date() },
          });
          out.captured++;
        } catch (err) {
          out.errors.push({ project: t.slug, error: `Capture ${kind} : ${errorMessage(err).split("\n")[0]}` });
        }
      }
    }
  } finally {
    await browser.close();
  }
  return out;
}

/** Projects whose capture is missing, stale (> maxAgeDays) or taken on another URL. */
export async function captureTargets(opts: { force?: boolean; ids?: string[]; maxAgeDays?: number } = {}): Promise<CaptureTarget[]> {
  const maxAge = Date.now() - (opts.maxAgeDays ?? 6) * 86400_000;
  const rows = await prisma.project.findMany({
    where: { hidden: false, ...(opts.ids ? { id: { in: opts.ids } } : {}) },
    select: { id: true, slug: true, url: true, urlOverride: true, captures: { select: { kind: true, url: true, takenAt: true } } },
    orderBy: [{ pinned: "desc" }, { position: "asc" }],
  });
  return rows
    .map((r) => ({ ...r, target: r.urlOverride || r.url }))
    .filter((r): r is typeof r & { target: string } => Boolean(r.target && /^https?:\/\//.test(r.target)))
    .filter(
      (r) =>
        opts.force ||
        r.captures.length < 2 ||
        r.captures.some((c) => c.url !== r.target || c.takenAt.getTime() < maxAge),
    )
    .map((r) => ({ id: r.id, slug: r.slug, url: r.target }));
}

export function capturesEnabled(): boolean {
  return process.env.SYNC_CAPTURES !== "false";
}
