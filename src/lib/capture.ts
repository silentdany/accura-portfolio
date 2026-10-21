import { createHash } from "node:crypto";
import type { Browser } from "playwright-core";
import { prisma } from "@/lib/prisma";
import { launchBrowser } from "@/lib/browser";
import { errorMessage } from "@/lib/http";

/**
 * Live screenshots of each production URL (desktop 1440×900 and mobile 390×844),
 * stored in the Capture table. Fully automatic: run by the weekly sync.
 * - First choice: headless Chromium (local, or @sparticuz/chromium on Vercel).
 * - Fallback: Microlink's screenshot API when Chromium can't start or a shot fails
 *   (free tier without key; MICROLINK_API_KEY for the pro endpoint; CAPTURE_FALLBACK=off to disable).
 * Cookie/consent banners are hidden. A page behind Vercel Authentication or an error page is rejected,
 * so a login wall never ends up on the portfolio.
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

export class CaptureRejected extends Error {}

/** Throws when the page is a login wall or an error page rather than the product. */
function assertRealPage(finalUrl: string, title: string, status: number | null) {
  const host = (() => {
    try {
      return new URL(finalUrl).hostname;
    } catch {
      return "";
    }
  })();
  if (host === "vercel.com" || host.endsWith(".vercel.com") || /vercel authentication|login – vercel|log in to vercel/i.test(title)) {
    throw new CaptureRejected("Protégé par Vercel Authentication : ajoute un domaine public ou une URL dans l'admin.");
  }
  if (status && status >= 400) throw new CaptureRejected(`La page répond ${status}.`);
  if (/^(404|500|502|503)\b|page not found|deployment not found|application error/i.test(title)) {
    throw new CaptureRejected(`Page d'erreur (« ${title} »).`);
  }
}

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
    const res = await page.goto(url, { waitUntil: "load", timeout: 25000 });
    assertRealPage(page.url(), await page.title().catch(() => ""), res?.status() ?? null);
    await page.waitForLoadState("networkidle", { timeout: 7000 }).catch(() => {});
    await page.addStyleTag({ content: HIDE_BANNERS }).catch(() => {});
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    await page.waitForTimeout(1200);
    return await page.screenshot({ type: "jpeg", quality: v.quality, fullPage: false });
  } finally {
    await ctx.close();
  }
}

/** Microlink screenshot API (https://microlink.io/docs/api/parameters/screenshot). */
async function shootMicrolink(url: string, kind: Kind): Promise<Buffer> {
  const v = VIEWPORTS[kind];
  const key = process.env.MICROLINK_API_KEY?.trim();
  const qs = new URLSearchParams({
    url,
    screenshot: "true",
    meta: "true",
    "screenshot.type": "jpeg",
    "viewport.width": String(v.viewport.width),
    "viewport.height": String(v.viewport.height),
    "viewport.deviceScaleFactor": String(v.deviceScaleFactor),
    "viewport.isMobile": String(v.isMobile),
    adblock: "true",
    waitForTimeout: "1500",
    styles: HIDE_BANNERS,
  });
  const res = await fetch(`https://${key ? "pro" : "api"}.microlink.io/?${qs}`, {
    headers: key ? { "x-api-key": key } : {},
    cache: "no-store",
    signal: AbortSignal.timeout(45000),
  });
  const body = (await res.json().catch(() => null)) as {
    status?: string;
    message?: string;
    data?: { url?: string; title?: string; statusCode?: number; screenshot?: { url?: string } };
  } | null;
  if (!res.ok || body?.status !== "success" || !body.data?.screenshot?.url) {
    throw new Error(`Microlink ${res.status}${body?.message ? ` : ${body.message}` : ""}`);
  }
  assertRealPage(body.data.url ?? url, body.data.title ?? "", body.data.statusCode ?? null);
  const img = await fetch(body.data.screenshot.url, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  if (!img.ok) throw new Error(`Microlink image ${img.status}`);
  return Buffer.from(await img.arrayBuffer());
}

const fallbackEnabled = () => process.env.CAPTURE_FALLBACK !== "off";

export type CaptureTarget = { id: string; slug: string; url: string };
export type CaptureResult = { captured: number; errors: { project: string; error: string }[] };

/** Captures every target (one browser, sequential), within a time budget. */
export async function captureProjects(targets: CaptureTarget[], budgetMs = 200_000): Promise<CaptureResult> {
  const out: CaptureResult = { captured: 0, errors: [] };
  if (!targets.length) return out;
  const started = Date.now();
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
  } catch (err) {
    if (!fallbackEnabled()) {
      out.errors.push({ project: "chromium", error: errorMessage(err) });
      return out;
    }
    out.errors.push({ project: "chromium", error: `Chromium indisponible, repli sur Microlink : ${errorMessage(err).split("\n")[0]}` });
  }
  try {
    for (const t of targets) {
      if (Date.now() - started > budgetMs) {
        out.errors.push({ project: t.slug, error: "Captures : budget de temps dépassé, reprise à la prochaine sync." });
        continue;
      }
      for (const kind of Object.keys(VIEWPORTS) as Kind[]) {
        try {
          let data: Buffer;
          try {
            if (!browser) throw new Error("no browser");
            data = await shoot(browser, t.url, kind);
          } catch (err) {
            // A rejected page (login wall, error page) is the site's state, not a tooling problem: no retry.
            if (err instanceof CaptureRejected || !fallbackEnabled()) throw err;
            data = await shootMicrolink(t.url, kind);
          }
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
    await browser?.close();
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
