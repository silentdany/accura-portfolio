import { headlineText } from "@/lib/profile-text";
import { listProjects } from "@/lib/portfolio";
import { getProfile } from "@/lib/settings";
import { getActiveThread } from "@/lib/portfolio";
import { siteUrl } from "@/lib/env";

export const revalidate = 3600;

/** llms.txt: a plain-text map of the portfolio for LLM crawlers, plus how to connect over MCP. */
export async function GET() {
  const base = siteUrl();
  const [profile, projects, thread] = await Promise.all([getProfile(), listProjects().catch(() => []), getActiveThread().catch(() => null)]);
  const lines = [
    `# ${profile.name} — Portfolio`,
    "",
    `> ${headlineText(profile)}`,
    "",
    profile.bio,
    "",
    "## Machine access",
    `- MCP (Streamable HTTP, JSON-RPC): ${base}/api/mcp`,
    `- REST: ${base}/api/v1 (index), ${base}/api/v1/projects, ${base}/api/v1/now`,
    "",
    ...(thread ? ["## Now", `- [${thread.title}](${base}/now): ${thread.brief ?? ""}`, ""] : []),
    "## Projects",
    ...projects.map((p) => `- [${p.name}](${p.link}): ${p.locked ? `${p.ndaContext} (NDA)` : (p.tagline ?? "")}${p.url && !p.locked ? ` — ${p.url}` : ""}`),
    "",
    "## Links",
    ...profile.links.map((l) => `- [${l.label}](${l.url})`),
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
