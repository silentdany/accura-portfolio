import type { Profile } from "@/lib/settings";

/** The headline as one plain sentence (meta tags, OG, API). */
export function headlineText(p: Profile): string {
  return [p.headline, p.headlineTail, p.headlineAccent].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
