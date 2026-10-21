import { env } from "@/lib/env";

/** Vercel REST: projects with a READY production deployment. */

type VercelTarget = {
  alias?: string[];
  url?: string;
  readyState?: string;
  createdAt?: number;
};

export type VercelProject = {
  id: string;
  name: string;
  framework?: string | null;
  updatedAt?: number;
  createdAt?: number;
  link?: { type?: string; org?: string; repo?: string; repoOwnerId?: number };
  targets?: { production?: VercelTarget | null };
  alias?: { domain: string }[];
};

export type DeployedProject = {
  id: string;
  name: string;
  framework: string | null;
  url: string;
  repoFullName: string | null;
  deployedAt: Date | null;
};

function pickDomain(p: VercelProject): string | null {
  const aliases = [...(p.targets?.production?.alias ?? []), ...(p.alias ?? []).map((a) => a.domain)];
  const custom = aliases.find((a) => !a.endsWith(".vercel.app"));
  return custom ?? aliases[0] ?? p.targets?.production?.url ?? null;
}

export async function listDeployedProjects(): Promise<DeployedProject[]> {
  const token = env.vercelToken();
  if (!token) return [];
  const team = env.vercelTeamId();
  const seen = new Map<string, VercelProject>();
  let from: string | null = null;
  for (let i = 0; i < 20; i++) {
    const qs = new URLSearchParams({ limit: "100" });
    if (team) qs.set("teamId", team);
    if (from) qs.set("from", from);
    const res = await fetch(`https://api.vercel.com/v10/projects?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Vercel ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { projects: VercelProject[]; pagination?: { next?: number | string | null } };
    let added = 0;
    for (const p of data.projects) {
      if (!seen.has(p.id)) {
        seen.set(p.id, p);
        added++;
      }
    }
    const next = data.pagination?.next;
    if (!next || !added) break;
    from = String(next);
  }

  const out: DeployedProject[] = [];
  for (const p of seen.values()) {
    const prod = p.targets?.production;
    if (!prod || (prod.readyState && prod.readyState !== "READY")) continue;
    const domain = pickDomain(p);
    if (!domain) continue;
    out.push({
      id: p.id,
      name: p.name,
      framework: p.framework ?? null,
      url: `https://${domain}`,
      repoFullName: p.link?.type === "github" && p.link.org && p.link.repo ? `${p.link.org}/${p.link.repo}` : null,
      deployedAt: prod.createdAt ? new Date(prod.createdAt) : p.updatedAt ? new Date(p.updatedAt) : null,
    });
  }
  return out;
}
