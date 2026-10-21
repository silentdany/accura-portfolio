import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/env";

/**
 * Single-owner admin (same model as Accura Watch).
 * - OWNER_EMAIL set (comma-separated list allowed) → only those emails may sign up / sign in.
 * - OWNER_EMAIL unset → the first account created becomes the owner.
 * Sign-up closes once a user exists.
 * Phase 2: unified accura.dev portal — set AUTH_COOKIE_DOMAIN=.accura.dev to share the session.
 */
const OWNER_EMAILS = (process.env.OWNER_EMAIL ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error("BETTER_AUTH_SECRET is required in production");
}

function assertOwnerEmail(email: unknown): void {
  if (!OWNER_EMAILS.length) return;
  if (typeof email !== "string" || !OWNER_EMAILS.includes(email.trim().toLowerCase())) {
    throw new APIError("FORBIDDEN", { message: "Seul le compte propriétaire peut se connecter." });
  }
}

async function assertSignupOpen(): Promise<void> {
  if ((await prisma.user.count()) > 0) {
    throw new APIError("FORBIDDEN", { message: "Le compte propriétaire existe déjà. Connecte-toi." });
  }
}

const baseURL = siteUrl();
const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim() || null;

export const auth = betterAuth({
  baseURL,
  secret: secret ?? "dev-only-insecure-secret-change-me",
  trustedOrigins: [
    baseURL,
    "http://localhost:3000",
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  ...(cookieDomain ? { advanced: { crossSubDomainCookies: { enabled: true, domain: cookieDomain } } } : {}),
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          assertOwnerEmail(user.email);
          await assertSignupOpen();
          return { data: user };
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email" || ctx.path === "/sign-up/email") {
        assertOwnerEmail((ctx.body as { email?: string } | undefined)?.email);
      }
      if (ctx.path === "/sign-up/email") await assertSignupOpen();
    }),
  },
});
