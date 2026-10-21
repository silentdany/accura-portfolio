/** Scrape a production homepage for og:image / description / visible text (best effort). */
export type HomepageMeta = { ogImage: string | null; description: string | null; text: string | null; title: string | null };

function meta(html: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`,
      "i",
    );
    const m = re.exec(html);
    if (m) return (m[1] ?? m[2]).trim();
  }
  return null;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function fetchHomepageMeta(url: string): Promise<HomepageMeta> {
  const empty = { ogImage: null, description: null, text: null, title: null };
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AccuraPortfolioBot/1.0; +https://accura.dev)" },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return empty;
    const html = (await res.text()).slice(0, 400_000);
    const og = meta(html, ["og:image", "og:image:url", "twitter:image"]);
    const description = meta(html, ["og:description", "description", "twitter:description"]);
    const title = /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1]?.trim() ?? null;
    const text = html
      .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2000);
    return {
      ogImage: og ? new URL(decode(og), res.url).toString() : null,
      description: description ? decode(description) : null,
      text: text || null,
      title: title ? decode(title) : null,
    };
  } catch {
    return empty;
  }
}
