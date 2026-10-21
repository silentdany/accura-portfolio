import { prisma } from "@/lib/prisma";
import { listProjectRows, presentProject } from "@/lib/portfolio";
import { getWatchIndex } from "@/lib/watch";
import { ProjectBoard, type AdminProject } from "@/components/admin/project-board";

export default async function AdminProjects() {
  const [rows, categories, watch] = await Promise.all([
    listProjectRows({ includeHidden: true }),
    prisma.category.findMany({ orderBy: { position: "asc" } }),
    getWatchIndex(),
  ]);
  const projects: AdminProject[] = rows.map((r) => {
    const pub = presentProject(r, { unlocked: true, watch });
    return {
      id: r.id,
      slug: r.slug,
      name: pub.name,
      rawName: r.name,
      nameOverride: r.nameOverride,
      tagline: pub.tagline,
      taglineOverride: r.taglineOverride,
      description: r.description,
      descriptionOverride: r.descriptionOverride,
      aiTagline: r.aiTagline,
      aiDescription: r.aiDescription,
      url: r.url,
      urlOverride: r.urlOverride,
      imageOverride: r.imageOverride,
      image: pub.image,
      screenshots: pub.screenshots,
      capture: pub.capture,
      icon: pub.icon,
      size: r.size,
      pinned: r.pinned,
      hidden: r.hidden,
      manual: r.manual,
      nda: r.nda,
      ndaContext: r.ndaContext,
      hasPassword: Boolean(r.ndaPasswordHash),
      watchSlug: r.watchSlug,
      watchResolved: pub.stats?.slug ?? null,
      categoryIds: r.categories.map((c) => c.id),
      repoFullName: r.repoFullName,
      syncedAt: r.syncedAt?.toISOString() ?? null,
    };
  });
  return (
    <ProjectBoard
      initial={projects}
      categories={categories.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji }))}
      watchSites={watch.sites.map((s) => ({ slug: s.slug, domain: s.domain }))}
    />
  );
}
