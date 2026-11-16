import type { MetadataRoute } from "next";
import { listProjectRows } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/env";
import { buildSitemap, type SitemapCategory, type SitemapProject, type SitemapStory } from "@/lib/sitemap";

/** Always reflect the live public catalogue so hidden or removed projects cannot linger as 404s. */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [projects, stories, categories] = await Promise.all([
    listProjectRows()
      .then((rows) =>
        rows.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt, lastUpdatedAt: p.lastUpdatedAt, pinned: p.pinned })),
      )
      .catch(() => [] as SitemapProject[]),
    prisma.thread
      .findMany({ where: { status: "archived" }, select: { slug: true, updatedAt: true } })
      .catch(() => [] as SitemapStory[]),
    prisma.category.findMany({ select: { slug: true } }).catch(() => [] as SitemapCategory[]),
  ]);
  return buildSitemap(base, projects, stories, categories);
}
