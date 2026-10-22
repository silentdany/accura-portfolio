"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";
import { hashPassword } from "@/lib/crypto";
import { slugify } from "@/lib/slug";
import { errorMessage } from "@/lib/http";
import { runSync } from "@/lib/sync";
import { captureProjects, captureTargets } from "@/lib/capture";
import { profileSchema, saveDefaultView, saveProfile } from "@/lib/settings";
import { isView } from "@/lib/views";
import { addPost, archiveThread, importXThread, setBrief, startThread } from "@/lib/threads";

export type ActionState = { ok?: boolean; error?: string; message?: string };

async function guard<T>(fn: () => Promise<T>, message?: string): Promise<ActionState> {
  await requireSession();
  try {
    await fn();
    revalidatePath("/", "layout");
    return { ok: true, message };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

const empty = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

// ─── Projects ──────────────────────────────────────────────────────────────

export async function reorderProjects(ids: string[]): Promise<ActionState> {
  return guard(() => prisma.$transaction(ids.map((id, position) => prisma.project.update({ where: { id }, data: { position } }))));
}

const quickPatch = z.object({
  pinned: z.boolean().optional(),
  hidden: z.boolean().optional(),
  size: z.enum(["sm", "wide", "tall", "lg"]).optional(),
});

export async function patchProject(id: string, patch: z.infer<typeof quickPatch>): Promise<ActionState> {
  return guard(() => prisma.project.update({ where: { id }, data: quickPatch.parse(patch) }));
}

export async function saveProject(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get("id"));
  return guard(async () => {
    const nda = form.get("nda") === "on";
    const password = empty(form.get("ndaPassword"));
    const clearPassword = form.get("ndaClear") === "on";
    const slug = empty(form.get("slug"));
    if (slug && slug !== slugify(slug)) throw new Error("Slug invalide : lettres minuscules, chiffres et tirets.");
    if (nda && !password && !clearPassword) {
      const cur = await prisma.project.findUnique({ where: { id }, select: { ndaPasswordHash: true } });
      if (!cur?.ndaPasswordHash) throw new Error("Mode NDA : définis un mot de passe.");
    }
    await prisma.project.update({
      where: { id },
      data: {
        ...(slug ? { slug } : {}),
        nameOverride: empty(form.get("nameOverride")),
        taglineOverride: empty(form.get("taglineOverride")),
        descriptionOverride: empty(form.get("descriptionOverride")),
        urlOverride: empty(form.get("urlOverride")),
        imageOverride: empty(form.get("imageOverride")),
        watchSlug: empty(form.get("watchSlug")),
        size: z.enum(["sm", "wide", "tall", "lg"]).parse(form.get("size") ?? "sm"),
        pinned: form.get("pinned") === "on",
        hidden: form.get("hidden") === "on",
        manual: form.get("manual") === "on",
        nda,
        ndaContext: empty(form.get("ndaContext")),
        ...(password ? { ndaPasswordHash: hashPassword(password) } : clearPassword ? { ndaPasswordHash: null } : {}),
        categories: { set: form.getAll("categories").map((c) => ({ id: String(c) })) },
      },
    });
  }, "Projet enregistré.");
}

export async function createManualProject(_: ActionState, form: FormData): Promise<ActionState> {
  return guard(async () => {
    const name = z.string().min(1).max(80).parse(String(form.get("name") ?? "").trim());
    const url = empty(form.get("url"));
    const base = slugify(name);
    let slug = base;
    for (let i = 2; await prisma.project.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
    const max = await prisma.project.aggregate({ _min: { position: true } });
    await prisma.project.create({
      data: { name, slug, url, manual: true, description: empty(form.get("description")), position: (max._min.position ?? 0) - 1 },
    });
  }, "Projet créé.");
}

export async function deleteProject(id: string): Promise<ActionState> {
  return guard(() => prisma.project.delete({ where: { id } }));
}

export async function syncNow(): Promise<ActionState> {
  await requireSession();
  try {
    const s = await runSync("admin", { capturesInBackground: true });
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: `${s.detected} détectés · ${s.created} nouveaux · ${s.updated} mis à jour${s.enriched ? ` · ${s.enriched} enrichis (IA)` : ""}${s.errors.length ? ` · ${s.errors.length} erreurs` : ""}${s.capturing ? " · captures en cours (Réglages pour le résultat)" : ""}`,
    };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

/** Force AI re-enrichment even when source data hash is unchanged. */
export async function reenrichNow(): Promise<ActionState> {
  await requireSession();
  try {
    const s = await runSync("admin", { capturesInBackground: true, forceEnrich: true });
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: `Ré-enrichissement : ${s.enriched} descriptions régénérées${s.errors.length ? ` · ${s.errors.length} erreurs` : ""}${s.capturing ? " · captures en cours" : ""}`,
    };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function recapture(id: string): Promise<ActionState> {
  await requireSession();
  try {
    const res = await captureProjects(await captureTargets({ ids: [id], force: true }), 60_000);
    revalidatePath("/", "layout");
    if (res.errors.length) return { error: res.errors.map((e) => e.error).join("\n") };
    return res.captured ? { ok: true, message: "Captures mises à jour." } : { error: "Aucune URL de prod à capturer." };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

// ─── Categories ─────────────────────────────────────────────────────────────

export async function saveCategory(_: ActionState, form: FormData): Promise<ActionState> {
  return guard(async () => {
    const id = empty(form.get("id"));
    const name = z.string().min(1).max(40).parse(String(form.get("name") ?? "").trim());
    const emoji = empty(form.get("emoji"));
    const slug = empty(form.get("slug")) ?? slugify(name);
    if (id) await prisma.category.update({ where: { id }, data: { name, emoji, slug } });
    else {
      const max = await prisma.category.aggregate({ _max: { position: true } });
      await prisma.category.create({ data: { name, emoji, slug, position: (max._max.position ?? 0) + 1 } });
    }
  }, "Catégorie enregistrée.");
}

export async function moveCategory(id: string, dir: -1 | 1): Promise<ActionState> {
  return guard(async () => {
    const cats = await prisma.category.findMany({ orderBy: { position: "asc" } });
    const i = cats.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= cats.length) return;
    [cats[i], cats[j]] = [cats[j], cats[i]];
    await prisma.$transaction(cats.map((c, position) => prisma.category.update({ where: { id: c.id }, data: { position } })));
  });
}

export async function deleteCategory(id: string): Promise<ActionState> {
  return guard(() => prisma.category.delete({ where: { id } }));
}

// ─── Now / Stories ────────────────────────────────────────────────────────────

const repoList = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/[\s,]+/)
    .map((r) => r.trim().replace(/^https:\/\/github\.com\//, "").replace(/\/$/, ""))
    .filter(Boolean);

export async function startThreadAction(_: ActionState, form: FormData): Promise<ActionState> {
  return guard(
    () =>
      startThread({
        title: String(form.get("title") ?? ""),
        brief: empty(form.get("brief")) ?? undefined,
        threadUrl: empty(form.get("threadUrl")) ?? undefined,
        repos: repoList(form.get("repos")),
        project: empty(form.get("project")) ?? undefined,
      }),
    "Nouveau thread lancé — l'ancien est archivé en story.",
  );
}

export async function importXThreadAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireSession();
  try {
    const t = await importXThread({ url: String(form.get("url") ?? "").trim() });
    revalidatePath("/", "layout");
    const { posts, added } = t.imported;
    return { ok: true, message: `« ${t.title} » est le thread actif : ${posts} posts lus sur X, ${added} nouveaux.` };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function updateThreadAction(_: ActionState, form: FormData): Promise<ActionState> {
  return guard(async () => {
    const id = String(form.get("id"));
    const projectSlug = empty(form.get("project"));
    const project = projectSlug ? await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } }) : null;
    const brief = empty(form.get("brief"));
    const cur = await prisma.thread.findUniqueOrThrow({ where: { id } });
    await prisma.thread.update({
      where: { id },
      data: {
        title: z.string().min(1).parse(String(form.get("title") ?? "").trim()),
        brief,
        briefAt: brief !== cur.brief ? (brief ? new Date() : null) : cur.briefAt,
        summary: empty(form.get("summary")),
        cover: empty(form.get("cover")),
        threadUrl: empty(form.get("threadUrl")),
        repos: repoList(form.get("repos")),
        projectId: project?.id ?? null,
      },
    });
  }, "Thread enregistré.");
}

export async function briefAction(_: ActionState, form: FormData): Promise<ActionState> {
  return guard(() => setBrief({ text: String(form.get("text") ?? ""), thread: empty(form.get("thread")) ?? undefined }), "Brief publié.");
}

export async function addPostAction(_: ActionState, form: FormData): Promise<ActionState> {
  return guard(
    () =>
      addPost({
        thread: String(form.get("thread")),
        title: empty(form.get("title")) ?? undefined,
        body: String(form.get("body") ?? ""),
        url: empty(form.get("url")) ?? undefined,
        images: String(form.get("images") ?? "")
          .split(/\s+/)
          .filter((s) => /^https?:\/\//.test(s)),
        date: empty(form.get("date")) ? new Date(String(form.get("date"))).toISOString() : undefined,
        milestone: form.get("milestone") === "on",
      }),
    "Post ajouté.",
  );
}

export async function deletePost(id: string): Promise<ActionState> {
  return guard(() => prisma.threadPost.delete({ where: { id } }));
}

export async function archiveThreadAction(_: ActionState, form: FormData): Promise<ActionState> {
  return guard(
    () => archiveThread({ thread: String(form.get("thread")), summary: empty(form.get("summary")) ?? undefined }),
    "Thread archivé : il est maintenant une story.",
  );
}

export async function reactivateThread(id: string): Promise<ActionState> {
  return guard(() =>
    prisma.$transaction([
      prisma.thread.updateMany({ where: { status: "active" }, data: { status: "archived", archivedAt: new Date() } }),
      prisma.thread.update({ where: { id }, data: { status: "active", archivedAt: null } }),
    ]),
  );
}

export async function deleteThread(id: string): Promise<ActionState> {
  return guard(() => prisma.thread.delete({ where: { id } }));
}

// ─── Settings ──────────────────────────────────────────────────────────────

export async function saveSettings(_: ActionState, form: FormData): Promise<ActionState> {
  return guard(async () => {
    const labels = form.getAll("linkLabel").map(String);
    const urls = form.getAll("linkUrl").map(String);
    const links = labels.map((label, i) => ({ label: label.trim(), url: urls[i]?.trim() ?? "" })).filter((l) => l.label && l.url);
    const parsed = profileSchema.safeParse({
      name: String(form.get("name") ?? "").trim(),
      headline: String(form.get("headline") ?? "").trim(),
      headlineTail: String(form.get("headlineTail") ?? "").trim(),
      headlineAccent: String(form.get("headlineAccent") ?? "").trim(),
      bio: String(form.get("bio") ?? "").trim(),
      location: String(form.get("location") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      avatar: String(form.get("avatar") ?? "").trim(),
      available: form.get("available") === "on",
      availability: String(form.get("availability") ?? "").trim(),
      links,
    });
    if (!parsed.success) throw new Error(z.prettifyError(parsed.error));
    await saveProfile(parsed.data);
    const view = form.get("defaultView");
    if (isView(view)) await saveDefaultView(view);
  }, "Réglages enregistrés.");
}
