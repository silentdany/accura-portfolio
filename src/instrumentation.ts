/**
 * Fail at process start if the auth secret is missing.
 * `next build` sets NEXT_PHASE=phase-production-build, which resolveAuthSecret allows.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { resolveAuthSecret } = await import("@/lib/env");
  resolveAuthSecret();
}
