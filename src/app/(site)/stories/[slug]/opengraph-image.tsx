import { ogCard, OG_SIZE } from "@/lib/og";
import { getStory } from "@/lib/portfolio";
import { siteUrl } from "@/lib/env";
import { formatDate } from "@/lib/format";

export const alt = "Story";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getStory(slug);
  return ogCard({
    eyebrow: s ? `story · ${formatDate(s.startedAt)} → ${formatDate(s.archivedAt)}` : "story",
    title: s?.title ?? "Story",
    subtitle: s?.summary ?? s?.brief ?? null,
    footer: `${siteUrl().replace(/^https?:\/\//, "")}/stories/${slug}`,
    image: s?.cover ?? s?.posts.find((p) => p.images.length)?.images[0] ?? null,
  });
}
