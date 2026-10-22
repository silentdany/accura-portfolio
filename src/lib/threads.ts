import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { presentThread } from "@/lib/portfolio";
import { aiJson } from "@/lib/ai";
import { errorMessage } from "@/lib/http";
import { fetchXThread, xStatusId, type XThread } from "@/lib/x-thread";

/** Now/Stories mutations, shared by the admin, the REST API and the MCP tools. */

const include = { posts: { orderBy: { date: "asc" as const } }, project: true };

export const startThreadInput = z.object({
  title: z.string().min(1).max(120),
  slug: z.string().max(64).optional(),
  brief: z.string().max(400).optional(),
  threadUrl: z.string().url().optional(),
  repos: z.array(z.string().regex(/^[\w.-]+\/[\w.-]+$/)).max(12).optional(),
  project: z.string().optional().describe("Project slug this thread is about"),
});

export const briefInput = z.object({
  text: z.string().min(1).max(400).describe("Daily brief, ~2 lines"),
  thread: z.string().optional().describe("Thread slug (default: the active thread)"),
});

export const postInput = z.object({
  body: z.string().min(1).max(4000),
  title: z.string().max(140).optional(),
  url: z.string().url().optional(),
  images: z.array(z.string().url()).max(8).optional(),
  date: z.string().datetime({ offset: true }).optional(),
  milestone: z.boolean().optional(),
  thread: z.string().optional().describe("Thread slug (default: the active thread)"),
});

export const archiveInput = z.object({
  thread: z.string().optional().describe("Thread slug (default: the active thread)"),
  summary: z.string().max(1200).optional(),
});

async function resolveThread(slug?: string) {
  const t = slug
    ? await prisma.thread.findUnique({ where: { slug } })
    : await prisma.thread.findFirst({ where: { status: "active" }, orderBy: { startedAt: "desc" } });
  if (!t) throw new Error(slug ? `Thread introuvable : ${slug}` : "Aucun thread actif. Démarre-en un avec start_thread.");
  return t;
}

async function uniqueThreadSlug(base: string) {
  let slug = base;
  for (let i = 2; await prisma.thread.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${base}-${i}`;
  return slug;
}

/** Starts a thread; the previous active one is archived and becomes a story. */
export async function startThread(input: z.infer<typeof startThreadInput>) {
  const data = startThreadInput.parse(input);
  const project = data.project ? await prisma.project.findUnique({ where: { slug: data.project }, select: { id: true } }) : null;
  const slug = await uniqueThreadSlug(slugify(data.slug || data.title));
  const t = await prisma.$transaction(async (tx) => {
    await tx.thread.updateMany({ where: { status: "active" }, data: { status: "archived", archivedAt: new Date() } });
    return tx.thread.create({
      data: {
        slug,
        title: data.title,
        brief: data.brief ?? null,
        briefAt: data.brief ? new Date() : null,
        threadUrl: data.threadUrl ?? null,
        repos: data.repos ?? [],
        projectId: project?.id ?? null,
      },
      include,
    });
  });
  return presentThread(t);
}

export async function setBrief(input: z.infer<typeof briefInput>) {
  const data = briefInput.parse(input);
  const t = await resolveThread(data.thread);
  const updated = await prisma.thread.update({ where: { id: t.id }, data: { brief: data.text.trim(), briefAt: new Date() }, include });
  return presentThread(updated);
}

export async function addPost(input: z.infer<typeof postInput>) {
  const data = postInput.parse(input);
  const t = await resolveThread(data.thread);
  await prisma.threadPost.create({
    data: {
      threadId: t.id,
      body: data.body,
      title: data.title ?? null,
      url: data.url ?? null,
      images: data.images ?? [],
      date: data.date ? new Date(data.date) : new Date(),
      milestone: data.milestone ?? false,
    },
  });
  const updated = await prisma.thread.findUniqueOrThrow({ where: { id: t.id }, include });
  return presentThread(updated);
}

export async function archiveThread(input: z.infer<typeof archiveInput>) {
  const data = archiveInput.parse(input);
  const t = await resolveThread(data.thread);
  const updated = await prisma.thread.update({
    where: { id: t.id },
    data: { status: "archived", archivedAt: t.archivedAt ?? new Date(), ...(data.summary ? { summary: data.summary } : {}) },
    include,
  });
  return presentThread(updated);
}

// ─── X threads ──────────────────────────────────────────────────────────────

export const importXInput = z.object({
  url: z.string().url().describe("URL of any post of a public X thread (x.com/<user>/status/<id>)"),
});

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

/** The portfolio project the thread talks about: the longest project name or slug found in it, first post first. */
async function matchProject(x: XThread) {
  const projects = await prisma.project.findMany({
    where: { hidden: false },
    select: { id: true, slug: true, name: true, nameOverride: true, repoFullName: true },
  });
  const keyed = projects.flatMap((p) =>
    [p.slug, p.name, p.nameOverride ?? ""].map(norm).filter((k) => k.length >= 5).map((k) => ({ p, k })),
  );
  for (const text of [x.posts[0]?.body ?? "", x.posts.map((p) => `${p.title ?? ""} ${p.body}`).join(" ")]) {
    const hay = norm(text);
    const hit = keyed.filter(({ k }) => hay.includes(k)).sort((a, b) => b.k.length - a.k.length)[0];
    if (hit) return hit.p;
  }
  return null;
}

const META_SYSTEM = `Tu prépares l'entrée "En ce moment" d'un portfolio de développeur, à partir de son thread X "build in public".
Réponds en JSON strict {"title": string, "brief": string, "summary": string}, en français.
- title: le nom du projet ou du chantier, 1 à 4 mots, sans emoji.
- brief: 2 lignes max (240 caractères) : où en est le projet d'après les derniers posts.
- summary: 2 à 3 phrases (360 caractères) : de quoi parle ce thread, pour une future page d'archive.
Ton sobre, factuel. N'invente rien qui ne soit pas dans les posts.`;

async function describeThread(x: XThread, projectName: string | null) {
  const fallbackTitle = projectName ?? (x.posts[0]?.body.split("\n")[0] ?? "Thread X").slice(0, 60);
  try {
    const out = await aiJson(
      META_SYSTEM,
      JSON.stringify({ project: projectName, posts: x.posts.map((p) => ({ date: p.date.toISOString().slice(0, 10), title: p.title, text: p.body.slice(0, 500) })) }),
      500,
    );
    const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
    return { title: projectName ?? str(out?.title, 120) ?? fallbackTitle, brief: str(out?.brief, 400), summary: str(out?.summary, 1200) };
  } catch {
    return { title: fallbackTitle, brief: null, summary: null };
  }
}

/** Upserts the thread's posts by X status id. Manual posts (no externalId) are left alone. */
async function upsertXPosts(threadId: string, x: XThread) {
  // The opening post rarely quotes anything: date it with the first step so it stays on top of the timeline.
  const earliest = Math.min(...x.posts.map((p) => p.date.getTime()));
  const known = new Set(
    (await prisma.threadPost.findMany({ where: { threadId, externalId: { not: null } }, select: { externalId: true } })).map((p) => p.externalId),
  );
  for (const [i, p] of x.posts.entries()) {
    const data = { title: p.title, body: p.body.slice(0, 4000), url: p.url, images: p.images, date: i === 0 ? new Date(earliest) : p.date };
    await prisma.threadPost.upsert({
      where: { threadId_externalId: { threadId, externalId: p.id } },
      create: { threadId, externalId: p.id, milestone: i === 0, ...data },
      update: data,
    });
  }
  return x.posts.filter((p) => !known.has(p.id)).length;
}

/**
 * Imports a public X thread as the active /now thread: title, linked project, its repo, cover, brief,
 * summary and every post. Importing a thread that already exists refreshes it and makes it active again;
 * fields edited in the admin are kept.
 */
export async function importXThread(input: z.infer<typeof importXInput>, opts: { activate?: boolean } = { activate: true }) {
  const { url } = importXInput.parse(input);
  const x = await fetchXThread(url);
  const ids = [...new Set([x.rootId, xStatusId(url) ?? x.rootId])];
  const existing =
    (await prisma.thread.findFirst({ where: { OR: ids.map((id) => ({ threadUrl: { contains: `/status/${id}` } })) } })) ??
    (await prisma.thread.findFirst({ where: { posts: { some: { externalId: { in: ids } } } } }));
  const project = existing?.projectId
    ? await prisma.project.findUnique({ where: { id: existing.projectId }, select: { id: true, slug: true, name: true, nameOverride: true, repoFullName: true } })
    : await matchProject(x);
  const cover = x.posts.find((p) => p.images.length)?.images[0] ?? null;

  let threadId: string;
  if (existing) {
    const meta = !existing.brief || !existing.summary ? await describeThread(x, project?.nameOverride || project?.name || null) : null;
    await prisma.$transaction(async (tx) => {
      if (opts.activate && existing.status !== "active") {
        await tx.thread.updateMany({ where: { status: "active" }, data: { status: "archived", archivedAt: new Date() } });
      }
      await tx.thread.update({
        where: { id: existing.id },
        data: {
          threadUrl: x.url,
          xSyncedAt: new Date(),
          cover: existing.cover ?? cover,
          ...(project && !existing.projectId ? { projectId: project.id } : {}),
          ...(!existing.repos.length && project?.repoFullName ? { repos: [project.repoFullName] } : {}),
          ...(meta?.brief && !existing.brief ? { brief: meta.brief, briefAt: new Date() } : {}),
          ...(meta?.summary && !existing.summary ? { summary: meta.summary } : {}),
          ...(opts.activate ? { status: "active" as const, archivedAt: null } : {}),
        },
      });
    });
    threadId = existing.id;
  } else {
    const meta = await describeThread(x, project?.nameOverride || project?.name || null);
    const slug = await uniqueThreadSlug(slugify(meta.title));
    const created = await prisma.$transaction(async (tx) => {
      await tx.thread.updateMany({ where: { status: "active" }, data: { status: "archived", archivedAt: new Date() } });
      return tx.thread.create({
        data: {
          slug,
          title: meta.title,
          brief: meta.brief,
          briefAt: meta.brief ? new Date() : null,
          summary: meta.summary,
          cover,
          threadUrl: x.url,
          xSyncedAt: new Date(),
          repos: project?.repoFullName ? [project.repoFullName] : [],
          projectId: project?.id ?? null,
          startedAt: new Date(Math.min(...x.posts.map((p) => p.date.getTime()))),
        },
      });
    });
    threadId = created.id;
  }
  const added = await upsertXPosts(threadId, x);
  const t = await prisma.thread.findUniqueOrThrow({ where: { id: threadId }, include });
  return { ...presentThread(t), imported: { posts: x.posts.length, added, author: x.author.handle } };
}

/** How often the active thread re-reads X. Called on /now and home renders, after the response. */
const X_REFRESH_MS = 30 * 60_000;

export async function refreshActiveXThread() {
  const t = await prisma.thread.findFirst({
    where: { status: "active", threadUrl: { not: null } },
    select: { id: true, threadUrl: true, xSyncedAt: true },
  });
  if (!t?.threadUrl || !xStatusId(t.threadUrl)) return;
  if (t.xSyncedAt && Date.now() - t.xSyncedAt.getTime() < X_REFRESH_MS) return;
  // Claim the refresh so concurrent renders don't all hit FxTwitter.
  const claimed = await prisma.thread.updateMany({ where: { id: t.id, xSyncedAt: t.xSyncedAt }, data: { xSyncedAt: new Date() } });
  if (!claimed.count) return;
  try {
    await importXThread({ url: t.threadUrl }, { activate: false });
  } catch (err) {
    console.error(`[x-thread] refresh failed: ${errorMessage(err)}`);
  }
}
