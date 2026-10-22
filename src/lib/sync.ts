import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { shortHash } from "@/lib/crypto";
import { errorMessage } from "@/lib/http";
import { hostname, slugify } from "@/lib/slug";
import { listDeployedProjects, type DeployedProject } from "@/lib/vercel";
import { folderScreenshots, getLanguages, getReadme, getRepo, listOwnerRepos, readmeImages, type GhRepo } from "@/lib/github";
import { fetchHomepageMeta } from "@/lib/homepage";
import { refreshIcon } from "@/lib/icon";
import { aiEnabled, enrichProject } from "@/lib/ai";
import { captureProjects, capturesEnabled, captureTargets } from "@/lib/capture";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Weekly sync (Vercel Cron → /api/cron/sync, or "Synchroniser" in the admin):
 * Vercel projects with a READY production deployment, crossed with the GitHub repos of GITHUB_OWNER.
 * Repos with a homepage but no Vercel project are included too (SYNC_GITHUB_HOMEPAGES=false to disable).
 * Then live screenshots (desktop + mobile) are taken for projects whose capture is missing or older than 6 days
 * (SYNC_CAPTURES=false to disable). Admin curation (overrides, order, categories, NDA, hidden) is never touched.
 */

type Candidate = { deployed: DeployedProject | null; repo: GhRepo | null; url: string | null };

export type SyncStats = {
  detected: number;
  created: number;
  updated: number;
  skipped: number;
  enriched: number;
  captured: number;
  /** Projects whose capture did not fit in this run's time budget; the next sync takes them first. */
  deferred: number;
  errors: { project: string; error: string }[];
  sources: { vercel: boolean; github: boolean; ai: boolean };
};

function prettify(name: string): string {
  return name
    .replace(/[-_.]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function displayName(raw: string, title: string | null): string {
  const head = title?.split(/\s[—–|·:-]\s/)[0]?.trim();
  if (head && head.length >= 2 && head.length <= 28 && !/^(home|accueil|index)$/i.test(head)) return head;
  return prettify(raw);
}

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(size, queue.length) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await fn(item);
  }));
}

async function uniqueSlug(base: string, selfId?: string): Promise<string> {
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const hit = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === selfId) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function collectCandidates(stats: SyncStats): Promise<Candidate[]> {
  let deployed: DeployedProject[] = [];
  let repos: GhRepo[] = [];
  if (env.vercelToken()) {
    deployed = await listDeployedProjects();
    stats.sources.vercel = true;
  }
  try {
    repos = await listOwnerRepos();
    stats.sources.github = true;
  } catch (err) {
    stats.errors.push({ project: "github", error: errorMessage(err) });
  }
  const byFull = new Map(repos.map((r) => [r.full_name.toLowerCase(), r]));
  const used = new Set<string>();
  const out: Candidate[] = [];

  for (const d of deployed) {
    let repo = d.repoFullName ? byFull.get(d.repoFullName.toLowerCase()) ?? null : null;
    if (!repo && d.repoFullName) repo = await getRepo(d.repoFullName).catch(() => null);
    if (repo) used.add(repo.full_name.toLowerCase());
    out.push({ deployed: d, repo, url: d.url });
  }

  if (process.env.SYNC_GITHUB_HOMEPAGES !== "false") {
    const deployedHosts = new Set(deployed.map((d) => hostname(d.url)));
    for (const r of repos) {
      if (used.has(r.full_name.toLowerCase()) || r.fork || r.archived || r.private || !r.homepage) continue;
      const url = r.homepage.startsWith("http") ? r.homepage : `https://${r.homepage}`;
      if (deployedHosts.has(hostname(url))) continue;
      out.push({ deployed: null, repo: r, url });
    }
  }
  return out;
}

async function syncOne(c: Candidate, stats: SyncStats, nextPosition: () => number, skipAi: boolean) {
  const rawName = c.deployed?.name ?? c.repo?.name ?? "projet";
  const existing = await prisma.project.findFirst({
    where: {
      OR: [
        ...(c.deployed ? [{ vercelProjectId: c.deployed.id }] : []),
        ...(c.repo ? [{ repoFullName: c.repo.full_name }] : []),
      ],
    },
  });
  if (existing?.manual) {
    stats.skipped++;
    return;
  }

  const [home, languages, readme] = await Promise.all([
    c.url ? fetchHomepageMeta(c.url) : Promise.resolve(null),
    c.repo ? getLanguages(c.repo.full_name).catch(() => []) : Promise.resolve([] as string[]),
    c.repo ? getReadme(c.repo.full_name).catch(() => null) : Promise.resolve(null),
  ]);
  const shots = c.repo
    ? [...new Set([...(readme ? readmeImages(readme, c.repo) : []), ...(await folderScreenshots(c.repo).catch(() => []))])]
    : [];

  const description = c.repo?.description?.trim() || home?.description?.trim() || null;
  const topics = c.repo?.topics ?? [];
  const pushed = c.repo ? new Date(c.repo.pushed_at) : null;
  const deployedAt = c.deployed?.deployedAt ?? null;
  const lastUpdatedAt = [pushed, deployedAt].filter((d): d is Date => Boolean(d)).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const name = displayName(rawName, home?.title ?? null);

  const data = {
    name,
    description,
    url: c.url,
    repoFullName: c.repo?.full_name ?? null,
    repoUrl: c.repo?.html_url ?? null,
    repoPrivate: c.repo?.private ?? false,
    vercelProjectId: c.deployed?.id ?? null,
    language: c.repo?.language ?? languages[0] ?? null,
    languages,
    topics,
    stars: c.repo?.stargazers_count ?? 0,
    screenshots: shots,
    ogImage: home?.ogImage ?? null,
    lastUpdatedAt,
    syncedAt: new Date(),
  } satisfies Partial<Prisma.ProjectUncheckedCreateInput>;

  let ai: { aiTagline?: string; aiDescription?: string; aiInputHash?: string } = {};
  if (aiEnabled() && !skipAi) {
    const hash = shortHash(JSON.stringify([name, description, topics, languages, readme?.slice(0, 4000), home?.text?.slice(0, 1500)]));
    if (hash !== existing?.aiInputHash) {
      try {
        const res = await enrichProject({
          name,
          url: c.url,
          description,
          topics,
          languages,
          readme,
          homepageText: home?.text ?? null,
        });
        if (res) {
          ai = { aiTagline: res.tagline, aiDescription: res.description, aiInputHash: hash };
          stats.enriched++;
        }
      } catch (err) {
        stats.errors.push({ project: name, error: `AI: ${errorMessage(err)}` });
      }
    }
  }

  let projectId: string;
  if (existing) {
    await prisma.project.update({ where: { id: existing.id }, data: { ...data, ...ai } });
    projectId = existing.id;
    stats.updated++;
  } else {
    const slug = await uniqueSlug(slugify(c.deployed?.name ?? c.repo?.name ?? name));
    const created = await prisma.project.create({
      data: {
        ...data,
        ...ai,
        slug,
        position: nextPosition(),
        size: shots.length || home?.ogImage ? "wide" : "sm",
      },
    });
    projectId = created.id;
    stats.created++;
  }
  if (home?.icons.length) await refreshIcon(projectId, home.icons).catch(() => false);
}

/** Functions are killed at maxDuration (300 s). A killed sync records nothing, so it stops well before. */
const SYNC_BUDGET_MS = 250_000;
/** A run still open after this long was killed mid-way. */
const STALE_MS = 6 * 60_000;

export class SyncBusy extends Error {}

/**
 * One sync at a time. With `capturesInBackground`, it returns once the projects are synced (~15 s)
 * and the screenshots carry on after the response (`after()`), within the same deadline.
 * `forceEnrich` re-runs the AI description even when the source hash is unchanged.
 * The sequential AI pass for forceEnrich runs in the background via after() to avoid request timeouts.
 */
export async function runSync(
  trigger: "cron" | "admin" | "api",
  opts: { capturesInBackground?: boolean; forceEnrich?: boolean } = {},
): Promise<SyncStats & { id: string; capturing: boolean; enriching?: boolean }> {
  await prisma.syncRun.updateMany({
    where: { finishedAt: null, startedAt: { lt: new Date(Date.now() - STALE_MS) } },
    data: { finishedAt: new Date(), ok: false, error: "Interrompue : la fonction a dépassé son délai." },
  });
  if (await prisma.syncRun.findFirst({ where: { finishedAt: null }, select: { id: true } })) {
    throw new SyncBusy("Une synchronisation est déjà en cours. Elle se termine en moins de 5 minutes.");
  }
  const run = await prisma.syncRun.create({ data: { trigger } });
  const deadline = run.startedAt.getTime() + SYNC_BUDGET_MS;
  const stats: SyncStats = {
    detected: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    enriched: 0,
    captured: 0,
    deferred: 0,
    errors: [],
    sources: { vercel: false, github: false, ai: aiEnabled() },
  };
  const finish = (error?: string) =>
    prisma.syncRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        ok: !error && stats.errors.length === 0,
        error: error ?? null,
        stats: stats as unknown as Prisma.InputJsonValue,
      },
    });
  const captures = async () => {
    try {
      const shots = await captureProjects(await captureTargets(), deadline - Date.now());
      stats.captured = shots.captured;
      stats.deferred = shots.deferred;
      stats.errors.push(...shots.errors);
      await finish();
    } catch (err) {
      await finish(errorMessage(err));
    }
  };

  const force = Boolean(opts.forceEnrich);
  const enrichInBackground = async () => {
    if (!force || !aiEnabled()) return;
    try {
      const projects = await prisma.project.findMany({
        where: { manual: false },
        orderBy: { position: "asc" },
        select: { id: true, name: true, description: true, topics: true, languages: true, url: true },
      });
      for (const p of projects) {
        try {
          const res = await enrichProject({
            name: p.name,
            url: p.url,
            description: p.description,
            topics: p.topics,
            languages: p.languages,
            readme: null,
            homepageText: null,
          });
          if (res) {
            await prisma.project.update({
              where: { id: p.id },
              data: {
                aiTagline: res.tagline,
                aiDescription: res.description,
                aiInputHash: shortHash(JSON.stringify([p.name, p.description, p.topics, p.languages])),
              },
            });
            stats.enriched++;
          }
        } catch (err) {
          stats.errors.push({ project: p.name, error: `AI force: ${errorMessage(err)}` });
        }
        await sleep(12_000);
      }
      await finish();
    } catch (err) {
      await finish(errorMessage(err));
    }
  };

  try {
    const candidates = await collectCandidates(stats);
    stats.detected = candidates.length;
    const max = await prisma.project.aggregate({ _max: { position: true } });
    let position = (max._max.position ?? 0) + 1;
    await pool(candidates, 4, async (c) => {
      try {
        await syncOne(c, stats, () => position++, force);
      } catch (err) {
        stats.errors.push({ project: c.deployed?.name ?? c.repo?.full_name ?? "?", error: errorMessage(err) });
      }
    });
  } catch (err) {
    await finish(errorMessage(err));
    throw err;
  }

  const capturing = capturesEnabled() && Boolean(opts.capturesInBackground);
  const enriching = force && aiEnabled();

  if (enriching) after(enrichInBackground);
  if (!capturesEnabled() && !enriching) await finish();
  else if (capturing) after(captures);
  else if (!enriching) await captures();

  return { ...stats, id: run.id, capturing, enriching };
}
