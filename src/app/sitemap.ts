import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [projects, stories, categories] = await Promise.all([
    prisma.project.findMany({ where: { hidden: false }, select: { slug: true, updatedAt: true, lastUpdatedAt: true, pinned: true } }),
    prisma.thread.findMany({ where: { status: "archived" }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true } }),
  ]).catch(() => [[], [], []] as const);
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
    ...stories.map((s) => ({ url: `${base}/stories/${s.slug}`, lastModified: s.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
