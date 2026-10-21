/** Public base URL of the portfolio (no trailing slash). */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export const env = {
  githubOwner: () => process.env.GITHUB_OWNER?.trim() || "silentdany",
  githubToken: () => process.env.GITHUB_TOKEN?.trim() || null,
  vercelToken: () => process.env.VERCEL_TOKEN?.trim() || null,
  vercelTeamId: () => process.env.VERCEL_TEAM_ID?.trim() || null,
  watchUrl: () => process.env.WATCH_URL?.trim().replace(/\/+$/, "") || null,
  watchToken: () => process.env.WATCH_TOKEN?.trim() || null,
  aiBaseUrl: () => process.env.AI_GATEWAY_URL?.trim().replace(/\/+$/, "") || null,
  aiKey: () => process.env.AI_GATEWAY_API_KEY?.trim() || null,
  aiModel: () => process.env.AI_MODEL?.trim() || "anthropic/claude-haiku-5.5",
  apiToken: () => process.env.PORTFOLIO_API_TOKEN?.trim() || null,
  cronSecret: () => process.env.CRON_SECRET?.trim() || null,
  authSecret: () => process.env.BETTER_AUTH_SECRET ?? "dev-only-insecure-secret-change-me",
};
