import { env } from "@/lib/env";
import { hostname } from "@/lib/slug";

/**
 * Thin client for Accura Watch (REST mirror of its MCP tools: POST /api/v1/tools/<name>).
 * One cached get_overview call powers every card; nothing is tracked by the portfolio itself.
 */

type Series = { dates: string[]; values: (number | null)[] };

type WatchSite = {
  slug: string;
  name: string;
  domain: string;
  url: string;
  health: { status: string; uptime: number | null; latencyMs: number | null } | null;
  gsc: { clicks: number; clicksPrev: number; impressions: number; position: number | null } | null;
  posthog: { visitors: number; visitorsPrev: number; pageviews: number; visitorsSeries?: Series } | null;
  sentry: { unresolved: number; events: number } | null;
};

type Overview = { generatedAt: string; range: number; sites: WatchSite[] };

export type WatchStats = {
  slug: string;
  domain: string;
  range: number;
  status: "up" | "down" | "unknown";
  uptime: number | null;
  latencyMs: number | null;
  visitors: number | null;
  visitorsPrev: number | null;
  pageviews: number | null;
  clicks: number | null;
  clicksPrev: number | null;
  impressions: number | null;
  errors: number | null;
  unresolved: number | null;
  series: number[] | null;
  generatedAt: string;
};

export function watchEnabled(): boolean {
  return Boolean(env.watchUrl() && env.watchToken());
}

async function callWatch<T>(tool: string, args: Record<string, unknown>, revalidate = 900): Promise<T | null> {
  const base = env.watchUrl();
  const token = env.watchToken();
  if (!base || !token) return null;
  try {
    const res = await fetch(`${base}/api/v1/tools/${tool}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      next: { revalidate, tags: ["watch"] },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean; result?: T };
    return data.ok ? (data.result ?? null) : null;
  } catch {
    return null;
  }
}

function toStats(s: WatchSite, o: Overview): WatchStats {
  const status = s.health?.status === "up" ? "up" : s.health?.status === "down" ? "down" : "unknown";
  return {
    slug: s.slug,
    domain: s.domain,
    range: o.range,
    status,
    uptime: s.health?.uptime ?? null,
    latencyMs: s.health?.latencyMs ?? null,
    visitors: s.posthog?.visitors ?? null,
    visitorsPrev: s.posthog?.visitorsPrev ?? null,
    pageviews: s.posthog?.pageviews ?? null,
    clicks: s.gsc?.clicks ?? null,
    clicksPrev: s.gsc?.clicksPrev ?? null,
    impressions: s.gsc?.impressions ?? null,
    errors: s.sentry?.events ?? null,
    unresolved: s.sentry?.unresolved ?? null,
    series: s.posthog?.visitorsSeries?.values.map((v) => v ?? 0) ?? null,
    generatedAt: o.generatedAt,
  };
}

/** Watch stats indexed by Watch slug and by domain. Empty map when Watch is not configured or down. */
export async function getWatchIndex(range: 7 | 28 | 90 = 28) {
  const o = await callWatch<Overview>("get_overview", { range, include_series: true });
  const bySlug = new Map<string, WatchStats>();
  const byDomain = new Map<string, WatchStats>();
  for (const s of o?.sites ?? []) {
    const stats = toStats(s, o!);
    bySlug.set(s.slug, stats);
    const host = hostname(s.domain);
    if (host) byDomain.set(host, stats);
  }
  return {
    sites: [...bySlug.values()],
    /** Explicit mapping first (admin "slug Watch"), then the project's production domain. */
    resolve(project: { watchSlug: string | null; url: string | null }): WatchStats | null {
      if (project.watchSlug) return bySlug.get(project.watchSlug) ?? null;
      const host = hostname(project.url);
      return host ? (byDomain.get(host) ?? null) : null;
    },
  };
}

export type WatchIndex = Awaited<ReturnType<typeof getWatchIndex>>;
