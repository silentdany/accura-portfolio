import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** Fetch a Google font subset (only the glyphs needed) for next/og. Null on failure → default font. */
async function googleFont(family: string, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}&text=${encodeURIComponent(text)}`, {
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

/** Shared OG card: cream paper, big serif title, small mono footer. */
export async function ogCard({ eyebrow, title, subtitle, footer, image }: { eyebrow: string; title: string; subtitle?: string | null; footer: string; image?: string | null }) {
  const text = `${eyebrow}${title}${subtitle ?? ""}${footer}.→·`;
  const [serif, sans] = await Promise.all([googleFont("Instrument Serif", text), googleFont("Geist", text)]);
  const fonts = [
    ...(serif ? [{ name: "Serif", data: serif, weight: 400 as const, style: "normal" as const }] : []),
    ...(sans ? [{ name: "Sans", data: sans, weight: 400 as const, style: "normal" as const }] : []),
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f3efe6", color: "#17140f", fontFamily: "Sans" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, color: "#6f685c" }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "#17140f", color: "#f3efe6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>A</div>
            <span>{eyebrow}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", flexWrap: "wrap", fontFamily: "Serif", fontSize: title.length > 22 ? 96 : 128, lineHeight: 0.95, letterSpacing: -2 }}>
              {title}
              <span style={{ color: "#b8865b" }}>.</span>
            </div>
            {subtitle ? <div style={{ marginTop: 24, fontSize: 32, color: "#3b362e", maxWidth: image ? 560 : 900, lineHeight: 1.25 }}>{subtitle}</div> : null}
          </div>
          <div style={{ display: "flex", fontSize: 20, color: "#9a9284" }}>{footer}</div>
        </div>
        {image ? (
          <div style={{ display: "flex", width: 470, padding: "48px 48px 48px 0" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" width={422} height={534} style={{ objectFit: "cover", objectPosition: "top", borderRadius: 28, border: "1px solid #e2dacb" }} />
          </div>
        ) : null}
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  );
}
