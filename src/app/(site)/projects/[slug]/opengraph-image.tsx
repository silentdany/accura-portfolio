import { captureDataUrl, ogCard, OG_SIZE } from "@/lib/og";
import { getPublicProjectRow, presentProject } from "@/lib/portfolio";
import { siteUrl } from "@/lib/env";

export const alt = "Projet";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await getPublicProjectRow(slug);
  const p = row ? presentProject(row) : null;
  return ogCard({
    eyebrow: p?.locked ? "projet · NDA" : (p?.categories[0]?.name ?? "projet"),
    title: p?.name ?? "Projet",
    subtitle: p ? (p.locked ? p.ndaContext : p.tagline) : null,
    footer: `${siteUrl().replace(/^https?:\/\//, "")}/projects/${slug}`,
    image: row && p && !p.locked ? await captureDataUrl(row.id) : null,
  });
}
