import type { MetadataRoute } from "next";

export type SitemapProject = {
  slug: string;
  updatedAt: Date;
  lastUpdatedAt: Date | null;
  pinned: boolean;
};

export type SitemapStory = { slug: string; updatedAt: Date };
export type SitemapCategory = { slug: string };

export function buildSitemap(
  base: string,
  projects: SitemapProject[],
  stories: SitemapStory[],
  categories: SitemapCategory[],
): MetadataRoute.Sitemap {
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/now`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/stories`, changeFrequency: "weekly", priority: 0.6 },
    ...categories.map((c) => ({ url: `${base}/?c=${c.slug}`, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...projects.map((p) => ({
      url: `${base}/projects/${p.slug}`,
      lastModified: p.lastUpdatedAt ?? p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: p.pinned ? 0.9 : 0.7,
    })),
    ...stories.map((s) => ({
      url: `${base}/stories/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
