import type { Category, CardSize, Prisma, Project, Thread, ThreadPost } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/env";
import { hostname } from "@/lib/slug";
import type { WatchIndex, WatchStats } from "@/lib/watch";

/**
 * Single service layer behind the pages, the REST API (/api/v1) and the MCP server (/api/mcp).
 * Everything public goes through `presentProject`, which applies overrides and NDA redaction.
 */

type ProjectRow = Project & { categories: Category[] };

export type PublicCategory = { slug: string; name: string; emoji: string | null };

export type PublicProject = {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  url: string | null;
  domain: string | null;
  repoUrl: string | null;
  language: string | null;
  languages: string[];
  topics: string[];
  stars: number;
  image: string | null;
  screenshots: string[];
  lastUpdatedAt: string | null;
  size: CardSize;
  pinned: boolean;
  categories: PublicCategory[];
  nda: boolean;
  /** true when the project is NDA and the viewer has not unlocked it: only name + context are public. */
  locked: boolean;
  ndaContext: string | null;
  link: string;
  stats: WatchStats | null;
};

const withCategories = { categories: { orderBy: { position: "asc" } } } satisfies Prisma.ProjectInclude;

function firstSentence(text: string | null): string | null {
  if (!text) return null;
  const s = text.split(/(?<=[.!?])\s/)[0]?.trim() ?? text;
  return s.length > 120 ? `${s.slice(0, 117).trimEnd()}…` : s.replace(/\.$/, "");
}

export function projectUrl(p: Pick<Project, "url" | "urlOverride">): string | null {
  return p.urlOverride || p.url || null;
}

export function presentProject(p: ProjectRow, opts: { unlocked?: boolean; watch?: WatchIndex | null } = {}): PublicProject {
  const locked = p.nda && !opts.unlocked;
  const url = projectUrl(p);
  const description = p.descriptionOverride || p.aiDescription || p.description || null;
  const tagline = p.taglineOverride || p.aiTagline || firstSentence(p.description);
  const image = p.imageOverride || p.screenshots[0] || p.ogImage || null;
  const screenshots = [...new Set([p.imageOverride, ...p.screenshots, p.ogImage].filter((x): x is string => Boolean(x)))];
  const base = {
    slug: p.slug,
    name: p.nameOverride || p.name,
    size: p.size,
    pinned: p.pinned,
    categories: p.categories.map((c) => ({ slug: c.slug, name: c.name, emoji: c.emoji })),
    nda: p.nda,
    locked,
    ndaContext: p.nda ? p.ndaContext || "Projet sous NDA." : null,
    link: `${siteUrl()}/projects/${p.slug}`,
  };
  if (locked) {
    return {
      ...base,
      tagline: p.ndaContext || "Projet confidentiel",
      description: null,
      url: null,
      domain: null,
      repoUrl: null,
      language: null,
      languages: [],
      topics: [],
      stars: 0,
      image: null,
      screenshots: [],
      lastUpdatedAt: p.lastUpdatedAt?.toISOString() ?? null,
      stats: null,
    };
  }
  return {
    ...base,
    tagline,
    description,
    url,
    domain: hostname(url),
    repoUrl: p.repoPrivate ? null : p.repoUrl,
    language: p.language,
    languages: p.languages,
    topics: p.topics,
    stars: p.stars,
    image,
    screenshots,
    lastUpdatedAt: p.lastUpdatedAt?.toISOString() ?? null,
    stats: opts.watch?.resolve({ watchSlug: p.watchSlug, url }) ?? null,
  };
}

const ORDER: Prisma.ProjectOrderByWithRelationInput[] = [{ pinned: "desc" }, { position: "asc" }, { createdAt: "asc" }];

export async function listProjectRows(opts: { includeHidden?: boolean; category?: string | null; query?: string | null } = {}) {
  const where: Prisma.ProjectWhereInput = {
    ...(opts.includeHidden ? {} : { hidden: false }),
    ...(opts.category ? { categories: { some: { slug: opts.category } } } : {}),
    ...(opts.query
      ? {
          OR: [
            { name: { contains: opts.query, mode: "insensitive" } },
            { nameOverride: { contains: opts.query, mode: "insensitive" } },
            { description: { contains: opts.query, mode: "insensitive" } },
            { aiDescription: { contains: opts.query, mode: "insensitive" } },
            { topics: { has: opts.query.toLowerCase() } },
          ],
        }
      : {}),
  };
  return prisma.project.findMany({ where, include: withCategories, orderBy: ORDER });
}

export async function listProjects(opts: { category?: string | null; query?: string | null; watch?: WatchIndex | null } = {}) {
  const rows = await listProjectRows(opts);
  return rows.map((p) => presentProject(p, { watch: opts.watch }));
}

export async function getProjectRow(slug: string) {
  return prisma.project.findUnique({ where: { slug }, include: withCategories });
}

export async function getPublicProjectRow(slug: string) {
  const p = await getProjectRow(slug);
  return p && !p.hidden ? p : null;
}

export async function listCategories(): Promise<(PublicCategory & { count: number })[]> {
  const cats = await prisma.category.findMany({
    orderBy: { position: "asc" },
    include: { _count: { select: { projects: { where: { hidden: false } } } } },
  });
  return cats.map((c) => ({ slug: c.slug, name: c.name, emoji: c.emoji, count: c._count.projects }));
}

// ─── Now / Stories ──────────────────────────────────────────────────────────

type ThreadRow = Thread & { posts: ThreadPost[]; project: Project | null };

export type PublicThread = {
  slug: string;
  title: string;
  status: "active" | "archived";
  brief: string | null;
  briefAt: string | null;
  summary: string | null;
  cover: string | null;
  threadUrl: string | null;
  repos: string[];
  project: { slug: string; name: string } | null;
  startedAt: string;
  archivedAt: string | null;
  posts: { id: string; date: string; title: string | null; body: string; url: string | null; images: string[]; milestone: boolean }[];
  link: string;
};

const threadInclude = { posts: { orderBy: { date: "asc" } }, project: true } satisfies Prisma.ThreadInclude;

export function presentThread(t: ThreadRow): PublicThread {
  return {
    slug: t.slug,
    title: t.title,
    status: t.status,
    brief: t.brief,
    briefAt: t.briefAt?.toISOString() ?? null,
    summary: t.summary,
    cover: t.cover,
    threadUrl: t.threadUrl,
    repos: t.repos,
    project: t.project && !t.project.hidden ? { slug: t.project.slug, name: t.project.nameOverride || t.project.name } : null,
    startedAt: t.startedAt.toISOString(),
    archivedAt: t.archivedAt?.toISOString() ?? null,
    posts: t.posts.map((p) => ({
      id: p.id,
      date: p.date.toISOString(),
      title: p.title,
      body: p.body,
      url: p.url,
      images: p.images,
      milestone: p.milestone,
    })),
    link: t.status === "active" ? `${siteUrl()}/now` : `${siteUrl()}/stories/${t.slug}`,
  };
}

export async function getActiveThread() {
  const t = await prisma.thread.findFirst({ where: { status: "active" }, include: threadInclude, orderBy: { startedAt: "desc" } });
  return t ? presentThread(t) : null;
}

export async function listStories() {
  const rows = await prisma.thread.findMany({ where: { status: "archived" }, include: threadInclude, orderBy: { archivedAt: "desc" } });
  return rows.map(presentThread);
}

export async function getStory(slug: string) {
  const t = await prisma.thread.findUnique({ where: { slug }, include: threadInclude });
  return t && t.status === "archived" ? presentThread(t) : null;
}

export async function getThreadBySlug(slug: string) {
  const t = await prisma.thread.findUnique({ where: { slug }, include: threadInclude });
  return t ? presentThread(t) : null;
}
