import { prisma } from "@/lib/prisma";
import { shortHash } from "@/lib/crypto";
import { errorMessage } from "@/lib/http";
import { getReadme } from "@/lib/github";
import { fetchHomepageMeta } from "@/lib/homepage";
import { aiEnabled, enrichProject } from "@/lib/ai";

/** Marker stored in aiInputHash while a project is waiting for a forced re-enrichment. */
export const ENRICH_QUEUED = "queued";
const ENRICH_WORKING = "working";

export type EnrichStep = {
  project: string | null;
  enriched: boolean;
  remaining: number;
  error?: string;
};

function remaining() {
  return prisma.project.count({ where: { manual: false, aiInputHash: ENRICH_QUEUED } });
}

/** Mark every synced project so the next steps regenerate its description. Returns how many. */
export async function queueForceEnrich(): Promise<number> {
  if (!aiEnabled()) throw new Error("IA non configurée (AI Gateway).");
  const res = await prisma.project.updateMany({
    where: { manual: false },
    data: { aiInputHash: ENRICH_QUEUED },
  });
  return res.count;
}

/**
 * Enrich exactly one queued project (readme + homepage included).
 * One call stays well under the function timeout. The admin loops, with a pause between calls.
 */
export async function enrichNextQueued(): Promise<EnrichStep> {
  if (!aiEnabled()) throw new Error("IA non configurée (AI Gateway).");

  // A previous invocation killed mid-call leaves the row on "working". Put it back.
  await prisma.project.updateMany({
    where: { manual: false, aiInputHash: ENRICH_WORKING },
    data: { aiInputHash: ENRICH_QUEUED },
  });

  const next = await prisma.project.findFirst({
    where: { manual: false, aiInputHash: ENRICH_QUEUED },
    orderBy: { position: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      topics: true,
      languages: true,
      url: true,
      repoFullName: true,
    },
  });
  if (!next) return { project: null, enriched: false, remaining: 0 };

  const claim = await prisma.project.updateMany({
    where: { id: next.id, aiInputHash: ENRICH_QUEUED },
    data: { aiInputHash: ENRICH_WORKING },
  });
  if (claim.count === 0) return { project: next.name, enriched: false, remaining: await remaining() };

  try {
    const [home, readme] = await Promise.all([
      next.url ? fetchHomepageMeta(next.url).catch(() => null) : Promise.resolve(null),
      next.repoFullName ? getReadme(next.repoFullName).catch(() => null) : Promise.resolve(null),
    ]);
    const res = await enrichProject({
      name: next.name,
      url: next.url,
      description: next.description,
      topics: next.topics,
      languages: next.languages,
      readme,
      homepageText: home?.text ?? null,
    });
    if (!res) {
      await prisma.project.update({ where: { id: next.id }, data: { aiInputHash: "empty" } });
      return { project: next.name, enriched: false, remaining: await remaining(), error: "Réponse IA vide" };
    }
    const hash = shortHash(
      JSON.stringify([
        next.name,
        next.description,
        next.topics,
        next.languages,
        readme?.slice(0, 4000) ?? null,
        home?.text?.slice(0, 1500) ?? null,
      ]),
    );
    await prisma.project.update({
      where: { id: next.id },
      data: { aiTagline: res.tagline, aiDescription: res.description, aiInputHash: hash },
    });
    return { project: next.name, enriched: true, remaining: await remaining() };
  } catch (err) {
    await prisma.project.update({ where: { id: next.id }, data: { aiInputHash: "error" } });
    return { project: next.name, enriched: false, remaining: await remaining(), error: errorMessage(err) };
  }
}
