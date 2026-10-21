import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { presentThread } from "@/lib/portfolio";

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
