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
  /** On Vercel, AI Gateway works with no key at all: the deployment's OIDC token authenticates it. */
  aiBaseUrl: () =>
    process.env.AI_GATEWAY_URL?.trim().replace(/\/+$/, "") || (process.env.VERCEL_OIDC_TOKEN ? "https://ai-gateway.vercel.sh/v1" : null),
  aiKey: () => process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim() || null,
  /** Free on AI Gateway while MiniMax serves it (promo through 22 Oct 2026). Override with AI_MODEL. */
  aiModel: () => process.env.AI_MODEL?.trim() || "minimax/minimax-m3.1-flash",
  apiToken: () => process.env.PORTFOLIO_API_TOKEN?.trim() || null,
  cronSecret: () => process.env.CRON_SECRET?.trim() || null,
  authSecret: () => process.env.BETTER_AUTH_SECRET ?? "dev-only-insecure-secret-change-me",
};
