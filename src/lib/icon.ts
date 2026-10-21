import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * The site's own icon, fetched by the sync and stored next to the captures
 * (Capture kind "icon"), so cards never depend on a third-party favicon service.
 * Preference: apple-touch-icon, then the largest declared icon (SVG counts as large),
 * then the conventional /apple-touch-icon.png and /favicon.ico.
 */

const MAX_BYTES = 300_000;

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i").exec(tag);
  return m ? m[1] : null;
}

function rank(rel: string, sizes: string | null, href: string, type: string | null): number {
  const isSvg = type === "image/svg+xml" || /\.svg(\?|$)/i.test(href);
  const size = Math.max(0, ...(sizes ?? "").split(/\s+/).map((s) => Number(s.split("x")[0]) || 0));
  if (/apple-touch-icon/i.test(rel)) return 1000 + (size || 180);
  if (isSvg) return 900;
  return size || 16;
}

/** Icon URLs declared in a page, best first, plus the conventional fallbacks. */
export function iconCandidates(html: string, pageUrl: string): string[] {
  const found: { url: string; score: number }[] = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    const rel = attr(tag, "rel") ?? "";
    const href = attr(tag, "href");
    if (!href || !/(^|\s)(icon|shortcut icon|apple-touch-icon(-precomposed)?)(\s|$)/i.test(rel) || /mask-icon/i.test(rel)) continue;
    try {
      found.push({ url: new URL(href.replace(/&amp;/g, "&"), pageUrl).toString(), score: rank(rel, attr(tag, "sizes"), href, attr(tag, "type")) });
    } catch {
      /* invalid href */
    }
  }
  const origin = new URL(pageUrl).origin;
  const urls = [...found.sort((a, b) => b.score - a.score).map((f) => f.url), `${origin}/apple-touch-icon.png`, `${origin}/favicon.ico`];
  return [...new Set(urls)];
}

function sniff(buf: Buffer, header: string | null): string | null {
  const ct = (header ?? "").split(";")[0].trim().toLowerCase();
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0) return "image/x-icon";
  if (buf.subarray(0, 3).toString() === "GIF") return "image/gif";
  const head = buf.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return "image/svg+xml";
  return ct.startsWith("image/") && ct !== "image/svg+xml" ? ct : null;
}

/** First candidate that answers with a real image. */
export async function fetchIcon(candidates: string[]): Promise<{ url: string; data: Buffer; mime: string } | null> {
  for (const url of candidates.slice(0, 6)) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AccuraPortfolioBot/1.0; +https://accura.dev)" },
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const data = Buffer.from(await res.arrayBuffer());
      if (data.length < 64 || data.length > MAX_BYTES) continue;
      const mime = sniff(data, res.headers.get("content-type"));
      if (mime) return { url, data, mime };
    } catch {
      /* try the next one */
    }
  }
  return null;
}

/** Fetch and store (only when it changed). Returns true when an icon is stored. */
export async function refreshIcon(projectId: string, candidates: string[]): Promise<boolean> {
  const icon = await fetchIcon(candidates);
  if (!icon) return false;
  const hash = createHash("sha1").update(icon.data).digest("hex").slice(0, 12);
  const cur = await prisma.capture.findUnique({ where: { projectId_kind: { projectId, kind: "icon" } }, select: { hash: true } });
  if (cur?.hash === hash) return true;
  const row = { url: icon.url, hash, width: 0, height: 0, mime: icon.mime, data: new Uint8Array(icon.data), takenAt: new Date() };
  await prisma.capture.upsert({
    where: { projectId_kind: { projectId, kind: "icon" } },
    create: { projectId, kind: "icon", ...row },
    update: row,
  });
  return true;
}
