import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const OG_SIZE = { width: 1200, height: 630 };

/** Fetch a Google font subset (only the glyphs needed) for next/og. Null on failure → default font. */
async function googleFont(family: string, text: string, weight = 400, italic = false): Promise<ArrayBuffer | null> {
  try {
    const axis = italic ? `:ital,wght@1,${weight}` : `:wght@${weight}`;
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}${axis}&text=${encodeURIComponent(text)}`, {
        next: { revalidate: 86400 * 30 },
      })
    ).text();
    const url = /src: url\((.+?)\) format\('(opentype|truetype)'\)/.exec(css)?.[1];
    if (!url) return null;
    const res = await fetch(url, { next: { revalidate: 86400 * 30 } });
    return res.ok ? res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

async function logoDataUrl(): Promise<string | null> {
  try {
    return `data:image/png;base64,${(await readFile(join(process.cwd(), "public/Accura.png"))).toString("base64")}`;
  } catch {
    return null;
  }
}

/** Live desktop capture of a project as a data URL (read straight from the DB, no HTTP round trip). */
export async function captureDataUrl(projectId: string): Promise<string | null> {
  const c = await prisma.capture.findUnique({ where: { projectId_kind: { projectId, kind: "desktop" } } }).catch(() => null);
  return c ? `data:${c.mime};base64,${Buffer.from(c.data).toString("base64")}` : null;
}

const INK = "#1d2029";
const MUTED = "#5f6470";
const RED = "#c7362b";
const LINE = "#e6e7eb";

/** Accura OG card: white, hairline grid, red bloom, Geist semibold, optional browser-framed capture. */
export async function ogCard({
  eyebrow,
  title,
  subtitle,
  accent,
  footer,
  image,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  accent?: string | null;
  footer: string;
  image?: string | null;
}) {
  const text = `${eyebrow}${title}${subtitle ?? ""}${footer}Accura.dev/portfolio`;
  const [semibold, regular, mono, serif, logo] = await Promise.all([
    googleFont("Geist", text, 600),
    googleFont("Geist", text, 400),
    googleFont("Geist Mono", text.toUpperCase(), 400),
    accent ? googleFont("Instrument Serif", accent, 400, true) : Promise.resolve(null),
    logoDataUrl(),
  ]);
  const fonts = [
    ...(semibold ? [{ name: "Geist", data: semibold, weight: 600 as const, style: "normal" as const }] : []),
    ...(regular ? [{ name: "Geist", data: regular, weight: 400 as const, style: "normal" as const }] : []),
    ...(mono ? [{ name: "Mono", data: mono, weight: 400 as const, style: "normal" as const }] : []),
    ...(serif ? [{ name: "Serif", data: serif, weight: 400 as const, style: "italic" as const }] : []),
  ];
  const titleSize = image ? (title.length > 16 ? 64 : 80) : title.length > 22 ? 84 : 108;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#ffffff",
          color: INK,
          fontFamily: "Geist",
          backgroundImage: `linear-gradient(to right, rgba(29,32,41,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(29,32,41,0.05) 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
        }}
      >
        <div style={{ position: "absolute", top: -260, left: -200, width: 720, height: 720, borderRadius: 9999, background: "radial-gradient(circle, rgba(199,54,43,0.14) 0%, rgba(199,54,43,0) 68%)" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 64px", width: image ? 600 : "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, fontWeight: 600, letterSpacing: -0.5 }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" width={34} height={34} />
            ) : null}
            <span style={{ display: "flex" }}>
              Accura<span style={{ color: MUTED }}>.dev</span>
              <span style={{ color: "#9ca0aa", fontWeight: 400, marginLeft: 10 }}>/ portfolio</span>
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "Mono", fontSize: 18, letterSpacing: 3, color: MUTED, textTransform: "uppercase" }}>
              <div style={{ width: 32, height: 2, background: RED }} />
              {eyebrow}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", marginTop: 22, fontSize: titleSize, fontWeight: 600, lineHeight: 0.98, letterSpacing: -titleSize * 0.045 }}>
              {title}
              {accent ? <span style={{ fontFamily: "Serif", fontStyle: "italic", fontWeight: 400, color: RED, marginLeft: 18 }}>{accent}</span> : null}
            </div>
            {subtitle ? <div style={{ marginTop: 22, fontSize: 28, color: MUTED, lineHeight: 1.3, maxWidth: image ? 500 : 960 }}>{subtitle}</div> : null}
          </div>
          <div style={{ display: "flex", fontFamily: "Mono", fontSize: 18, color: "#9ca0aa" }}>{footer}</div>
        </div>
        {image ? (
          <div style={{ display: "flex", flexDirection: "column", position: "absolute", top: 110, left: 640, width: 720, borderRadius: 18, border: `1px solid ${LINE}`, background: "#fff", overflow: "hidden", boxShadow: "0 30px 60px -20px rgba(29,32,41,0.35)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", height: 34, padding: "0 14px", background: "#f5f6f8", borderBottom: `1px solid ${LINE}` }}>
              <div style={{ width: 10, height: 10, borderRadius: 9999, background: "#d3d5db" }} />
              <div style={{ width: 10, height: 10, borderRadius: 9999, background: "#d3d5db" }} />
              <div style={{ width: 10, height: 10, borderRadius: 9999, background: "#d3d5db" }} />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" width={720} height={450} style={{ objectFit: "cover", objectPosition: "top" }} />
          </div>
        ) : null}
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  );
}
