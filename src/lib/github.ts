import { env } from "@/lib/env";

/** Thin GitHub REST client. Works without a token (60 req/h), much better with GITHUB_TOKEN. */

export type GhRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  pushed_at: string;
  updated_at: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  default_branch: string;
  owner: { login: string };
};

export type GhCommit = {
  sha: string;
  html_url: string;
  commit: { message: string; author: { name: string; date: string } | null };
};

type Opts = { revalidate?: number; accept?: string };

function headers(accept = "application/vnd.github+json"): HeadersInit {
  const token = env.githubToken();
  return {
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "accura-portfolio",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function gh(path: string, opts: Opts = {}): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    headers: headers(opts.accept),
    signal: AbortSignal.timeout(15000),
    ...(opts.revalidate !== undefined ? { next: { revalidate: opts.revalidate } } : { cache: "no-store" }),
  });
}

async function ghJson<T>(path: string, opts: Opts = {}): Promise<T | null> {
  const res = await gh(path, opts);
  if (res.status === 404 || res.status === 409) return null; // missing / empty repo
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}`);
  return (await res.json()) as T;
}

async function paginate<T>(path: string, max = 300): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; out.length < max; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const batch = await ghJson<T[]>(`${path}${sep}per_page=100&page=${page}`);
    if (!batch?.length) break;
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

/**
 * Repos owned by GITHUB_OWNER (user or org). With a token that belongs to the owner,
 * private repos are included too (they are only used to enrich Vercel-linked projects).
 */
export async function listOwnerRepos(): Promise<GhRepo[]> {
  const owner = env.githubOwner();
  const byId = new Map<number, GhRepo>();
  const org = await gh(`/orgs/${owner}`);
  const base = org.ok ? `/orgs/${owner}/repos?type=all` : `/users/${owner}/repos?type=owner`;
  for (const r of await paginate<GhRepo>(base)) byId.set(r.id, r);
  if (env.githubToken() && !org.ok) {
    try {
      for (const r of await paginate<GhRepo>(`/user/repos?affiliation=owner`)) {
        if (r.owner.login.toLowerCase() === owner.toLowerCase()) byId.set(r.id, r);
      }
    } catch {
      /* token without user scope: public list is enough */
    }
  }
  return [...byId.values()];
}

export function getRepo(fullName: string) {
  return ghJson<GhRepo>(`/repos/${fullName}`);
}

export async function getLanguages(fullName: string): Promise<string[]> {
  const langs = await ghJson<Record<string, number>>(`/repos/${fullName}/languages`);
  if (!langs) return [];
  return Object.entries(langs)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
    .slice(0, 6);
}

export async function getReadme(fullName: string): Promise<string | null> {
  const res = await gh(`/repos/${fullName}/readme`, { accept: "application/vnd.github.raw+json" });
  if (!res.ok) return null;
  return res.text();
}

const IMAGE_RE = /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i;
const BADGE_RE = /shields\.io|badge|badgen|travis-ci|codecov|github\.com\/.*\/workflows|\/actions\/workflows|vercel\.com\/button|deploy-button|\.svg(\?|$)/i;

/** Screenshot candidates from the README (markdown + <img>), minus badges. */
export function readmeImages(readme: string, repo: Pick<GhRepo, "full_name" | "default_branch" | "private">): string[] {
  const found: string[] = [];
  for (const m of readme.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) found.push(m[1]);
  for (const m of readme.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) found.push(m[1]);
  const out: string[] = [];
  for (const src of found) {
    if (BADGE_RE.test(src)) continue;
    let url: string | null = null;
    if (/^https?:\/\//.test(src)) {
      url = src.replace(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\//, "https://raw.githubusercontent.com/$1/");
    } else if (!repo.private) {
      url = `https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch}/${src.replace(/^\.?\//, "")}`;
    }
    const isGhAsset = url?.includes("github.com/user-attachments/") || url?.includes("githubusercontent.com/assets/");
    if (url && (IMAGE_RE.test(url) || isGhAsset) && !out.includes(url)) out.push(url);
  }
  return out.slice(0, 8);
}

/** Images in conventional screenshot folders (public repos only: raw URLs must be reachable). */
export async function folderScreenshots(repo: Pick<GhRepo, "full_name" | "default_branch" | "private">): Promise<string[]> {
  if (repo.private || !env.githubToken()) return [];
  const dirs = ["screenshots", ".github/screenshots", "docs/screenshots", "public/screenshots"];
  const out: string[] = [];
  for (const dir of dirs) {
    const items = await ghJson<{ name: string; path: string; type: string }[]>(`/repos/${repo.full_name}/contents/${dir}`).catch(() => null);
    if (!Array.isArray(items)) continue;
    for (const it of items) {
      if (it.type === "file" && IMAGE_RE.test(it.name)) {
        out.push(`https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch}/${it.path}`);
      }
    }
    if (out.length) break;
  }
  return out.slice(0, 8);
}

export async function getCommitsSince(fullName: string, since: Date, revalidate = 1800): Promise<GhCommit[]> {
  const res = await gh(`/repos/${fullName}/commits?since=${since.toISOString()}&per_page=50`, { revalidate });
  if (!res.ok) return [];
  return (await res.json()) as GhCommit[];
}

/** Public repos of the owner pushed after `since` (for the /now activity proof). */
export async function recentlyPushedRepos(since: Date, revalidate = 1800): Promise<string[]> {
  const owner = env.githubOwner();
  const org = await gh(`/orgs/${owner}`, { revalidate: 86400 });
  const path = org.ok ? `/orgs/${owner}/repos?type=public&sort=pushed&per_page=30` : `/users/${owner}/repos?type=owner&sort=pushed&per_page=30`;
  const res = await gh(path, { revalidate });
  if (!res.ok) return [];
  const repos = (await res.json()) as GhRepo[];
  return repos.filter((r) => !r.private && new Date(r.pushed_at) >= since).map((r) => r.full_name);
}
