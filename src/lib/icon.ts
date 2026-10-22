import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * The site's own icon, fetched by the sync and stored next to the captures
 * (Capture kind "icon"), so cards never depend on a third-party favicon service.
 * Preference: apple-touch-icon, then the largest declared icon (SVG counts as large),
 * then the conventional /apple-touch-icon.png and /favicon.ico.
 * A raster smaller than 96px is a favicon: scaled up on the project page it just pixelates, so it is skipped.
 */

const MAX_BYTES = 300_000;
const MIN_EDGE = 96;

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
      found.push({ url: new URL(href.replace(/&/g, "&"), pageUrl).toString(), score: rank(rel, attr(tag, "sizes"), href, attr(tag, "type")) });
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

/** Longest side in pixels, or null when the format doesn't say (SVG, unknown). */
function longestEdge(buf: Buffer, mime: string): number | null {
  if (mime === "image/svg+xml") return null;
  if (mime === "image/png" && buf.length >= 24) return Math.max(buf.readUInt32BE(16), buf.readUInt32BE(20));
  if (mime === "image/gif" && buf.length >= 10) return Math.max(buf.readUInt16LE(6), buf.readUInt16LE(8));
  if (mime === "image/x-icon" && buf.length >= 6) {
    const count = buf.readUInt16LE(4);
    let max = 0;
    for (let n = 0; n < count && 6 + n * 16 < buf.length; n++) max = Math.max(max, buf[6 + n * 16] || 256);
    return max || null;
  }
  if (mime === "image/jpeg") {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) break;
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0xd9) {
        i += 2;
        continue;
      }
      const len = buf.readUInt16BE(i + 2);
      const sof = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
      if (sof) return Math.max(buf.readUInt16BE(i + 5), buf.readUInt16BE(i + 7));
      i += 2 + len;
    }
  }
  return null;
}

export type FetchedIcon = { url: string; data: Buffer; mime: string } | "small";

/** First candidate that is a real image large enough to sit next to a title. "small" when every hit was a favicon. */
export async function fetchIcon(candidates: string[]): Promise<FetchedIcon | null> {
  let small = false;
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
      if (!mime) continue;
      const edge = longestEdge(data, mime);
      if (edge !== null && edge < MIN_EDGE) {
        small = true;
        continue;
      }
      return { url, data, mime };
    } catch {
      /* try the next one */
    }
  }
  return small ? "small" : null;
}

/** Fetch and store (only when it changed). A too-small favicon replaces nothing and deletes the pixelated one. */
export async function refreshIcon(projectId: string, candidates: string[]): Promise<boolean> {
  const icon = await fetchIcon(candidates);
  if (icon === "small") {
    await prisma.capture.deleteMany({ where: { projectId, kind: "icon" } });
    return false;
  }
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
